"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import remarkWikiLinks from "@/lib/remarkWikiLinks";
import remarkTags from "@/lib/remarkTags";
import { parseFrontmatter } from "@/lib/frontmatter";
import type { ComponentPropsWithoutRef } from "react";

interface PreviewProps {
  content: string;
  onNavigateWikiLink?: (linkText: string) => void;
  onToggleCheckbox?: (checkboxIndex: number) => void;
}

interface HoverCard {
  linkText: string;
  snippet: string;
  x: number;
  y: number;
}

const previewCache = new Map<string, string>();

function WikiLink({
  children,
  wikiLink,
  onNavigate,
  onHoverStart,
  onHoverEnd,
}: {
  children: React.ReactNode;
  wikiLink: string;
  onNavigate: (link: string) => void;
  onHoverStart: (link: string, rect: DOMRect) => void;
  onHoverEnd: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <a
      ref={ref}
      href="#"
      className="wiki-link"
      onClick={(e) => {
        e.preventDefault();
        onNavigate(wikiLink);
      }}
      onMouseEnter={() => {
        if (ref.current) {
          onHoverStart(wikiLink, ref.current.getBoundingClientRect());
        }
      }}
      onMouseLeave={onHoverEnd}
    >
      {children}
    </a>
  );
}

function NoteEmbed({ noteName, onNavigate }: { noteName: string; onNavigate?: (link: string) => void }) {
  const [embedContent, setEmbedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/notes/search?q=${encodeURIComponent(noteName)}`);
        const data = await res.json();
        const match = (data.results || []).find(
          (r: { name: string }) => r.name.toLowerCase() === noteName.toLowerCase()
        );
        if (match && !cancelled) {
          const noteRes = await fetch(`/api/notes?path=${encodeURIComponent(match.path)}`);
          const noteData = await noteRes.json();
          if (noteData.content && !cancelled) {
            setEmbedContent(noteData.content);
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [noteName]);

  return (
    <div className="my-3 border-l-2 border-accent/40 bg-accent/5 rounded-r-lg px-4 py-3">
      <button
        onClick={() => onNavigate?.(noteName)}
        className="text-xs font-medium text-accent hover:underline mb-2 block"
      >
        {noteName}
      </button>
      {loading ? (
        <p className="text-xs text-muted animate-pulse">Loading...</p>
      ) : embedContent ? (
        <div className="text-sm prose-sm">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {embedContent}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-xs text-muted">Note not found</p>
      )}
    </div>
  );
}

export default function Preview({ content, onNavigateWikiLink, onToggleCheckbox }: PreviewProps) {
  const checkboxCounter = useRef(0);
  // Strip frontmatter from preview display
  const displayContent = parseFrontmatter(content).body;
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPreview = useCallback(async (linkText: string, rect: DOMRect) => {
    // Clear any pending leave
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }

    // Debounce hover
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(async () => {
      // Check cache
      if (previewCache.has(linkText)) {
        setHoverCard({ linkText, snippet: previewCache.get(linkText)!, x: rect.left, y: rect.bottom });
        return;
      }

      try {
        // Search for the note by name
        const searchRes = await fetch(`/api/notes/search?q=${encodeURIComponent(linkText)}`);
        const searchData = await searchRes.json();
        const match = (searchData.results || []).find(
          (r: { name: string }) => r.name.toLowerCase() === linkText.toLowerCase()
        );

        if (match) {
          const noteRes = await fetch(`/api/notes?path=${encodeURIComponent(match.path)}`);
          const noteData = await noteRes.json();
          if (noteData.content) {
            // Strip markdown headings and get first ~200 chars
            const clean = noteData.content
              .replace(/^#{1,6}\s+/gm, "")
              .replace(/[*_`\[\]]/g, "")
              .trim()
              .slice(0, 200);
            const snippet = clean + (noteData.content.length > 200 ? "..." : "");
            previewCache.set(linkText, snippet);
            setHoverCard({ linkText, snippet, x: rect.left, y: rect.bottom });
          }
        }
      } catch {
        // Silently fail
      }
    }, 300);
  }, []);

  const handleHoverEnd = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    leaveTimeout.current = setTimeout(() => {
      setHoverCard(null);
    }, 200);
  }, []);

  // Reset checkbox counter on each render
  checkboxCounter.current = 0;

  if (!displayContent.trim()) {
    return (
      <div className="h-full flex items-center justify-center text-muted text-sm">
        Nothing to preview
      </div>
    );
  }

  // Split content into text segments and transclusions
  const TRANSCLUSION_RE = /^!\[\[([^\]]+)\]\]$/gm;
  const segments: { type: "text" | "embed"; value: string }[] = [];
  let lastIndex = 0;
  let match;
  while ((match = TRANSCLUSION_RE.exec(displayContent)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: displayContent.slice(lastIndex, match.index) });
    }
    segments.push({ type: "embed", value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < displayContent.length) {
    segments.push({ type: "text", value: displayContent.slice(lastIndex) });
  }

  const markdownComponents = {
    input: ({ type, checked, ...props }: ComponentPropsWithoutRef<"input">) => {
      if (type === "checkbox") {
        const idx = checkboxCounter.current++;
        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleCheckbox?.(idx)}
            className="cursor-pointer accent-accent"
            {...props}
          />
        );
      }
      return <input type={type} checked={checked} {...props} />;
    },
    a: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => {
      const wikiLink = (props as Record<string, unknown>)["data-wiki-link"] as string | undefined;
      if (wikiLink && onNavigateWikiLink) {
        return (
          <WikiLink
            wikiLink={wikiLink}
            onNavigate={onNavigateWikiLink}
            onHoverStart={fetchPreview}
            onHoverEnd={handleHoverEnd}
          >
            {children}
          </WikiLink>
        );
      }
      return <a href={href} {...props}>{children}</a>;
    },
  };

  return (
    <div className="h-full overflow-y-auto p-8 relative">
      <div className="markdown-preview max-w-3xl mx-auto">
        {segments.map((seg, i) =>
          seg.type === "embed" ? (
            <NoteEmbed key={`embed-${i}`} noteName={seg.value} onNavigate={onNavigateWikiLink} />
          ) : (
            <ReactMarkdown
              key={`text-${i}`}
              remarkPlugins={[remarkGfm, remarkWikiLinks, remarkTags]}
              rehypePlugins={[rehypeRaw]}
              components={markdownComponents}
            >
              {seg.value}
            </ReactMarkdown>
          )
        )}
      </div>

      {/* Hover preview card */}
      {hoverCard && (
        <div
          className="fixed z-50 w-72 bg-card-bg border border-sidebar-border rounded-lg shadow-xl p-3 pointer-events-none"
          style={{
            left: Math.min(hoverCard.x, window.innerWidth - 300),
            top: hoverCard.y + 8,
          }}
          onMouseEnter={() => {
            if (leaveTimeout.current) {
              clearTimeout(leaveTimeout.current);
              leaveTimeout.current = null;
            }
          }}
          onMouseLeave={handleHoverEnd}
        >
          <p className="text-xs font-medium text-accent mb-1.5">{hoverCard.linkText}</p>
          <p className="text-[11px] text-muted leading-relaxed">{hoverCard.snippet}</p>
        </div>
      )}
    </div>
  );
}
