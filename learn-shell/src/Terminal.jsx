import { useRef, useState, useEffect } from "react";
import { createFilesystem, cwdToString } from "./engine/filesystem";
import { run } from "./engine/parser-bash";
import { useMode, toggleMode } from "./modeStore";

function Terminal() {
  const mode = useMode(); // "terminal" | "navigate"

  const [input, setInput] = useState("");
  const [fsState, setFsState] = useState(() => createFilesystem());
  const [history, setHistory] = useState([]); // past { prompt, command, output } entries

  // --- Command history recall (up/down arrows) ---
  const [commandHistory, setCommandHistory] = useState([]); // past submitted command strings, oldest first
  const [historyIndex, setHistoryIndex] = useState(null); // null = not browsing history right now
  const [draft, setDraft] = useState(""); // what you were typing before you pressed ↑

  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  function handleKeyDown(e) {
    // While navigating the sidebar, the terminal input is disabled (see
    // below) so this normally won't even fire — this guard is just a
    // belt-and-braces safeguard against stray key events.
    if (mode !== "terminal") return;

    if (e.key === "Enter") {
      const { output, newState, clearScreen } = run(input, fsState);

      if (clearScreen) {
        setHistory([]);
      } else {
        const promptAtRunTime = cwdToString(fsState.cwd);
        setHistory((prev) => [...prev, { prompt: promptAtRunTime, command: input, output }]);
      }

      // Blank lines (just hitting Enter) don't get remembered — same as real bash.
      if (input.trim() !== "") {
        setCommandHistory((prev) => [...prev, input]);
      }

      setFsState(newState);
      setInput("");
      setHistoryIndex(null);
      setDraft("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault(); // stop the caret jumping in the (invisible) input
      if (commandHistory.length === 0) return;

      if (historyIndex === null) {
        // First press: remember whatever was being typed so ↓ can restore it later.
        setDraft(input);
        const newIndex = commandHistory.length - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
      // else: already at the oldest command — stop there, don't wrap around
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return; // not currently browsing — nothing to do

      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else {
        // Moved past the newest command — hand control back to whatever was being typed.
        setHistoryIndex(null);
        setInput(draft);
      }
    }
  }

  // Esc toggles terminal <-> navigate mode. This listens on window rather
  // than the input, because once we're in navigate mode the terminal input
  // is disabled/blurred and would never see the keypress otherwise.
  useEffect(() => {
    function handleGlobalKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        toggleMode();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Reclaim focus (and let the caret start blinking again) whenever we come
  // back to terminal mode.
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
      <div id="terminalWindow" className="border border-border h-full w-full rounded-xl overflow-clip flex flex-col">
        <div className="h-12 w-full bg-bg-surface/75 border-b border-border rounded-t-xl flex items-center shrink-0">
          <div className="h-full rounded-tl-xl flex items-center pl-4 w-40 bg-border/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="30px" height="30px" viewBox="0 0 24 24" fill="none">
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

          <span className="text-text-muted ml-4 mb-1 font-mono text-[28px]">+</span>
          <span className="text-text-muted ml-auto mr-5 font-mono text-[18px]">Bash (Ubuntu)</span>
        </div>

        <div
          className={`p-5 pl-6 font-mono text-2xl tracking-wide overflow-y-auto flex-1 transition-opacity duration-150 ${
            mode !== "terminal" ? "opacity-60" : ""
          }`}
          onClick={() => mode === "terminal" && inputRef.current?.focus()}
        >
          <div className="text-accent-amber">
            Welcome to LearnShell<br></br>A hands on way to master the command-line. <br></br>Type 'help' to get
            started. <br></br>
            <br></br>
          </div>

          {history.map((entry, i) => (
            <div key={i}>
              <div className="w-[calc(100%-10px)] leading-8 whitespace-pre-wrap break-all">
                <span className="mr-1 text-accent-amber">user@shellpath:{entry.prompt}$ </span>
                <span className="text-text-primary">{entry.command}</span>
              </div>
              {entry.output !== "" && (
                <div className="w-[calc(100%-10px)] leading-8 whitespace-pre-wrap break-all text-text-primary">
                  {entry.output}
                </div>
              )}
            </div>
          ))}

          <div className="relative w-[calc(100%-10px)] leading-8 whitespace-pre-wrap break-all">
            <span className="mr-1 text-accent-amber">learnshell@shellpath:{cwdToString(fsState.cwd)}$ </span>
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