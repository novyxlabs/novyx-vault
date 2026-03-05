"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const NOTES = [
  { name: "Meeting Notes", active: true },
  { name: "Project Ideas", active: false },
  { name: "Q3 Review", active: false },
  { name: "AI Research", active: false },
  { name: "Weekly Plan", active: false },
];

const TYPED_TEXT =
  "Discussed the Q4 roadmap with the team. Key priorities: launch AI memory features, expand provider support, and ship the desktop app by end of quarter.";

const ROLLBACK_TEXT =
  "Met with the team to review Q3 results. Revenue up 40% from last quarter...";

// Phase durations in ms
const PHASE_TYPING = 0;
const PHASE_MEMORY = 1;
const PHASE_GHOST = 2;
const PHASE_ROLLBACK = 3;
const PHASE_RESET = 4;

const PHASE_TIMES = [4000, 2000, 2000, 3000, 1000]; // 12s total

export default function HeroDemo() {
  const [phase, setPhase] = useState(PHASE_TYPING);
  const [charIndex, setCharIndex] = useState(0);
  const [timelinePos, setTimelinePos] = useState(100);
  const phaseStartRef = useRef(0);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reset = useCallback(() => {
    setPhase(PHASE_TYPING);
    setCharIndex(0);
    setTimelinePos(100);
    phaseStartRef.current = performance.now();
  }, []);

  // Initialize on mount
  useEffect(() => {
    phaseStartRef.current = performance.now();
  }, []);

  // Phase controller
  useEffect(() => {
    loopRef.current = setInterval(() => {
      const elapsed = performance.now() - phaseStartRef.current;
      const limit = PHASE_TIMES[phase];
      if (elapsed >= limit) {
        const next = phase + 1;
        if (next > PHASE_RESET) {
          reset();
        } else {
          phaseStartRef.current = performance.now();
          setPhase(next);
        }
      }
      // Animate timeline during rollback phase
      if (phase === PHASE_ROLLBACK) {
        const progress = Math.min(elapsed / PHASE_TIMES[PHASE_ROLLBACK], 1);
        setTimelinePos(100 - progress * 70);
      }
    }, 50);
    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [phase, reset]);

  // Typing effect
  useEffect(() => {
    if (phase === PHASE_TYPING) {
      typingRef.current = setInterval(() => {
        setCharIndex((i) => {
          if (i >= TYPED_TEXT.length) {
            if (typingRef.current) clearInterval(typingRef.current);
            return i;
          }
          return i + 1;
        });
      }, 50 + Math.random() * 20);
    }
    return () => { if (typingRef.current) clearInterval(typingRef.current); };
  }, [phase]);

  const showMemory = phase >= PHASE_MEMORY;
  const showGhost = phase >= PHASE_GHOST;
  const isRollback = phase >= PHASE_ROLLBACK;
  const isFading = phase === PHASE_RESET;

  const displayText = isRollback
    ? ROLLBACK_TEXT
    : TYPED_TEXT.slice(0, charIndex);

  return (
    <div
      className={`mx-auto max-w-2xl rounded-2xl border border-[#27272a] bg-[#0f0f0f] overflow-hidden shadow-2xl transition-opacity duration-500 ${isFading ? "opacity-40" : "opacity-100"}`}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161618] border-b border-[#27272a]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]/60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/60" />
        <span className="ml-auto text-[11px] text-[#71717a] font-medium tracking-wide">
          Novyx Vault
        </span>
      </div>

      {/* Body */}
      <div className="flex h-[220px] sm:h-[260px] md:h-[300px] relative">
        {/* Sidebar */}
        <div className="hidden sm:flex flex-col w-[120px] md:w-[140px] border-r border-[#27272a] bg-[#161618] p-2 shrink-0">
          <span className="text-[10px] text-[#71717a] uppercase tracking-wider font-medium px-1.5 mb-2">
            Notes
          </span>
          {NOTES.map((note, i) => (
            <div
              key={note.name}
              className={`text-[11px] px-1.5 py-1 rounded-md truncate ${
                note.active
                  ? "bg-[#8b5cf6]/15 text-[#e4e4e7]"
                  : "text-[#71717a]"
              }`}
              style={{ position: "relative" }}
              data-note-index={i}
            >
              {note.name}
            </div>
          ))}
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-hidden relative">
          <div className="text-sm sm:text-base font-bold text-[#e4e4e7] mb-2 font-[var(--font-geist-mono),monospace]">
            # Meeting Notes
          </div>
          <div
            className={`text-xs sm:text-sm text-[#a1a1aa] leading-relaxed font-[var(--font-geist-mono),monospace] transition-opacity duration-300 ${
              isRollback ? "opacity-70" : ""
            }`}
          >
            {displayText}
            {phase === PHASE_TYPING && <span className="hero-cursor" />}
          </div>

          {/* AI Memory Card */}
          {showMemory && !isRollback && (
            <div
              className={`mt-auto rounded-lg border-l-2 border-[#8b5cf6] bg-[#1c1c1f] p-2.5 sm:p-3 ${
                showMemory ? "hero-card-in" : ""
              } ${phase === PHASE_MEMORY ? "hero-glow" : ""}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-4 h-4 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-[8px]">
                  🧠
                </span>
                <span className="text-[10px] text-[#8b5cf6] font-medium">
                  AI Memory
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#a1a1aa] leading-snug">
                Related to your <span className="text-[#8b5cf6]">Q3 Review</span> notes —
                you previously discussed launching AI features as a top priority.
              </p>
            </div>
          )}
        </div>

        {/* Ghost Connection SVG overlay */}
        {showGhost && !isRollback && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none hidden sm:block"
            style={{ zIndex: 10 }}
          >
            <GhostLine x1="8%" y1="32%" x2="22%" y2="48%" color="#8b5cf6" delay={0} />
            <GhostLine x1="8%" y1="48%" x2="22%" y2="62%" color="#3b82f6" delay={300} />
            <GhostLine x1="8%" y1="32%" x2="22%" y2="76%" color="#22d3ee" delay={600} />
          </svg>
        )}
      </div>

      {/* Timeline bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#161618] border-t border-[#27272a]">
        <span className="text-[9px] text-[#71717a]">Memory Timeline</span>
        <div className="flex-1 h-1 rounded-full bg-[#27272a] relative mx-2">
          {/* Dots */}
          {[15, 35, 55, 75, 95].map((pos) => (
            <div
              key={pos}
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#3f3f46]"
              style={{ left: `${pos}%` }}
            />
          ))}
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shadow-sm transition-[left] duration-100"
            style={{ left: `${timelinePos}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>
        <span className="text-[9px] text-[#71717a] tabular-nums w-8 text-right">
          {isRollback ? "−3d" : "now"}
        </span>
      </div>
    </div>
  );
}

function GhostLine({
  x1, y1, x2, y2, color, delay,
}: {
  x1: string; y1: string; x2: string; y2: string; color: string; delay: number;
}) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray="80"
      strokeDashoffset="80"
      strokeLinecap="round"
      opacity={0.6}
      style={{
        animation: `heroLineAppear 0.8s ease-out ${delay}ms both`,
      }}
    />
  );
}
