import { useState, useEffect, useMemo } from "react";
import { useCourseState, buildSections, resetProgress } from "./store/courseStore";

export default function FinishScreen() {
  const courseState = useCourseState();
  const sections = useMemo(() => buildSections(courseState), [courseState]);
  
  const totalLevels = sections.reduce((sum, s) => sum + s.total, 0);
  const doneLevels = sections.reduce((sum, s) => sum + s.completed, 0);
  
  // Show if 100% done, but allow user to dismiss it
  const isFinished = totalLevels > 0 && doneLevels === totalLevels;
  const [dismissed, setDismissed] = useState(false);

  // If progress is reset, bring back the ability to show it once completed again
  useEffect(() => {
    if (!isFinished) {
      setDismissed(false);
    }
  }, [isFinished]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (isFinished && !dismissed) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "Enter") {
          setDismissed(true);
        } else if (e.key.toLowerCase() === "r") {
          if (window.confirm("Are you sure you want to reset all your progress?")) {
            resetProgress();
          }
        }
      }
    }
    
    if (isFinished && !dismissed) {
      window.addEventListener("keydown", handleKeyDown, true);
    }
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isFinished, dismissed]);

  if (!isFinished || dismissed) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-bg-primary/70 backdrop-blur-[2px]" />

      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-[600px] border border-border rounded-xl bg-bg-surface shadow-2xl overflow-hidden">
          {/* Top chrome bar */}
          <div className="h-11 bg-bg-inset border-b border-border flex items-center px-5 shrink-0">
            <div className="flex gap-2">
              <span className="w-3 h-3 rounded-full bg-border" />
              <span className="w-3 h-3 rounded-full bg-border" />
              <span className="w-3 h-3 rounded-full bg-border" />
            </div>
            <div className="flex-1 flex items-center justify-center gap-2">
              <span className="font-mono text-[13px] text-text-muted">process_completed</span>
            </div>
            <div className="w-[52px]" />
          </div>

          <div className="px-10 py-10 flex flex-col items-center">
            {/* Trophy / ASCII art */}
            <pre className="text-accent-success text-[15px] leading-[1.3] select-none font-mono text-center tracking-tight mb-6">{`    ___________
   '._==_==_=_.'
   .-\\:      /-.
  | (|:.     |) |
   '-|:.     |-'
     \\::.    /
      '::. .'
        ) (
      _.' '._
     \`"""""""\`
`}</pre>

            <h2 className="text-text-primary font-mono text-[24px] font-semibold mb-4">
              Level 99 Hacker Unlocked
            </h2>
            
            <p className="text-text-muted font-sans text-center text-[15px] leading-relaxed mb-6">
              You've successfully completed all the lessons. You now possess the power to accidentally delete your entire root directory. <br/><br/>
              Use it wisely.
            </p>

            <div className="flex flex-col items-center gap-4 w-full">
              <div className="flex items-center gap-3 border border-accent-success rounded-lg px-8 py-3 font-mono text-[14px] text-text-primary">
                <span className="text-accent-success text-[16px]">›</span>
                <span>Press <span className="text-accent-success font-semibold">Enter</span> to return to terminal</span>
              </div>
              <div className="text-text-muted text-[13px] font-sans">
                (or press <span className="font-mono text-text-primary">R</span> to reset)
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
