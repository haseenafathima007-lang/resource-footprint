import React, { useState } from "react";
import { Share2, Check, Copy } from "lucide-react";

interface SummaryCardProps {
  summarySentence: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ summarySentence }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(summarySentence);
      } else {
        // Fallback for non-secure contexts or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = summarySentence;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore clipboard write failures gracefully
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface-raised border border-border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
          <Share2 className="w-4 h-4" aria-hidden="true" />
        </div>
        <p className="text-sm text-ink font-medium leading-relaxed">
          {summarySentence}
        </p>
      </div>

      <div className="relative shrink-0 self-end sm:self-center">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy summary to clipboard"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] text-xs font-semibold rounded-lg bg-surface-subtle hover:bg-surface border border-border text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-positive" aria-hidden="true" />
              <span className="text-positive">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-ink-muted" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>

        {/* Aria live announcement for screen readers */}
        <span role="status" aria-live="polite" className="sr-only">
          {copied ? "Summary copied to clipboard" : ""}
        </span>
      </div>
    </div>
  );
};
