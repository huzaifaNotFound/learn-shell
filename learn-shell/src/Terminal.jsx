import { useRef, useState, useEffect } from "react";
import { createFilesystem, cwdToString } from "./engine/filesystem";
import { run } from "./engine/parser-bash";
import { useMode, toggleMode } from "./modeStore";
import { useCourseState, getActiveLevel, markLessonDone } from "./store/courseStore";
import { checkChallenge } from "./engine/validator";


function LessonBanner({ level, visible }) {
  if (!level || !visible) return null;

  return (
    <div className="mx-1 mb-3 border border-border rounded-lg overflow-hidden text-sm font-sans">
      {/* Banner header row */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-surface border-b border-border">
        {level.isCheckpoint ? (
          <span className="text-accent-amber font-mono text-xs tracking-widest uppercase">
            ✦ Checkpoint
          </span>
        ) : (
          <span className="text-accent-teal font-mono text-xs tracking-widest uppercase">
            Lesson {level.id}
          </span>
        )}
        <span className="text-text-primary font-sans font-medium">{level.title}</span>
        <span className="ml-auto text-text-muted text-xs font-mono">? to hide</span>
      </div>

      <div className="px-4 pt-3 pb-1 text-text-muted leading-relaxed whitespace-pre-wrap">
        {level.lesson}
      </div>

      {level.example && level.example.trim() !== "" && (
        <div className="mx-4 mb-3 mt-2 px-3 py-2 bg-bg-inset rounded font-mono text-xs text-accent-amber whitespace-pre">
          {level.example}
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3 bg-bg-surface/60 border-t border-border">
        <span className="shrink-0 text-accent-amber font-mono text-xs uppercase tracking-widest pt-0.5">
          Challenge
        </span>
        <span className="text-text-primary leading-relaxed">
          {level.challenge?.instruction}
        </span>
      </div>
    </div>
  );
}


function Terminal() {
  const mode = useMode();
  const courseState = useCourseState();
  const activeLevel = getActiveLevel(courseState);

  const [bannerVisible, setBannerVisible] = useState(true);
  const [input, setInput] = useState("");
  const [fsState, setFsState] = useState(() => createFilesystem());
  const [history, setHistory] = useState([]);
  const [sequenceStep, setSequenceStep] = useState(0);

  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(null);
  const [draft, setDraft] = useState("");

  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (activeLevel) {
      setBannerVisible(true);
      setSequenceStep(0);
    }
  }, [activeLevel?.id]);

  function handleKeyDown(e) {
    if (mode !== "terminal") return;

    if (e.key === "Enter") {
      const { output, newState, clearScreen } = run(input, fsState);

      if (clearScreen) {
        setHistory([]);
      } else {
        const promptAtRunTime = cwdToString(fsState.cwd);
        setHistory((prev) => [...prev, { prompt: promptAtRunTime, command: input, output }]);
      }

      if (input.trim() !== "") {
        setCommandHistory((prev) => [...prev, input]);
      }

      setFsState(newState);

      const valResult = checkChallenge(input, newState, activeLevel, sequenceStep);
      setSequenceStep(valResult.nextStep);

      if (valResult.passed && activeLevel) {
        const { activeLesson } = courseState;
        if (activeLesson) {
          markLessonDone(activeLesson.unitIndex, activeLesson.levelIndex);
        }
      }

      setInput("");
      setHistoryIndex(null);
      setDraft("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;

      if (historyIndex === null) {
        setDraft(input);
        const newIndex = commandHistory.length - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return;

      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else {
        setHistoryIndex(null);
        setInput(draft);
      }
    }
  }

  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        toggleMode();
      }
      if (
        e.key === "?" &&
        mode === "terminal" &&
        activeLevel &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        setBannerVisible((v) => !v);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [mode, activeLevel]);

  useEffect(() => {
    if (mode === "terminal") {
      inputRef.current?.focus();
    }
  }, [mode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [history]);

  return (
    <div className="h-screen flex-1 px-5 py-8 max-w-3/4">
      <div
        id="terminalWindow"
        className="border border-border h-full w-full rounded-xl overflow-clip flex flex-col"
      >

        <div className="h-12 w-full bg-bg-surface/75 border-b border-border rounded-t-xl flex items-center shrink-0">
          <div className="h-full rounded-tl-xl flex items-center pl-4 w-40 bg-border/50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30px"
              height="30px"
              viewBox="0 0 24 24"
              fill="none"
            >
              <g id="System / Terminal">
                <path
                  id="Vector"
                  d="M17 15H12M7 10L10 12.5L7 15M3 15.8002V8.2002C3 7.08009 3 6.51962 3.21799 6.0918C3.40973 5.71547 3.71547 5.40973 4.0918 5.21799C4.51962 5 5.08009 5 6.2002 5H17.8002C18.9203 5 19.4796 5 19.9074 5.21799C20.2837 5.40973 20.5905 5.71547 20.7822 6.0918C21 6.5192 21 7.07899 21 8.19691V15.8031C21 16.921 21 17.48 20.7822 17.9074C20.5905 18.2837 20.2837 18.5905 19.9074 18.7822C19.48 19 18.921 19 17.8031 19H6.19691C5.07899 19 4.5192 19 4.0918 18.7822C3.71547 18.5905 3.40973 18.2837 3.21799 17.9074C3 17.4796 3 16.9203 3 15.8002Z"
                  stroke="#878382"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
            <span className="text-text-muted ml-2 font-mono">Terminal</span>
          </div>

          <span className="text-text-muted ml-auto mr-5 font-mono text-[18px]">
            Bash (Ubuntu)
          </span>
        </div>


        <div
          className={`p-5 pl-6 font-mono text-2xl tracking-wide overflow-y-auto flex-1 transition-opacity duration-150 ${
            mode !== "terminal" ? "opacity-60" : ""
          }`}
          onClick={() => mode === "terminal" && inputRef.current?.focus()}
        >
          {!activeLevel && (
            <div className="text-accent-amber mb-6 whitespace-pre">
{`    __                          _____ __         ____
   / /   ___  ____ __________  / ___// /_  ___  / / /
  / /   / _ \\/ __ \`/ ___/ __ \\ \\__ \\/ __ \\/ _ \\/ / / 
 / /___/  __/ /_/ / /  / / / /___/ / / / /  __/ / /  
/_____/\\___/\\__,_/_/  /_/ /_//____/_/ /_/\\___/_/_/   `}
              <br /><br />
              Welcome to Learn Shell. A hands-on way to master the command-line.
              <br />
              Press <span className="underline">Esc</span> to navigate to a lesson, or type freely.
            </div>
          )}


          {/* Command history */}
          {history.map((entry, i) => (
            <div key={i}>
              <div className="w-[calc(100%-10px)] leading-8 whitespace-pre-wrap break-all">
                <span className="mr-1 text-accent-amber">
                  user@shellpath:{entry.prompt}${" "}
                </span>
                <span className="text-text-primary">{entry.command}</span>
              </div>
              {entry.output !== "" && (
                <div className="w-[calc(100%-10px)] leading-8 whitespace-pre-wrap break-all text-text-primary">
                  {entry.output}
                </div>
              )}
            </div>
          ))}

          <LessonBanner level={activeLevel} visible={bannerVisible} />

          <div className="relative w-[calc(100%-10px)] leading-8 whitespace-pre-wrap break-all">
            <span className="mr-1 text-accent-amber">
              learnshell@shellpath:{cwdToString(fsState.cwd)}${" "}
            </span>
            <span className="cursor-text text-text-primary">
              {input}
              {mode === "terminal" && (
                <span className="inline-block w-3 h-8 align-middle bg-accent-amber animate-blink" />
              )}
            </span>

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={mode !== "terminal"}
              className="absolute opacity-0"
              autoFocus
            />
          </div>

          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

export default Terminal;