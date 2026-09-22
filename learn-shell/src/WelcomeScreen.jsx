import { useState, useEffect } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────

function TerminalIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="33" height="33" rx="5.5" stroke="#e8a33d" strokeWidth="1.5" />
      <path d="M10 13l5 4-5 4" stroke="#e8a33d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 21h6" stroke="#e8a33d" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 7h11c1.5 0 3 .8 4 2 1-1.2 2.5-2 4-2h9v20H25c-1.5 0-3 .8-4 2-1-1.2-2.5-2-4-2H6V7z"
        stroke="#e8a33d" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M17 9v18M17 9c-1-1.2-2.5-2-4-2H6" stroke="#e8a33d" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="7.5" width="33" height="21" rx="3.5" stroke="#e8a33d" strokeWidth="1.5" />
      <rect x="5" y="12" width="4" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="11" y="12" width="4" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="17" y="12" width="4" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="23" y="12" width="4" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="29" y="12" width="2" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="5" y="18" width="2" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="9" y="18" width="4" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="15" y="18" width="4" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="21" y="18" width="4" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="27" y="18" width="4" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
      <rect x="9" y="24" width="18" height="3" rx="1" stroke="#e8a33d" strokeWidth="1.2" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" stroke="#8a8f98" strokeWidth="1.2" />
      <path d="M8 7v4" stroke="#8a8f98" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.8" fill="#8a8f98" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function handleKeyDown(e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Enter") {
        setVisible(false);
      }
    }
    if (visible) {
      window.addEventListener("keydown", handleKeyDown, true);
    }
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-bg-primary/70 backdrop-blur-[2px]" />

      {/* Card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-[740px] border border-border rounded-xl bg-bg-surface shadow-2xl overflow-hidden">

          {/* Top chrome bar */}
          <div className="h-11 bg-bg-inset border-b border-border flex items-center px-5 shrink-0">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-border" />
              <span className="w-3 h-3 rounded-full bg-border" />
              <span className="w-3 h-3 rounded-full bg-border" />
            </div>
            <div className="flex-1 flex items-center justify-center gap-2">
              <img src="/logo.png" alt="LearnShell" className="h-6 w-6 object-contain" />
              <span className="font-mono text-[13px] text-text-muted">learn-shell</span>
            </div>
            {/* spacer to balance the dots */}
            <div className="w-[52px]" />
          </div>

          {/* Tagline row */}
          <div className="flex items-start justify-between px-7 pt-5 font-mono text-[13px] text-text-muted">
            <div className="leading-[1.8]">
              <div><span className="text-accent-amber">~/</span>  Learn by doing.</div>
              <div><span className="text-accent-amber">~/</span>  One command at a time.</div>
            </div>
            <span className="text-text-muted">v1.0.0</span>
          </div>

          {/* ASCII logo */}
          <div className="px-7 pt-6 pb-0 flex justify-center overflow-hidden mb-10">
            <pre className="text-accent-amber text-[13.5px] leading-[1.4] select-none font-mono text-center">{`    __                          _____ __         ____
   / /   ___  ____ __________  / ___// /_  ___  / / /
  / /   / _ \\/ __ \`/ ___/ __ \\ \\__ \\/ __ \\/ _ \\/ / / 
 / /___/  __/ /_/ / /  / / / /___/ / / / /  __/ / /  
/_____/\\___/\\__,_/_/  /_/ /_//____/_/ /_/\\___/_/_/   `}</pre>
          </div>

          {/* Three feature columns */}
          <div className="grid grid-cols-3 border-t border-border">
            <div className="flex flex-col items-center text-center px-8 py-8 border-r border-border">
              <TerminalIcon />
              <p className="mt-4 text-text-primary font-mono text-[14px] font-medium leading-snug">
                Interactive<br />Terminal
              </p>
              <p className="mt-3 text-text-muted font-mono text-[12px] leading-relaxed">
                Practice real Bash<br />commands in your browser.
              </p>
            </div>

            <div className="flex flex-col items-center text-center px-8 py-8 border-r border-border">
              <BookIcon />
              <p className="mt-4 text-text-primary font-mono text-[14px] font-medium leading-snug">
                Structured<br />Learning
              </p>
              <p className="mt-3 text-text-muted font-mono text-[12px] leading-relaxed">
                Step-by-step lessons<br />and hands-on challenges.
              </p>
            </div>

            <div className="flex flex-col items-center text-center px-8 py-8">
              <KeyboardIcon />
              <p className="mt-4 text-text-primary font-mono text-[14px] font-medium leading-snug">
                Keyboard Only
              </p>
              <p className="mt-3 text-text-muted font-mono text-[12px] leading-relaxed">
                Use your keyboard to<br />move through lessons<br />and the terminal.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Enter button */}
          <div className="flex justify-center py-6">
            <div className="flex items-center gap-3 border border-accent-amber rounded-lg px-12 py-3.5 font-mono text-[15px] text-text-muted">
              <span className="text-accent-amber text-[18px]">›</span>
              <span>Press <span className="text-accent-amber font-semibold">Enter</span> to begin</span>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-border flex items-center justify-between px-7 py-3.5 font-mono text-[12px] text-text-muted">
            <div className="flex items-center gap-2">
              <InfoIcon />
              <span>
                Tip: Press{" "}
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-bg-inset text-text-primary text-[11px] font-mono">
                  Esc
                </kbd>{" "}
                anytime to open the sidebar.
              </span>
            </div>
            <span>Happy Learning!<span className="text-accent-amber animate-blink">_</span></span>
          </div>

        </div>
      </div>
    </>
  );
}
