"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView as useMotionInView } from "motion/react";

/* ========== Shared ========== */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

function useInView() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useMotionInView(ref, { once: true, amount: 0.3 });
  return { ref, inView };
}

function DemoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-[#27272a] bg-[#0f0f0f] overflow-hidden p-4 sm:p-5 min-h-[200px] sm:min-h-[240px]">
      {children}
    </div>
  );
}

function useTyping(text: string, active: boolean, speed = 40) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (index >= text.length) return;
    const t = setTimeout(() => setIndex((i) => i + 1), speed + Math.random() * 20);
    return () => clearTimeout(t);
  }, [active, index, text, speed]);
  return text.slice(0, index);
}

/* ========== 1. Persistent AI Memory ========== */

export function MemoryDemo() {
  const { ref, inView } = useInView();
  const aiText = useTyping(
    "Based on your Q3 notes from last month, this aligns with the AI memory launch you prioritized. Want me to pull in those action items?",
    inView,
    30,
  );

  return (
    <DemoCard>
      <div ref={ref} className="flex flex-col gap-2.5 h-full">
        {/* User message */}
        <div className="flex justify-end">
          <div className="bg-[#6366f1]/15 rounded-lg rounded-br-sm px-3 py-2 max-w-[80%]">
            <p className="text-[11px] text-[#e4e4e7]">
              What did we decide about the Q4 priorities?
            </p>
          </div>
        </div>
        {/* AI response */}
        {inView && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="bg-[#1c1c1f] border border-[#27272a] rounded-lg rounded-bl-sm px-3 py-2 max-w-[85%]">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-3.5 h-3.5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-[7px]">🧠</span>
                <span className="text-[9px] text-[#8b5cf6] font-medium">Using memory</span>
              </div>
              <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
                {aiText}
                {aiText.length < 120 && <span className="hero-cursor" />}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </DemoCard>
  );
}

/* ========== 2. Wiki-Style Linking ========== */

export function WikiLinkDemo() {
  const { ref, inView } = useInView();
  const typed = useTyping("See also [[Proj", inView, 80);
  const showDropdown = inView && typed.length >= 15;

  return (
    <DemoCard>
      <div ref={ref} className="relative">
        <div className="bg-[#161618] rounded-lg p-3 font-[var(--font-geist-mono),monospace]">
          <p className="text-[11px] text-[#71717a] mb-1"># Research Notes</p>
          <p className="text-[12px] text-[#a1a1aa]">
            The new approach to persistent memory could change how we think about context windows.
          </p>
          <p className="text-[12px] text-[#a1a1aa] mt-2">
            {typed}
            {typed.length < 15 && <span className="hero-cursor" />}
            {typed.length >= 15 && (
              <span className="text-[#8b5cf6] bg-[#8b5cf6]/10 rounded px-0.5">|</span>
            )}
          </p>
        </div>
        {/* Autocomplete dropdown */}
        {showDropdown && (
          <motion.div
            className="absolute left-3 bottom-2 translate-y-full w-48 bg-[#1c1c1f] border border-[#27272a] rounded-lg shadow-xl overflow-hidden z-10"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.2 }}
            style={{ transformOrigin: "top" }}
          >
            {["Project Alpha", "Project Beta", "Project Plan"].map((item, i) => (
              <div
                key={item}
                className={`px-3 py-1.5 text-[11px] ${
                  i === 0
                    ? "bg-[#8b5cf6]/15 text-[#e4e4e7]"
                    : "text-[#a1a1aa]"
                }`}
              >
                {item}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </DemoCard>
  );
}

/* ========== 3. Ghost Connections ========== */

export function GhostConnectionsDemo() {
  const { ref, inView } = useInView();
  const connections = [
    { type: "semantic", color: "#8b5cf6", label: "Semantic", from: "Meeting Notes", to: "Q3 Review" },
    { type: "content", color: "#3b82f6", label: "Content", from: "AI Research", to: "Project Plan" },
    { type: "tags", color: "#22d3ee", label: "Tags", from: "Weekly Plan", to: "Meeting Notes" },
  ];

  return (
    <DemoCard>
      <motion.div
        ref={ref}
        className="flex flex-col gap-2"
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={staggerContainer}
      >
        {connections.map((c) => (
          <motion.div
            key={c.type}
            className="flex items-center gap-2 bg-[#1c1c1f] border border-[#27272a] rounded-lg px-3 py-2"
            variants={fadeUp}
            transition={{ duration: 0.4 }}
          >
            <span className="text-[11px] text-[#a1a1aa] min-w-[80px] sm:min-w-[100px] truncate">{c.from}</span>
            <div className="flex-1 flex items-center gap-1.5 justify-center">
              <div className="h-px flex-1 max-w-[40px]" style={{ background: c.color, opacity: 0.4 }} />
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                style={{ color: c.color, background: `${c.color}15`, border: `1px solid ${c.color}30` }}
              >
                {c.label}
              </span>
              <div className="h-px flex-1 max-w-[40px]" style={{ background: c.color, opacity: 0.4 }} />
            </div>
            <span className="text-[11px] text-[#a1a1aa] min-w-[80px] sm:min-w-[100px] truncate text-right">{c.to}</span>
          </motion.div>
        ))}
      </motion.div>
    </DemoCard>
  );
}

/* ========== 4. Knowledge Graph ========== */

const GRAPH_NODES = [
  { x: 50, y: 30, label: "AI Memory", color: "#8b5cf6", size: 24 },
  { x: 20, y: 55, label: "Notes", color: "#3b82f6", size: 20 },
  { x: 80, y: 55, label: "Projects", color: "#22c55e", size: 20 },
  { x: 35, y: 80, label: "Research", color: "#eab308", size: 16 },
  { x: 65, y: 80, label: "Ideas", color: "#ef4444", size: 16 },
  { x: 50, y: 60, label: "Wiki", color: "#22d3ee", size: 18 },
];

const GRAPH_EDGES = [
  [0, 1], [0, 2], [0, 5], [1, 3], [1, 5], [2, 4], [2, 5], [3, 4],
];

export function KnowledgeGraphDemo() {
  const { ref, inView } = useInView();

  return (
    <DemoCard>
      <div ref={ref} className="relative h-[160px] sm:h-[200px]">
        {/* Edges */}
        <svg className="absolute inset-0 w-full h-full">
          {GRAPH_EDGES.map(([a, b], i) => (
            <motion.line
              key={i}
              x1={`${GRAPH_NODES[a].x}%`} y1={`${GRAPH_NODES[a].y}%`}
              x2={`${GRAPH_NODES[b].x}%`} y2={`${GRAPH_NODES[b].y}%`}
              stroke="#27272a"
              strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.06 }}
            />
          ))}
        </svg>
        {/* Nodes */}
        {GRAPH_NODES.map((node, i) => (
          <motion.div
            key={node.label}
            className="absolute flex flex-col items-center"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: i * 0.1,
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: node.size,
                height: node.size,
                background: `${node.color}25`,
                border: `1.5px solid ${node.color}`,
                boxShadow: `0 0 8px ${node.color}20`,
              }}
            />
            <span className="text-[8px] sm:text-[9px] text-[#71717a] mt-0.5 whitespace-nowrap">{node.label}</span>
          </motion.div>
        ))}
      </div>
    </DemoCard>
  );
}

/* ========== 5. Memory Rollback ========== */

export function MemoryRollbackDemo() {
  const { ref, inView } = useInView();
  const [pos, setPos] = useState(100);
  const [content, setContent] = useState("AI features are the top Q4 priority. Budget approved for 3 new hires.");

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => {
      setPos(25);
      setTimeout(() => setContent("Q3 goals under review. No budget decisions yet."), 800);
    }, 800);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <DemoCard>
      <div ref={ref} className="flex flex-col gap-3">
        {/* Memory card */}
        <div className="bg-[#1c1c1f] border border-[#27272a] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center text-[7px]">🧠</span>
            <span className="text-[9px] text-[#8b5cf6] font-medium">Memory State</span>
            <span className="text-[9px] text-[#71717a] ml-auto">{pos > 50 ? "Current" : "3 days ago"}</span>
          </div>
          <p className="text-[11px] text-[#a1a1aa] leading-relaxed transition-opacity duration-300">
            {content}
          </p>
        </div>
        {/* Timeline */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#71717a]">Past</span>
          <div className="flex-1 h-1.5 rounded-full bg-[#27272a] relative">
            {[10, 30, 50, 70, 90].map((p) => (
              <div
                key={p}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#3f3f46]"
                style={{ left: `${p}%` }}
              />
            ))}
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full bg-[#8b5cf6] shadow-md"
              style={{ left: `${pos}%`, transform: "translate(-50%, -50%)", transition: "left 1.5s ease-in-out" }}
            />
          </div>
          <span className="text-[9px] text-[#71717a]">Now</span>
        </div>
      </div>
    </DemoCard>
  );
}

/* ========== 6. Cortex Insights ========== */

export function CortexInsightsDemo() {
  const { ref, inView } = useInView();
  const tags = [
    { label: "AI Strategy", color: "#8b5cf6" },
    { label: "Product Roadmap", color: "#3b82f6" },
    { label: "Team Growth", color: "#22c55e" },
    { label: "Q4 Planning", color: "#eab308" },
  ];

  return (
    <DemoCard>
      <div ref={ref} className="flex flex-col items-center justify-center h-full gap-4">
        {/* Floating tags */}
        <motion.div
          className="flex flex-wrap justify-center gap-2"
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={staggerContainer}
        >
          {tags.map((tag, i) => (
            <motion.span
              key={tag.label}
              className="px-3 py-1 text-[11px] rounded-full font-medium"
              style={{
                color: tag.color,
                background: `${tag.color}12`,
                border: `1px solid ${tag.color}30`,
              }}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.4,
                  },
                },
              }}
              animate={inView ? {
                y: [0, -3, 0],
                transition: {
                  y: {
                    duration: 3,
                    ease: "easeInOut",
                    repeat: Infinity,
                    delay: 0.8 + i * 0.2,
                  },
                },
              } : undefined}
            >
              {tag.label}
            </motion.span>
          ))}
        </motion.div>
        {/* Document outline */}
        <div className="w-full max-w-[200px]">
          <div className="bg-[#1c1c1f] border border-[#27272a] rounded-lg p-2.5">
            <div className="h-1.5 w-16 rounded bg-[#3f3f46] mb-1.5" />
            <div className="h-1 w-full rounded bg-[#27272a] mb-1" />
            <div className="h-1 w-full rounded bg-[#27272a] mb-1" />
            <div className="h-1 w-3/4 rounded bg-[#27272a]" />
          </div>
          <p className="text-[9px] text-[#71717a] text-center mt-1.5">Emerging themes from 47 notes</p>
        </div>
      </div>
    </DemoCard>
  );
}

/* ========== 7. BYOK ========== */

export function BYOKDemo() {
  const { ref, inView } = useInView();
  const providers = ["OpenAI", "Anthropic", "DeepSeek", "Ollama", "Gemini"];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % providers.length), 1800);
    return () => clearInterval(t);
  }, [inView, providers.length]);

  return (
    <DemoCard>
      <div ref={ref} className="flex flex-col gap-3">
        <div className="bg-[#161618] rounded-lg p-3 border border-[#27272a]">
          <label className="text-[9px] text-[#71717a] uppercase tracking-wider font-medium block mb-1.5">
            AI Provider
          </label>
          <div className="bg-[#0f0f0f] border border-[#27272a] rounded-md px-3 py-1.5 flex items-center justify-between">
            <span className="text-[12px] text-[#e4e4e7] transition-all duration-300">
              {providers[activeIdx]}
            </span>
            <span className="text-[10px] text-[#71717a]">▼</span>
          </div>
        </div>
        <div className="bg-[#161618] rounded-lg p-3 border border-[#27272a]">
          <label className="text-[9px] text-[#71717a] uppercase tracking-wider font-medium block mb-1.5">
            API Key
          </label>
          <div className="bg-[#0f0f0f] border border-[#27272a] rounded-md px-3 py-1.5">
            <span className="text-[12px] text-[#71717a] font-[var(--font-geist-mono),monospace]">
              sk-...••••••••••••
            </span>
          </div>
          <p className="text-[8px] text-[#71717a] mt-1.5">Stored in your browser only — never sent to our servers.</p>
        </div>
      </div>
    </DemoCard>
  );
}

/* ========== 8. Local-First ========== */

export function LocalFirstDemo() {
  const { ref, inView } = useInView();
  const files = [
    { name: "SecondBrain/", type: "folder" as const, indent: 0 },
    { name: "meeting-notes.md", type: "file" as const, indent: 1 },
    { name: "project-ideas.md", type: "file" as const, indent: 1 },
    { name: "research/", type: "folder" as const, indent: 1 },
    { name: "ai-memory.md", type: "file" as const, indent: 2 },
    { name: "weekly-plan.md", type: "file" as const, indent: 1 },
  ];

  return (
    <DemoCard>
      <div ref={ref}>
        <div className="bg-[#161618] rounded-lg p-3 border border-[#27272a] font-[var(--font-geist-mono),monospace]">
          <p className="text-[10px] text-[#71717a] mb-2">~/SecondBrain/</p>
          <motion.div
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {files.map((f) => (
              <motion.div
                key={f.name}
                className="flex items-center gap-1.5 py-0.5"
                style={{ paddingLeft: `${f.indent * 16}px` }}
                variants={fadeUp}
                transition={{ duration: 0.3 }}
              >
                <span className="text-[10px]">{f.type === "folder" ? "📁" : "📄"}</span>
                <span className={`text-[11px] ${f.type === "folder" ? "text-[#e4e4e7]" : "text-[#a1a1aa]"}`}>
                  {f.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <p className="text-[9px] text-[#71717a] text-center mt-2">
          Plain markdown files. Open in any editor.
        </p>
      </div>
    </DemoCard>
  );
}

/* ========== 9. Cloud Sync ========== */

export function CloudSyncDemo() {
  const { ref, inView } = useInView();

  return (
    <DemoCard>
      <div ref={ref} className="flex items-center justify-center gap-4 sm:gap-8 h-full">
        {/* Device 1 — Laptop */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-16 sm:w-20 h-10 sm:h-12 rounded-md border border-[#27272a] bg-[#161618] flex items-center justify-center">
            <span className="text-[18px] sm:text-[22px]">💻</span>
          </div>
          <span className="text-[9px] text-[#71717a]">Desktop</span>
        </div>
        {/* Sync arrows */}
        <div className="flex flex-col items-center gap-0.5">
          <div className={`text-[#8b5cf6] text-sm ${inView ? "demo-sync-pulse" : ""}`}>→</div>
          <div className={`text-[#8b5cf6] text-[9px] font-medium ${inView ? "demo-sync-pulse" : ""}`} style={inView ? { animationDelay: "500ms" } : undefined}>
            sync
          </div>
          <div className={`text-[#8b5cf6] text-sm ${inView ? "demo-sync-pulse" : ""}`} style={inView ? { animationDelay: "1000ms" } : undefined}>←</div>
        </div>
        {/* Device 2 — Phone */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 sm:w-12 h-14 sm:h-16 rounded-lg border border-[#27272a] bg-[#161618] flex items-center justify-center">
            <span className="text-[18px] sm:text-[22px]">📱</span>
          </div>
          <span className="text-[9px] text-[#71717a]">Mobile</span>
        </div>
      </div>
    </DemoCard>
  );
}

/* ========== 10. Writing Tools ========== */

export function WritingToolsDemo() {
  const { ref, inView } = useInView();
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setShowResult(true), 1500);
    return () => clearTimeout(t);
  }, [inView]);

  return (
    <DemoCard>
      <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full">
        {/* Raw input */}
        <div className="bg-[#161618] rounded-lg p-2.5 border border-[#27272a] relative overflow-hidden">
          <p className="text-[9px] text-[#eab308] font-medium mb-1.5">Brain Dump</p>
          <p className="text-[10px] text-[#a1a1aa] leading-relaxed font-[var(--font-geist-mono),monospace]">
            need to ship ai memory by eol. team says 3 wks. also look into ollama perf issues. maybe hire someone for infra?
          </p>
          {inView && !showResult && <div className="absolute inset-0 demo-shimmer" />}
        </div>
        {/* Formatted output */}
        {showResult && (
          <motion.div
            className="bg-[#161618] rounded-lg p-2.5 border border-[#27272a]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[9px] text-[#22c55e] font-medium mb-1.5">Structured Note</p>
            <div className="text-[10px] text-[#a1a1aa] leading-relaxed font-[var(--font-geist-mono),monospace]">
              <p className="text-[#e4e4e7] font-medium mb-0.5"># Q4 Action Items</p>
              <p>• Ship AI memory — 3 week estimate</p>
              <p>• Investigate Ollama performance</p>
              <p>• Evaluate infra hire</p>
            </div>
          </motion.div>
        )}
        {!showResult && (
          <div className="bg-[#161618] rounded-lg p-2.5 border border-[#27272a] opacity-0" />
        )}
      </div>
    </DemoCard>
  );
}

/* ========== 11. Voice Capture ========== */

export function VoiceCaptureDemo() {
  const { ref, inView } = useInView();
  const [phase, setPhase] = useState<"idle" | "recording" | "transcribing" | "done">("idle");

  useEffect(() => {
    if (!inView) return;
    const t1 = setTimeout(() => setPhase("recording"), 400);
    const t2 = setTimeout(() => setPhase("transcribing"), 2800);
    const t3 = setTimeout(() => setPhase("done"), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [inView]);

  return (
    <DemoCard>
      <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 gap-3 h-full">
        {/* Left — Recording UI */}
        <div className="bg-[#161618] rounded-lg p-3 border border-[#27272a]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] text-[#71717a] font-medium">Voice Capture</p>
            {phase === "recording" && (
              <span className="flex items-center gap-1 text-[9px] text-[#ef4444] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] demo-sync-pulse" />
                REC 0:42
              </span>
            )}
            {phase === "transcribing" && (
              <span className="text-[9px] text-[#eab308] font-medium">Transcribing...</span>
            )}
            {phase === "done" && (
              <span className="text-[9px] text-[#22c55e] font-medium">Done</span>
            )}
          </div>
          {/* Waveform */}
          <div className="flex items-center justify-center gap-[2px] h-12 mb-2">
            {Array.from({ length: 32 }).map((_, i) => {
              const height = phase === "recording"
                ? 8 + Math.sin(i * 0.7) * 16 + ((i * 17) % 12)
                : phase === "idle" ? 4 : 6;
              return (
                <div
                  key={i}
                  className={`w-[3px] rounded-full transition-all duration-300 ${
                    phase === "recording" ? "bg-[#ef4444]/60" :
                    phase === "transcribing" ? "bg-[#eab308]/40" :
                    phase === "done" ? "bg-[#22c55e]/40" : "bg-[#27272a]"
                  }`}
                  style={{ height: `${Math.max(4, height)}px` }}
                />
              );
            })}
          </div>
          <p className="text-[9px] text-[#71717a] text-center">
            {phase === "idle" ? "Click to record" :
             phase === "recording" ? "Listening via microphone..." :
             phase === "transcribing" ? "Processing with Whisper..." :
             "Transcript ready"}
          </p>
        </div>
        {/* Right — Structured output */}
        {phase === "done" ? (
          <motion.div
            className="bg-[#161618] rounded-lg p-3 border border-[#27272a]"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-[9px] text-[#22c55e] font-medium mb-2">Structured Note</p>
            <div className="text-[10px] text-[#a1a1aa] leading-relaxed font-[var(--font-geist-mono),monospace]">
              <p className="text-[#e4e4e7] font-medium mb-1"># Team Standup — Mar 17</p>
              <p className="mb-0.5">## Decisions</p>
              <p>• Ship voice capture this week</p>
              <p>• Move to emerald CTA buttons</p>
              <p className="mt-1 mb-0.5">## Action Items</p>
              <p>• @blake — update features page</p>
              <p>• Review PR before EOD</p>
            </div>
          </motion.div>
        ) : (
          <div className="bg-[#161618] rounded-lg p-3 border border-[#27272a] opacity-0" />
        )}
      </div>
    </DemoCard>
  );
}

/* ========== 12. Open Source ========== */

export function OpenSourceDemo() {
  const { ref, inView } = useInView();
  const lines = [
    { prompt: "$ ", cmd: "git clone novyxlabs/novyx-vault" },
    { prompt: "$ ", cmd: "cd novyx-vault" },
    { prompt: "$ ", cmd: "npm install && npm run dev" },
    { prompt: "> ", cmd: "Ready on localhost:3000", isOutput: true },
  ];
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (visibleLines >= lines.length) return;
    const t = setTimeout(() => setVisibleLines((n) => n + 1), 600);
    return () => clearTimeout(t);
  }, [inView, visibleLines, lines.length]);

  return (
    <DemoCard>
      <div ref={ref} className="bg-[#0a0a0b] rounded-lg p-3 border border-[#27272a] font-[var(--font-geist-mono),monospace]">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]/60" />
          <span className="w-2 h-2 rounded-full bg-[#eab308]/60" />
          <span className="w-2 h-2 rounded-full bg-[#22c55e]/60" />
          <span className="text-[9px] text-[#71717a] ml-1">Terminal</span>
        </div>
        {lines.slice(0, visibleLines).map((line, i) => (
          <motion.div
            key={i}
            className="mb-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span className={`text-[11px] ${line.isOutput ? "text-[#22c55e]" : "text-[#22c55e]/70"}`}>
              {line.prompt}
            </span>
            <span className={`text-[11px] ${line.isOutput ? "text-[#22c55e]" : "text-[#e4e4e7]"}`}>
              {line.cmd}
            </span>
          </motion.div>
        ))}
        {inView && visibleLines < lines.length && (
          <span className="hero-cursor" />
        )}
      </div>
    </DemoCard>
  );
}
