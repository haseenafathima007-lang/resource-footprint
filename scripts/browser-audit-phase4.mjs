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
          // Skip skip-to-content which is intentionally 1x1 until focused
          if (el.innerText?.includes('Skip to') || el.classList.contains('sr-only')) continue;
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
          let parent = el.parentElement;
          while ((bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') && parent) {
            bg = window.getComputedStyle(parent).backgroundColor;
            parent = parent.parentElement;
          }
          if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
            bg = document.documentElement.classList.contains('dark') ? 'rgb(18, 24, 38)' : 'rgb(249, 248, 244)';
          }

          contrastSamples.push({
            tag: el.tagName,
            text: text.slice(0, 25),
            color,
            bg,
          });
          if (contrastSamples.length >= 35) break;
        }

        return {
          scrollWidth,
          innerWidth,
          hasHorizontalScroll,
          smallTargets,
          contrastSamples,
        };
      })()
    `);

    let contrastFailures = 0;
    const computedContrasts = measurements.contrastSamples.map((sample) => {
      const ratio = calculateContrast(sample.color, sample.bg, isDark);
      const passes = ratio ? ratio >= 4.5 : true;
      if (!passes) contrastFailures++;
      return { ...sample, ratio: ratio ? Math.round(ratio * 10) / 10 : null, passes };
    });

    return {
      pageName,
      width,
      colorScheme,
      scrollWidth: measurements.scrollWidth,
      innerWidth: measurements.innerWidth,
      hasHorizontalScroll: measurements.hasHorizontalScroll,
      smallTargetsCount: measurements.smallTargets.length,
      smallTargets: measurements.smallTargets,
      contrastFailures,
      computedContrasts,
    };
  }

  const allAuditResults = [];

  // 1. Landing Page
  console.log('--- Auditing Landing Page ---');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await new Promise((r) => setTimeout(r, 1500));

  for (const width of [1280, 375]) {
    for (const theme of ['light', 'dark']) {
      await setViewport(width, width === 375 ? 812 : 900, width === 375, theme);
      const res = await auditPage('LandingPage', width, theme);
      allAuditResults.push(res);
      await takeScreenshot(`phase4_landing_${width}_${theme}.png`);
    }
  }

  // 2. Guest-to-Account Handoff Flow
  console.log('--- Executing Guest-to-Account Handoff Flow ---');
  await evaluate(`
    localStorage.clear();
    sessionStorage.clear();
  `);

  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
  await new Promise((r) => setTimeout(r, 1200));
  await setViewport(1280, 900, false, 'light');

  // Set shower minutes to 18 using native setter
  console.log('Setting guest simulator shower duration to 18 min...');
  await evaluate(`
    (() => {
      const input = document.getElementById('baseline-showerMinutes');
      if (input) {
        const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setVal.call(input, '18');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `);
  await new Promise((r) => setTimeout(r, 600));

  // Click "Save this as my baseline"
  console.log('Clicking "Save this as my baseline"...');
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.innerText && b.innerText.includes('Save this as my baseline'));
      if (btn) btn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 1200));

  const authUrl = await evaluate('window.location.href');
  console.log('Navigated to auth URL:', authUrl);

  const pendingStored = await evaluate('localStorage.getItem("rf.pendingBaseline")');
  console.log('Pending baseline in storage:', pendingStored ? 'Present' : 'Missing');

  const testEmail = `phase4_verified_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  console.log('Authenticating user:', testEmail);

  // Switch to sign up mode
  await evaluate(`
    (() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const signUpBtn = buttons.find(b => b.innerText && b.innerText.includes('Sign Up'));
      if (signUpBtn) signUpBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  // Fill email, password, and displayName with React setter
  await evaluate(`
    (() => {
      const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

      const emailInput = document.getElementById('email');
      if (emailInput) {
        setVal.call(emailInput, '${testEmail}');
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const passInput = document.getElementById('password');
      if (passInput) {
        setVal.call(passInput, '${testPassword}');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const nameInput = document.getElementById('displayName');
      if (nameInput) {
        setVal.call(nameInput, 'Phase 4 Auditor');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  console.log('Submitting sign up form...');
  await evaluate(`
    (() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    })()
  `);
  await new Promise((r) => setTimeout(r, 2500));

  let currentUrl = await evaluate('window.location.href');
  console.log('URL after auth submit:', currentUrl);

  // 3. Onboarding Wizard Pages
  console.log('--- Auditing Onboarding Wizard Pages ---');
  const step1Val = await evaluate(`
    (() => {
      const input = document.getElementById('onboarding-showerMinutesPerDay');
      return input ? input.value : null;
    })()
  `);
  console.log('Onboarding Step 1 prefilled shower minutes:', step1Val);

  // Audit Step 1
  for (const width of [1280, 375]) {
    for (const theme of ['light', 'dark']) {
      await setViewport(width, width === 375 ? 812 : 900, width === 375, theme);
      const res = await auditPage('OnboardingStep1', width, theme);
      allAuditResults.push(res);
      await takeScreenshot(`phase4_onboarding_step1_${width}_${theme}.png`);
    }
  }

  // Next to Step 2
  await setViewport(1280, 900, false, 'light');
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await new Promise((r) => setTimeout(r, 600));

  // Audit Step 2
  for (const width of [1280, 375]) {
    for (const theme of ['light', 'dark']) {
      await setViewport(width, width === 375 ? 812 : 900, width === 375, theme);
      const res = await auditPage('OnboardingStep2', width, theme);
      allAuditResults.push(res);
      await takeScreenshot(`phase4_onboarding_step2_${width}_${theme}.png`);
    }
  }

  // Next to Step 3
  await setViewport(1280, 900, false, 'light');
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await new Promise((r) => setTimeout(r, 600));

  // Audit Step 3
  for (const width of [1280, 375]) {
    for (const theme of ['light', 'dark']) {
      await setViewport(width, width === 375 ? 812 : 900, width === 375, theme);
      const res = await auditPage('OnboardingStep3', width, theme);
      allAuditResults.push(res);
      await takeScreenshot(`phase4_onboarding_step3_${width}_${theme}.png`);
    }
  }

  // Next to Step 4 (Review)
  await setViewport(1280, 900, false, 'light');
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await new Promise((r) => setTimeout(r, 600));

  // Audit Step 4 (Review & Save)
  for (const width of [1280, 375]) {
    for (const theme of ['light', 'dark']) {
      await setViewport(width, width === 375 ? 812 : 900, width === 375, theme);
      const res = await auditPage('OnboardingStep4_Review', width, theme);
      allAuditResults.push(res);
      await takeScreenshot(`phase4_onboarding_step4_${width}_${theme}.png`);
    }
  }

  // Click Save Baseline on Step 4
  console.log('Submitting Step 4 to save baseline in database...');
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await new Promise((r) => setTimeout(r, 2500));

  currentUrl = await evaluate('window.location.href');
  console.log('URL after saving baseline:', currentUrl);

  const pendingAfterSave = await evaluate('localStorage.getItem("rf.pendingBaseline")');
  console.log('Pending baseline cleared after save:', pendingAfterSave === null);

  // 4. Personal Dashboard Audit
  console.log('--- Auditing Personal Dashboard ---');
  for (const width of [1280, 375]) {
    for (const theme of ['light', 'dark']) {
      await setViewport(width, width === 375 ? 812 : 900, width === 375, theme);
      const res = await auditPage('Dashboard', width, theme);
      allAuditResults.push(res);
      await takeScreenshot(`phase4_dashboard_${width}_${theme}.png`);
    }
  }

  // 5. Second Baseline Update (History row 2)
  console.log('--- Creating Second Baseline Update for History Row ---');
  await setViewport(1280, 900, false, 'light');
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/onboarding' });
  await new Promise((r) => setTimeout(r, 1200));

  // Edit shower to 8
  await evaluate(`
    (() => {
      const input = document.getElementById('onboarding-showerMinutesPerDay');
      if (input) {
        const setVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setVal.call(input, '8');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()
  `);
  await new Promise((r) => setTimeout(r, 500));

  // Next through steps
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await new Promise((r) => setTimeout(r, 500));
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await new Promise((r) => setTimeout(r, 500));
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await new Promise((r) => setTimeout(r, 500));

  // Save second baseline
  await evaluate(`document.querySelector('button[type="submit"]').click()`);
  await new Promise((r) => setTimeout(r, 2500));

  const secondSaveUrl = await evaluate('window.location.href');
  console.log('URL after 2nd save:', secondSaveUrl);

  await takeScreenshot(`phase4_dashboard_updated_history.png`);

  const outputPath = path.join(ARTIFACTS_DIR, 'phase4_browser_audit_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(allAuditResults, null, 2));
  console.log(`\nAudit completed successfully! Saved results to: ${outputPath}`);

  ws.close();
}

main().catch((err) => {
  console.error('Audit script error:', err);
  process.exit(1);
});
