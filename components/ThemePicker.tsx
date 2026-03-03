"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Palette, Check, X } from "lucide-react";
import { syncSettingsToCloud } from "@/lib/providers";

interface AccentPreset {
  name: string;
  color: string;
  hover: string;
  rgb: string;
}

const presets: AccentPreset[] = [
  { name: "Violet", color: "#8b5cf6", hover: "#7c3aed", rgb: "139, 92, 246" },
  { name: "Blue", color: "#3b82f6", hover: "#2563eb", rgb: "59, 130, 246" },
  { name: "Cyan", color: "#06b6d4", hover: "#0891b2", rgb: "6, 182, 212" },
  { name: "Emerald", color: "#10b981", hover: "#059669", rgb: "16, 185, 129" },
  { name: "Amber", color: "#f59e0b", hover: "#d97706", rgb: "245, 158, 11" },
  { name: "Orange", color: "#f97316", hover: "#ea580c", rgb: "249, 115, 22" },
  { name: "Rose", color: "#f43f5e", hover: "#e11d48", rgb: "244, 63, 94" },
  { name: "Pink", color: "#ec4899", hover: "#db2777", rgb: "236, 72, 153" },
  { name: "Indigo", color: "#6366f1", hover: "#4f46e5", rgb: "99, 102, 241" },
  { name: "Teal", color: "#14b8a6", hover: "#0d9488", rgb: "20, 184, 166" },
];

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "139, 92, 246";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function darkenHex(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = Math.max(0, parseInt(result[1], 16) - 20);
  const g = Math.max(0, parseInt(result[2], 16) - 20);
  const b = Math.max(0, parseInt(result[3], 16) - 20);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function applyAccent(color: string, hover: string, rgb: string) {
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-hover", hover);
  document.documentElement.style.setProperty("--accent-rgb", rgb);
}

export function initAccentColor() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem("noctivault-accent");
  if (!saved) return;
  try {
    const { color, hover, rgb } = JSON.parse(saved);
    applyAccent(color, hover, rgb);
  } catch {
    // ignore
  }
}

export default function ThemePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<string>("#8b5cf6");
  const [customColor, setCustomColor] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const saved = localStorage.getItem("noctivault-accent");
    if (saved) {
      try {
        const { color } = JSON.parse(saved);
        setCurrent(color);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top - 8, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  const selectPreset = (preset: AccentPreset) => {
    setCurrent(preset.color);
    applyAccent(preset.color, preset.hover, preset.rgb);
    localStorage.setItem("noctivault-accent", JSON.stringify({
      color: preset.color,
      hover: preset.hover,
      rgb: preset.rgb,
    }));
    syncSettingsToCloud().catch(() => {});
  };

  const applyCustom = () => {
    if (!/^#[0-9a-fA-F]{6}$/.test(customColor)) return;
    const rgb = hexToRgb(customColor);
    const hover = darkenHex(customColor);
    setCurrent(customColor);
    applyAccent(customColor, hover, rgb);
    localStorage.setItem("noctivault-accent", JSON.stringify({
      color: customColor,
      hover,
      rgb,
    }));
    syncSettingsToCloud().catch(() => {});
    setCustomColor("");
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className="p-1 rounded text-muted hover:text-foreground transition-colors"
        title="Accent color"
      >
        <Palette size={14} />
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          className="fixed w-56 bg-sidebar-bg border border-sidebar-border rounded-xl shadow-2xl p-3 z-[100]"
          style={{ top: pos.top, left: pos.left, transform: "translateY(-100%)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground">Accent Color</span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 rounded text-muted hover:text-foreground transition-colors"
            >
              <X size={12} />
            </button>
          </div>

          {/* Preset grid */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => selectPreset(preset)}
                className="relative w-8 h-8 rounded-lg border-2 transition-colors"
                style={{
                  backgroundColor: preset.color,
                  borderColor: current === preset.color ? "var(--foreground)" : "transparent",
                }}
                title={preset.name}
              >
                {current === preset.color && (
                  <Check size={14} className="absolute inset-0 m-auto text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>

          {/* Custom color */}
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={customColor || current}
              onChange={(e) => setCustomColor(e.target.value)}
              className="w-8 h-8 rounded-md border border-sidebar-border cursor-pointer bg-transparent p-0 shrink-0"
              title="Pick custom color"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#hex"
              className="flex-1 min-w-0 bg-muted-bg border-none rounded-md py-1 px-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent font-mono"
            />
            <button
              onClick={applyCustom}
              disabled={!/^#[0-9a-fA-F]{6}$/.test(customColor)}
              className="px-2 py-1 text-xs rounded-md bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              Set
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
