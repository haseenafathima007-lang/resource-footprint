import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/haseena/.gemini/antigravity-ide/brain/4fea5bac-13e3-43c4-983b-1e0532250508';

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function parseRgba(colorStr) {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseInt(match[1], 10),
    g: parseInt(match[2], 10),
    b: parseInt(match[3], 10),
    a: match[4] !== undefined ? parseFloat(match[4]) : 1.0,
  };
}

function blendRgb(fg, bg) {
  if (fg.a >= 1) return [fg.r, fg.g, fg.b];
  const r = Math.round(fg.a * fg.r + (1 - fg.a) * bg.r);
  const g = Math.round(fg.a * fg.g + (1 - fg.a) * bg.g);
  const b = Math.round(fg.a * fg.b + (1 - fg.a) * bg.b);
  return [r, g, b];
}

function calculateContrast(fgStr, bgStr, isDark) {
  const baseSurface = isDark ? { r: 18, g: 24, b: 38, a: 1 } : { r: 249, g: 248, b: 244, a: 1 };
  const fg = parseRgba(fgStr);
  const bg = parseRgba(bgStr);
  if (!fg || !bg) return null;

  const effectiveBg = blendRgb(bg, baseSurface);
  const effectiveFg = blendRgb(fg, { r: effectiveBg[0], g: effectiveBg[1], b: effectiveBg[2], a: 1 });

  const l1 = getLuminance(...effectiveFg);
  const l2 = getLuminance(...effectiveBg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function main() {
  console.log('Connecting to Chrome CDP...');
  const tabs = await (await fetch('http://127.0.0.1:9222/json')).json();
  const targetTab = tabs.find((t) => t.type === 'page') || tabs[0];
  const ws = new WebSocket(targetTab.webSocketDebuggerUrl);

  await new Promise((resolve) => (ws.onopen = resolve));

  let reqId = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  }

  async function setViewport(width, height, isMobile, colorScheme) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: isMobile,
    });
    await send('Emulation.setEmulatedMedia', {
      media: 'screen',
      features: [{ name: 'prefers-color-scheme', value: colorScheme }],
    });
    await evaluate(`
      if ('${colorScheme}' === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    `);
    await new Promise((r) => setTimeout(r, 400));
  }

  async function takeScreenshot(filename) {
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    const fullPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(fullPath, Buffer.from(shot.data, 'base64'));
    console.log(`Saved screenshot: ${filename} (${fs.statSync(fullPath).size} bytes)`);
  }

  async function auditPage(pageName, width, colorScheme) {
    const isDark = colorScheme === 'dark';
    const measurements = await evaluate(`
      (() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const hasHorizontalScroll = scrollWidth > innerWidth;

        // Measure interactive elements
        const interactiveElements = Array.from(document.querySelectorAll('button, a, input, [role="button"], [role="radio"]'));
        const smallTargets = [];
        for (const el of interactiveElements) {
          if (el.offsetParent === null && el.offsetWidth === 0) continue; // hidden
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (el.innerText?.includes('Skip to') || el.classList.contains('sr-only')) continue;
          // Ignore inline navigation links inside paragraphs
          if (el.tagName === 'A' && el.closest('p')) continue;
          if (rect.width < 43.5 || rect.height < 43.5) {
            smallTargets.push({
              tag: el.tagName,
              id: el.id,
              text: el.innerText?.slice(0, 30) || el.getAttribute('aria-label') || '',
              width: Math.round(rect.width * 10) / 10,
              height: Math.round(rect.height * 10) / 10,
            });
          }
        }

        // Measure computed contrast of prominent text elements
        const textElements = Array.from(document.querySelectorAll('h1, h2, h3, p, span, button, a, label, th, td'));
        const contrastSamples = [];
        for (const el of textElements) {
          if (el.children.length > 0 && el.innerText.trim().length > 50) continue;
          const text = el.innerText?.trim();
          if (!text || text.length === 0) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const style = window.getComputedStyle(el);
          const color = style.color;
          let bg = style.backgroundColor;

          // Look up DOM for non-transparent background
          let curr = el.parentElement;
          while (curr && (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent')) {
            bg = window.getComputedStyle(curr).backgroundColor;
            curr = curr.parentElement;
          }

          contrastSamples.push({
            tag: el.tagName,
            text: text.slice(0, 25),
            color,
            bg,
          });
        }

        return {
          scrollWidth,
          innerWidth,
          hasHorizontalScroll,
          smallTargets,
          contrastSamples: contrastSamples.slice(0, 20),
        };
      })()
    `);

    // Calculate contrast ratios
    const lowContrastItems = [];
    for (const item of measurements.contrastSamples) {
      const ratio = calculateContrast(item.color, item.bg, isDark);
      if (ratio !== null && ratio < 4.5) {
        lowContrastItems.push({
          ...item,
          ratio: Math.round(ratio * 100) / 100,
        });
      }
    }

    return {
      page: pageName,
      width,
      colorScheme,
      hasHorizontalScroll: measurements.hasHorizontalScroll,
      scrollWidth: measurements.scrollWidth,
      innerWidth: measurements.innerWidth,
      smallTargetsCount: measurements.smallTargets.length,
      smallTargets: measurements.smallTargets,
      lowContrastCount: lowContrastItems.length,
      lowContrastItems,
    };
  }

  // Ensure Supabase demo auth exists in localStorage for /dashboard and /log
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await new Promise((r) => setTimeout(r, 800));

  console.log('Setting up mock guest profile in localStorage...');
  await evaluate(`
    (() => {
      const guestBaseline = {
        id: "phase5-test-baseline",
        userId: "guest-user",
        effectiveFrom: "2026-01-01",
        householdSize: 1,
        showerMinutesPerDay: 10,
        showerHeater: "electric",
        acHoursPerDay: 4,
        fanHoursPerDay: 6,
        laptopHoursPerDay: 6,
        laundryLoadsPerWeek: 4,
        laundryMachine: "topLoad",
        factorsVersion: "1.0.0"
      };
      localStorage.setItem('resource_footprint_guest_baseline', JSON.stringify(guestBaseline));
    })()
  `);

  const auditResults = [];

  const scenarios = [
    { page: 'Methodology', path: '/methodology', height: 900 },
    { page: 'Dashboard', path: '/dashboard', height: 900 },
    { page: 'LogChange', path: '/log', height: 900 },
  ];

  for (const s of scenarios) {
    for (const width of [1280, 375]) {
      for (const scheme of ['light', 'dark']) {
        const isMobile = width === 375;
        console.log(`\nAuditing ${s.page} [${width}px, ${scheme}]...`);
        await send('Page.navigate', { url: `http://127.0.0.1:5173${s.path}` });
        await setViewport(width, s.height, isMobile, scheme);
        await new Promise((r) => setTimeout(r, 600));

        const screenshotName = `phase5_${s.page.toLowerCase()}_${width}_${scheme}.png`;
        await takeScreenshot(screenshotName);

        const result = await auditPage(s.page, width, scheme);
        auditResults.push(result);
        console.log(`  Horizontal Scroll: ${result.hasHorizontalScroll ? 'FAIL (' + result.scrollWidth + ' > ' + result.innerWidth + ')' : 'PASS'}`);
        console.log(`  Small Touch Targets (<44px): ${result.smallTargetsCount}`);
        console.log(`  Low Contrast Items (<4.5:1): ${result.lowContrastCount}`);
      }
    }
  }

  const resultsPath = path.join(ARTIFACTS_DIR, 'phase5_browser_audit_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(auditResults, null, 2));
  console.log(`\nWrote complete audit results to ${resultsPath}`);

  ws.close();
}

main().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
