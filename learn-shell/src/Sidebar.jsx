import { useState } from "react";
import { Check, ChevronUp, ChevronDown, Lock, Play } from "lucide-react";

const sections = [
  {
    number: "01",
    title: "Getting Started",
    completed: 4,
    total: 4,
    lessons: [
      { id: "1.1", title: "What is a shell?", done: true },
      { id: "1.2", title: "Your first command", done: true },
      { id: "1.3", title: "Navigating directories", done: true },
      { id: "1.4", title: "Files and folders", done: true },
    ],
  },
  {
    number: "02",
    title: "Working with Files",
    completed: 2,
    total: 5,
    lessons: [
      { id: "2.1", title: "Viewing file contents", done: true },
      { id: "2.2", title: "Creating and editing files", done: true },
      { id: "2.3", title: "Copying and moving files", active: true },
      { id: "2.4", title: "Deleting files" },
      { id: "2.5", title: "File permissions" },
    ],
  },
  {
    number: "03",
    title: "Text Processing",
    completed: 0,
    total: 6,
    locked: true,
  },
  {
    number: "04",
    title: "Shell Scripting",
    completed: 0,
    total: 6,
    locked: true,
  },
  {
    number: "05",
    title: "Tools & Productivity",
    completed: 0,
    total: 5,
    locked: true,
  },
  {
    number: "06",
    title: "Real World Projects",
    completed: 0,
    total: 4,
    locked: true,
  },
];

function CourseSection({ section }) {
  const [open, setOpen] = useState(!section.locked);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => !section.locked && setOpen(!open)}
        disabled={section.locked}
        className="w-full h-[68px] px-8 flex items-center text-left"
      >
        {/* Section number */}
        <span className="w-12 shrink-0 font-mono text-[17px] text-text-primary">{section.number}</span>

        {/* Title */}
        <span className={`flex-1 font-mono text-[17px] ${section.locked ? "text-text-primary" : "text-text-primary"}`}>
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

              {open ? (
                <ChevronUp size={18} className="text-text-muted" />
              ) : (
                <ChevronDown size={18} className="text-text-muted" />
              )}
            </>
          )}
        </div>
      </button>

      {open && section.lessons && (
        <div className="pb-3">
          {section.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className={`mx-5 h-[43px] px-3 flex items-center rounded-md
                ${lesson.active ? "bg-[#252d38] border border-[#303946]" : ""}`}
            >
              {/* Status */}
              <div className="w-10 shrink-0 flex justify-center">
                {lesson.done ? (
                  <div className="w-[22px] h-[22px] rounded-full bg-[#a8cf91] flex items-center justify-center">
                    <Check size={14} strokeWidth={3} className="text-[#182019]" />
                  </div>
                ) : lesson.active ? (
                  <div className="flex items-center gap-[7px] text-[#9ec68b]">
                    <Play size={12} fill="currentColor" />
                    <Play size={12} fill="currentColor" />
                  </div>
                ) : (
                  <div className="w-[21px] h-[21px] rounded-full border-2 border-[#7a838c]" />
                )}
              </div>

              {/* Lesson ID */}
              <span className="w-12 shrink-0 text-[14px] text-text-muted font-sans">{lesson.id}</span>

              {/* Lesson title */}
              <span className="text-[15px] text-text-primary font-sans">{lesson.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CourseSidebar() {
  return (
    <div className="h-screen w-1/3 min-w-[400px] bg-bg-surface border-l-2 border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-[102px] shrink-0 border-b-2 border-border w-full flex items-center justify-between px-8">
        <div className="flex flex-col gap-y-1">
          <h2 className="text-text-primary font-sans text-[21px] font-medium tracking-wide">Bash Fundamentals</h2>

          <h3 className="text-text-muted font-sans text-[14px]">Learn the command line. Build real skills.</h3>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-text-muted font-sans text-[14px]">12% completed</span>

          <div className="w-[104px] h-[8px] bg-bg-inset/60 rounded-full overflow-hidden">
            <div className="h-full w-[12%] bg-[#a8cf91] rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {sections.map((section) => (
          <CourseSection key={section.number} section={section} />
        ))}

        <div className="p-6">
          <div className="border border-border rounded-lg px-5 py-4">
            <p className="font-mono text-[14px] text-text-primary">“Small tools. Big possibilities.”</p>

            <p className="mt-2 font-mono text-[12px] text-text-muted">— The Unix Philosophy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
