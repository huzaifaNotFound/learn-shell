import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronUp, ChevronDown, Lock, Play, Flag } from "lucide-react";
import { useMode, setMode } from "./modeStore";
import {
  useCourseState,
  buildSections,
  setActiveLesson,
} from "./store/courseStore";

// ─── Nav-list helpers ───────────────────────────────────────────────────────

// Flattens sections + (only currently open) lessons into the ordered list
// that ↑ / ↓ walk through in navigate mode.
function buildNavItems(sections, openSections) {
  const items = [];
  sections.forEach((section, sectionIndex) => {
    items.push({ type: "section", sectionIndex });
    if (!section.locked && openSections.has(section.number) && section.levels) {
      section.levels.forEach((_level, levelIndex) => {
        items.push({ type: "lesson", sectionIndex, levelIndex });
      });
    }
  });
  return items;
}

function itemKey(item) {
  return item.type === "section"
    ? `s-${item.sectionIndex}`
    : `l-${item.sectionIndex}-${item.levelIndex}`;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Kbd({ children }) {
  return (
    <span className="px-2 py-1 rounded bg-accent-amber text-bg-primary font-mono text-xs font-semibold leading-none">
      {children}
    </span>
  );
}

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

function CourseSection({ section, sectionIndex, isOpen, focusedItem, registerRef }) {
  const isSectionFocused =
    focusedItem?.type === "section" && focusedItem.sectionIndex === sectionIndex;

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
        <span className="w-12 shrink-0 font-mono text-base text-text-primary">
          {section.number}
        </span>

        {/* Title */}
        <span
          className={`flex-1 font-mono text-base ${
            section.locked ? "text-text-muted" : "text-text-primary"
          }`}
        >
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

      {isOpen && section.levels && (
        <div className="pb-3">
          {section.levels.map((level, levelIndex) => {
            const isFocused =
              focusedItem?.type === "lesson" &&
              focusedItem.sectionIndex === sectionIndex &&
              focusedItem.levelIndex === levelIndex;

            return (
              <div
                key={level.id}
                ref={(el) => registerRef(`l-${sectionIndex}-${levelIndex}`, el)}
                role="option"
                aria-selected={isFocused}
                className={`mx-5 h-10.75 px-3 flex items-center rounded-md select-none
                  ${level.active ? "bg-border/50 border border-border" : ""}
                  ${isFocused ? "ring-1 ring-inset ring-accent-teal" : ""}
                  ${level.locked ? "opacity-50" : ""}`}
              >
                {/* Status icon */}
                <div className="w-10 shrink-0 flex justify-center">
                  {level.isCheckpoint ? (
                    <Flag
                      size={14}
                      strokeWidth={2}
                      className={level.done ? "text-accent-success" : "text-text-muted"}
                    />
                  ) : level.done ? (
                    <div className="w-5.5 h-5.5 rounded-full bg-accent-success flex items-center justify-center">
                      <Check size={14} strokeWidth={3} className="text-bg-primary" />
                    </div>
                  ) : level.active ? (
                    <div className="flex items-center gap-1.75 text-accent-amber">
                      <Play size={12} fill="currentColor" />
                      <Play size={12} fill="currentColor" />
                    </div>
                  ) : (
                    <div className="w-5.25 h-5.25 rounded-full border-2 border-border" />
                  )}
                </div>

                {/* Level ID */}
                <span className="w-12 shrink-0 text-[14px] text-text-muted font-sans">
                  {level.id}
                </span>

                {/* Level title */}
                <span
                  className={`text-[15px] font-sans ${
                    level.locked ? "text-text-muted" : "text-text-primary"
                  }`}
                >
                  {level.title}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function CourseSidebar() {
  const mode = useMode();
  const courseState = useCourseState();
  const sections = useMemo(() => buildSections(courseState), [courseState]);

  // Overall progress for the header bar
  const totalLevels = sections.reduce((sum, s) => sum + s.total, 0);
  const doneLevels = sections.reduce((sum, s) => sum + s.completed, 0);
  const overallPct = totalLevels > 0 ? Math.round((doneLevels / totalLevels) * 100) : 0;

  const [openSections, setOpenSections] = useState(
    () => new Set(sections.filter((s) => !s.locked).map((s) => s.number))
  );
  const [focusedIndex, setFocusedIndex] = useState(0);

  const navItems = useMemo(
    () => buildNavItems(sections, openSections),
    [sections, openSections]
  );
  const itemRefs = useRef({});

  // Keep focusedIndex in range whenever the list reshapes.
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

  // ↑ / ↓ / Enter keyboard handling in navigate mode.
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
          if (section.locked) return;
          setOpenSections((prev) => {
            const next = new Set(prev);
            next.has(section.number)
              ? next.delete(section.number)
              : next.add(section.number);
            return next;
          });
        } else {
          // Lesson selected — notify the store so the terminal banner updates.
          const section = sections[item.sectionIndex];
          const level = section.levels[item.levelIndex];
          if (!level.locked) {
            setActiveLesson(level.unitIndex, level.levelIndex);
            setMode("terminal");
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, navItems, focusedIndex, sections]);

  const focusedItem = mode === "navigate" ? navItems[focusedIndex] : null;

  function registerRef(key, el) {
    itemRefs.current[key] = el;
  }

  return (
    <div className="h-screen w-1/3 min-w-100 bg-bg-surface border-l-2 border-border flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="h-25.5 shrink-0 border-b-2 border-border w-full flex items-center justify-between px-8">
        <div className="flex flex-col gap-y-1">
          <h2 className="text-text-primary font-sans text-[21px] font-medium tracking-wide">
            Bash Fundamentals
          </h2>
          <h3 className="text-text-muted font-sans text-[14px]">
            Learn the command line. Build real skills.
          </h3>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-text-muted font-sans text-[14px]">
            {overallPct}% completed
          </span>
          <div className="w-26 h-2 bg-bg-inset/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-success rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scrollable lesson list */}
      <div
        role="listbox"
        aria-label="Course sections and lessons"
        className="flex-1 overflow-y-auto scrollbar-none pb-24"
      >
        {sections.map((section, sectionIndex) => (
          <CourseSection
            key={section.number}
            section={section}
            sectionIndex={sectionIndex}
            isOpen={!section.locked && openSections.has(section.number)}
            focusedItem={focusedItem}
            registerRef={registerRef}
          />
        ))}
      </div>

      <ModeIndicator mode={mode} />
    </div>
  );
}
