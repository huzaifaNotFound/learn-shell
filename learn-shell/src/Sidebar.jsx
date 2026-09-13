import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronUp, ChevronDown, Lock, Play } from "lucide-react";
import { useMode } from "./modeStore";

const sections = [
  {
    number: "01",
    title: "Getting Started",
    completed: 4,
    total: 4,
    lessons: [
      { id: "1.1", title: "What is a shell?", done: true, locked: false },
      { id: "1.2", title: "Your first command", done: true, locked: false },
      { id: "1.3", title: "Navigating directories", done: true, locked: false },
      { id: "1.4", title: "Files and folders", done: true, locked: false },
    ],
  },
  {
    number: "02",
    title: "Working with Files",
    completed: 2,
    total: 5,
    lessons: [
      { id: "2.1", title: "Viewing file contents", done: true, locked: false },
      { id: "2.2", title: "Creating and editing files", done: true, locked: false },
      { id: "2.3", title: "Copying and moving files", active: true, locked: false },
      { id: "2.4", title: "Deleting files", locked: false },
      { id: "2.5", title: "File permissions", locked: false },
    ],
  },
  {
    number: "03",
    title: "Text Processing",
    completed: 0,
    total: 6,
    locked: true,
    lessons: [
      { id: "3.1", title: "Pattern matching with grep", locked: true },
      { id: "3.2", title: "Stream editing with sed", locked: true },
      { id: "3.3", title: "Text processing with awk", locked: true },
      { id: "3.4", title: "Sorting and removing duplicates", locked: true },
      { id: "3.5", title: "Cutting and joining columns", locked: true },
      { id: "3.6", title: "Chaining commands with pipes", locked: true },
    ],
  },
  {
    number: "04",
    title: "Shell Scripting",
    completed: 0,
    total: 6,
    locked: true,
    lessons: [
      { id: "4.1", title: "Writing your first script", locked: true },
      { id: "4.2", title: "Variables and quoting", locked: true },
      { id: "4.3", title: "Conditionals and test", locked: true },
      { id: "4.4", title: "Loops: for, while, until", locked: true },
      { id: "4.5", title: "Functions and arguments", locked: true },
      { id: "4.6", title: "Debugging scripts", locked: true },
    ],
  },
  {
    number: "05",
    title: "Tools & Productivity",
    completed: 0,
    total: 5,
    locked: true,
    lessons: [
      { id: "5.1", title: "Aliases and shell functions", locked: true },
      { id: "5.2", title: "Command history and shortcuts", locked: true },
      { id: "5.3", title: "Job control and background tasks", locked: true },
      { id: "5.4", title: "Environment variables and .bashrc", locked: true },
      { id: "5.5", title: "Multiplexing with tmux", locked: true },
    ],
  },
  {
    number: "06",
    title: "Real World Projects",
    completed: 0,
    total: 4,
    locked: true,
    lessons: [
      { id: "6.1", title: "Build a backup script", locked: true },
      { id: "6.2", title: "Build a log file analyzer", locked: true },
      { id: "6.3", title: "Automate a deployment task", locked: true },
      { id: "6.4", title: "Capstone: build your own CLI tool", locked: true },
    ],
  },
];

// The lesson marked `active` in the data above is the one selected by
// default, before the learner has navigated anywhere.
function getDefaultSelection() {
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const lessons = sections[sectionIndex].lessons || [];
    const lessonIndex = lessons.findIndex((lesson) => lesson.active);
    if (lessonIndex !== -1) return { sectionIndex, lessonIndex };
  }
  return null;
}

// Flattens sections + (only currently open) lessons into the ordered list
// that ↑ / ↓ walk through in navigate mode.
function buildNavItems(openSections) {
  const items = [];
  sections.forEach((section, sectionIndex) => {
    items.push({ type: "section", sectionIndex });
    if (!section.locked && openSections.has(section.number) && section.lessons) {
      section.lessons.forEach((_lesson, lessonIndex) => {
        items.push({ type: "lesson", sectionIndex, lessonIndex });
      });
    }
  });
  return items;
}

function itemKey(item) {
  return item.type === "section" ? `s-${item.sectionIndex}` : `l-${item.sectionIndex}-${item.lessonIndex}`;
}

function Kbd({ children }) {
  return (
    <span className="px-2 py-1 rounded bg-accent-amber text-bg-primary font-mono text-xs font-semibold leading-none">
      {children}
    </span>
  );
}

// Replaces the old static quote card. Floats over the sidebar so it stays
// visible regardless of scroll position, and always shows which mode
// keyboard input is currently in.
function ModeIndicator({ mode }) {
  const isNavigate = mode === "navigate";

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-lg">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-border bg-bg-inset/95 px-6 py-3.5 shadow-lg">
        <span className={`font-mono text-sm ${isNavigate ? "text-accent-teal" : "text-accent-amber"}`}>
          {isNavigate ? "-- navigate mode --" : "-- terminal mode --"}
        </span>

        <span className="w-px h-5 bg-border shrink-0" />

        {isNavigate ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm font-sans text-text-muted">
            <span className="flex items-center gap-2">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> Move
            </span>
            <span className="flex items-center gap-2">
              <Kbd>Enter</Kbd> Select
            </span>
            <span className="flex items-center gap-2">
              <Kbd>Esc</Kbd> Navigate terminal
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-sans text-text-muted">
            <Kbd>Esc</Kbd> Navigate sidebar
          </div>
        )}
      </div>
    </div>
  );
}

function CourseSection({ section, sectionIndex, isOpen, focusedItem, selectedLesson, registerRef }) {
  const isSectionFocused = focusedItem?.type === "section" && focusedItem.sectionIndex === sectionIndex;

  return (
    <div className="border-b border-border">
      <div
        ref={(el) => registerRef(`s-${sectionIndex}`, el)}
        role="option"
        aria-selected={isSectionFocused}
        className={`w-full h-17 px-8 flex items-center text-left select-none
          ${isSectionFocused ? "bg-border/50 ring-1 ring-inset ring-accent-teal" : ""}`}
      >
        {/* Section number */}
        <span className="w-12 shrink-0 font-mono text-base text-text-primary">{section.number}</span>

        {/* Title */}
        <span className={`flex-1 font-mono text-base ${section.locked ? "text-text-muted" : "text-text-primary"}`}>
          {section.title}
        </span>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {section.locked ? (
            <>
              <Lock size={15} strokeWidth={1.8} className="text-text-muted" />
              <span className="text-text-muted text-sm">
                {section.completed} / {section.total}
              </span>
            </>
          ) : (
            <>
              <span className="text-text-muted text-sm">
                {section.completed} / {section.total}
              </span>

              {isOpen ? (
                <ChevronUp size={18} className="text-text-muted" />
              ) : (
                <ChevronDown size={18} className="text-text-muted" />
              )}
            </>
          )}
        </div>
      </div>

      {isOpen && section.lessons && (
        <div className="pb-3">
          {section.lessons.map((lesson, lessonIndex) => {
            const isSelected =
              selectedLesson?.sectionIndex === sectionIndex && selectedLesson?.lessonIndex === lessonIndex;
            const isFocused =
              focusedItem?.type === "lesson" &&
              focusedItem.sectionIndex === sectionIndex &&
              focusedItem.lessonIndex === lessonIndex;

            return (
              <div
                key={lesson.id}
                ref={(el) => registerRef(`l-${sectionIndex}-${lessonIndex}`, el)}
                role="option"
                aria-selected={isFocused}
                className={`mx-5 h-10.75 px-3 flex items-center rounded-md select-none
                  ${isSelected ? "bg-border/50 border border-border" : ""}
                  ${isFocused ? "ring-1 ring-inset ring-accent-teal" : ""}`}
              >
                {/* Status */}
                <div className="w-10 shrink-0 flex justify-center">
                  {lesson.done ? (
                    <div className="w-5.5 h-5.5 rounded-full bg-accent-success flex items-center justify-center">
                      <Check size={14} strokeWidth={3} className="text-bg-primary" />
                    </div>
                  ) : isSelected ? (
                    <div className="flex items-center gap-1.75 text-accent-success">
                      <Play size={12} fill="currentColor" />
                      <Play size={12} fill="currentColor" />
                    </div>
                  ) : (
                    <div className="w-5.25 h-5.25 rounded-full border-2 border-border" />
                  )}
                </div>

                {/* Lesson ID */}
                <span className="w-12 shrink-0 text-[14px] text-text-muted font-sans">{lesson.id}</span>

                {/* Lesson title */}
                <span className="text-[15px] text-text-primary font-sans">{lesson.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CourseSidebar() {
  const mode = useMode(); // "terminal" | "navigate"

  const [openSections, setOpenSections] = useState(
    () => new Set(sections.filter((section) => !section.locked).map((section) => section.number))
  );
  const [selectedLesson, setSelectedLesson] = useState(getDefaultSelection);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const navItems = useMemo(() => buildNavItems(openSections), [openSections]);
  const itemRefs = useRef({});

  // Keep focusedIndex in range whenever the list reshapes (e.g. a section collapses).
  useEffect(() => {
    setFocusedIndex((i) => Math.max(0, Math.min(i, navItems.length - 1)));
  }, [navItems.length]);

  // Keep the focused row visible as it moves.
  useEffect(() => {
    if (mode !== "navigate") return;
    const item = navItems[focusedIndex];
    if (!item) return;
    itemRefs.current[itemKey(item)]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, mode, navItems]);

  // ↑ / ↓ / Enter — only active in navigate mode. Listens on window so it
  // works no matter what element (if anything) currently has focus.
  useEffect(() => {
    if (mode !== "navigate") return;

    function handleKeyDown(e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, navItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = navItems[focusedIndex];
        if (!item) return;

        if (item.type === "section") {
          const section = sections[item.sectionIndex];
          if (section.locked) return; // locked sections can't be opened
          setOpenSections((prev) => {
            const next = new Set(prev);
            next.has(section.number) ? next.delete(section.number) : next.add(section.number);
            return next;
          });
        } else {
          setSelectedLesson({ sectionIndex: item.sectionIndex, lessonIndex: item.lessonIndex });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, navItems, focusedIndex]);

  const focusedItem = mode === "navigate" ? navItems[focusedIndex] : null;

  function registerRef(key, el) {
    itemRefs.current[key] = el;
  }

  return (
    <div className="h-screen w-1/3 min-w-100 bg-bg-surface border-l-2 border-border flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="h-25.5 shrink-0 border-b-2 border-border w-full flex items-center justify-between px-8">
        <div className="flex flex-col gap-y-1">
          <h2 className="text-text-primary font-sans text-[21px] font-medium tracking-wide">Bash Fundamentals</h2>

          <h3 className="text-text-muted font-sans text-[14px]">Learn the command line. Build real skills.</h3>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-text-muted font-sans text-[14px]">12% completed</span>

          <div className="w-26 h-2 bg-bg-inset/60 rounded-full overflow-hidden">
            <div className="h-full w-[12%] bg-accent-success rounded-full" />
          </div>
        </div>
      </div>

      <div role="listbox" aria-label="Course sections and lessons" className="flex-1 overflow-y-auto scrollbar-none pb-24">
        {sections.map((section, sectionIndex) => (
          <CourseSection
            key={section.number}
            section={section}
            sectionIndex={sectionIndex}
            isOpen={!section.locked && openSections.has(section.number)}
            focusedItem={focusedItem}
            selectedLesson={selectedLesson}
            registerRef={registerRef}
          />
        ))}
      </div>

      <ModeIndicator mode={mode} />
    </div>
  );
}