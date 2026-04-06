"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Share2,
  Globe,
  Twitter,
  Linkedin,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Link2,
  FileText,
  Code2,
  X,
  Send,
  Newspaper,
} from "lucide-react";
import { formatInlineMarkdown } from "@/lib/sanitize";

interface ShareMenuProps {
  notePath: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

type SharePanel = null | "publish" | "x-thread" | "linkedin" | "hn" | "newsletter";

export default function ShareMenu({ notePath, content, isOpen, onClose, anchorRef }: ShareMenuProps) {
  const [panel, setPanel] = useState<SharePanel>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [slug, setSlug] = useState("");
  const [publishUrl, setPublishUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Share format states
  const [tweets, setTweets] = useState<string[]>([]);
  const [linkedInPost, setLinkedInPost] = useState("");
  const [linkedInHashtags, setLinkedInHashtags] = useState<string[]>([]);
  const [newsletter, setNewsletter] = useState<{ title: string; subtitle: string; html: string } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const noteName = notePath.split("/").pop()?.replace(/\.md$/, "") || "Untitled";

  // Load publish status when opened
  useEffect(() => {
    if (!isOpen) {
      setPanel(null);
      setError("");
      setCopied(false);
      return;
    }
    fetch(`/api/notes/publish?path=${encodeURIComponent(notePath)}`)
      .then((r) => r.json())
      .then((data) => {
        setIsPublished(data.isPublished ?? false);
        setSlug(data.slug ?? "");
        if (data.isPublished && data.slug) {
          setPublishUrl(`${window.location.origin}/p/${data.slug}`);
        }
      })
      .catch(() => {});
  }, [isOpen, notePath]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose, anchorRef]);

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const renderSafeHtml = useCallback((markdown: string) => {
    const lines = markdown.replace(/^---\n[\s\S]*?\n---\n?/, "").split("\n");
    const htmlLines: string[] = [];
    let inUl = false;
    let inOl = false;

    const closeLists = () => {
      if (inUl) {
        htmlLines.push("</ul>");
        inUl = false;
      }
      if (inOl) {
        htmlLines.push("</ol>");
        inOl = false;
      }
    };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headingMatch) {
        closeLists();
        const level = headingMatch[1].length;
        htmlLines.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      } else if (line.match(/^[-*]\s/)) {
        if (!inUl) {
          closeLists();
          htmlLines.push("<ul>");
          inUl = true;
        }
        htmlLines.push(`<li>${formatInlineMarkdown(line.replace(/^[-*]\s/, ""))}</li>`);
      } else if (line.match(/^\d+\.\s/)) {
        if (!inOl) {
          closeLists();
          htmlLines.push("<ol>");
          inOl = true;
        }
        htmlLines.push(`<li>${formatInlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li>`);
      } else if (line.startsWith("> ")) {
        closeLists();
        htmlLines.push(`<blockquote>${formatInlineMarkdown(line.slice(2))}</blockquote>`);
      } else if (line.trim()) {
        closeLists();
        htmlLines.push(`<p>${formatInlineMarkdown(line)}</p>`);
      } else {
        closeLists();
      }
    }

    closeLists();
    return htmlLines.join("\n");
  }, []);

  const handlePublish = async (publish: boolean) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notes/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: notePath, publish, slug: slug || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsPublished(data.isPublished);
      setSlug(data.slug ?? "");
      setPublishUrl(data.url ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchFormat = async (format: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/notes/share/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: notePath, format }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const openXThread = async () => {
    setPanel("x-thread");
    const result = await fetchFormat("x-thread");
    if (result) setTweets(result.tweets);
  };

  const openLinkedIn = async () => {
    setPanel("linkedin");
    const result = await fetchFormat("linkedin");
    if (result) {
      setLinkedInPost(result.post);
      setLinkedInHashtags(result.hashtags);
    }
  };

  const openNewsletter = async () => {
    setPanel("newsletter");
    const result = await fetchFormat("newsletter");
    if (result) setNewsletter(result);
  };

  const openHN = () => {
    if (!isPublished) {
      setPanel("hn");
      return;
    }
    window.open(
      `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(publishUrl)}&t=${encodeURIComponent(noteName)}`,
      "_blank"
    );
  };

  if (!isOpen) return null;

  const menuItems = [
    { id: "publish", label: isPublished ? "Published" : "Publish", icon: <Globe size={14} />, badge: isPublished ? "Live" : undefined, action: () => setPanel("publish") },
    { id: "divider-1" },
    { id: "x", label: "Post to X", icon: <Twitter size={14} />, action: openXThread },
    { id: "linkedin", label: "Post to LinkedIn", icon: <Linkedin size={14} />, action: openLinkedIn },
    { id: "hn", label: "Submit to HN", icon: <ExternalLink size={14} />, action: openHN },
    { id: "newsletter", label: "Export to Newsletter", icon: <Newspaper size={14} />, action: openNewsletter },
    { id: "divider-2" },
    { id: "copy-md", label: "Copy as Markdown", icon: <FileText size={14} />, action: () => copyToClipboard(content) },
    { id: "copy-html", label: "Copy as HTML", icon: <Code2 size={14} />, action: () => copyToClipboard(renderSafeHtml(content)) },
  ];

  // Main menu or panel
  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 w-64 bg-sidebar-bg border border-sidebar-border rounded-lg shadow-xl overflow-hidden"
    >
      {!panel && (
        <div className="py-1">
          {menuItems.map((item) =>
            item.id.startsWith("divider") ? (
              <div key={item.id} className="border-t border-sidebar-border my-1" />
            ) : (
              <button
                key={item.id}
                onClick={item.action}
                className="flex items-center gap-3 w-full px-3 py-2 text-sm text-muted hover:bg-muted-bg hover:text-foreground transition-colors"
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">
                    {item.badge}
                  </span>
                )}
                {(item.id === "copy-md" || item.id === "copy-html") && copied && (
                  <Check size={12} className="text-green-400" />
                )}
              </button>
            )
          )}
        </div>
      )}

      {/* Publish Panel */}
      {panel === "publish" && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Publish</h3>
            <button onClick={() => setPanel(null)} className="p-1 text-muted hover:text-foreground">
              <X size={12} />
            </button>
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Slug</label>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-muted/50">/p/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder={noteName.toLowerCase().replace(/\s+/g, "-")}
                className="flex-1 px-2 py-1.5 text-xs bg-background border border-sidebar-border rounded text-foreground outline-none focus:border-accent"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center gap-2">
            {isPublished ? (
              <>
                <button
                  onClick={() => handlePublish(false)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Unpublish
                </button>
                <button
                  onClick={() => copyToClipboard(publishUrl)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                >
                  {copied ? <Check size={10} /> : <Link2 size={10} />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </>
            ) : (
              <button
                onClick={() => handlePublish(true)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 size={10} className="animate-spin" /> : <Globe size={10} />}
                Publish
              </button>
            )}
          </div>
          {isPublished && publishUrl && (
            <a
              href={publishUrl}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-1 text-[11px] text-accent hover:underline"
            >
              <ExternalLink size={10} />
              {publishUrl}
            </a>
          )}
        </div>
      )}

      {/* X Thread Panel */}
      {panel === "x-thread" && (
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">X Thread Preview</h3>
            <button onClick={() => setPanel(null)} className="p-1 text-muted hover:text-foreground">
              <X size={12} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted" /></div>
          ) : error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : (
            <>
              <div className="space-y-2">
                {tweets.map((tweet, i) => (
                  <div key={i} className="p-2 rounded bg-background border border-sidebar-border text-xs leading-relaxed">
                    {tweet}
                    <div className="text-[10px] text-muted mt-1">{tweet.length}/280</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweets[0] || "")}`;
                    window.open(url, "_blank");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-accent text-white hover:opacity-90 transition-opacity"
                >
                  <Send size={10} />
                  Post to X
                </button>
                <button
                  onClick={() => copyToClipboard(tweets.join("\n\n---\n\n"))}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-muted-bg text-muted hover:text-foreground transition-colors"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  Copy All
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* LinkedIn Panel */}
      {panel === "linkedin" && (
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">LinkedIn Post</h3>
            <button onClick={() => setPanel(null)} className="p-1 text-muted hover:text-foreground">
              <X size={12} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted" /></div>
          ) : error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : (
            <>
              <div className="p-2 rounded bg-background border border-sidebar-border text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                {linkedInPost}
                {linkedInHashtags.length > 0 && (
                  <div className="mt-2 text-accent">{linkedInHashtags.join(" ")}</div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const full = linkedInPost + (linkedInHashtags.length ? "\n\n" + linkedInHashtags.join(" ") : "");
                    await copyToClipboard(full);
                    window.open("https://www.linkedin.com/feed/?shareActive=true", "_blank");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-accent text-white hover:opacity-90 transition-opacity"
                >
                  <Send size={10} />
                  Copy & Open LinkedIn
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* HN Panel (only shown if not published) */}
      {panel === "hn" && !isPublished && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Submit to HN</h3>
            <button onClick={() => setPanel(null)} className="p-1 text-muted hover:text-foreground">
              <X size={12} />
            </button>
          </div>
          <p className="text-xs text-muted">You need to publish this note first to get a public URL for Hacker News.</p>
          <button
            onClick={() => setPanel("publish")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-accent text-white hover:opacity-90 transition-opacity"
          >
            <Globe size={10} />
            Publish First
          </button>
        </div>
      )}

      {/* Newsletter Panel */}
      {panel === "newsletter" && (
        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Export to Newsletter</h3>
            <button onClick={() => setPanel(null)} className="p-1 text-muted hover:text-foreground">
              <X size={12} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted" /></div>
          ) : error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : newsletter && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-medium text-foreground">{newsletter.title}</p>
                <p className="text-[11px] text-muted italic">{newsletter.subtitle}</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={async () => {
                    await copyToClipboard(newsletter.html);
                    window.open("https://app.beehiiv.com/posts/new", "_blank");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-muted-bg text-foreground hover:bg-accent/10 transition-colors"
                >
                  <Newspaper size={10} />
                  Copy HTML & Open Beehiiv
                </button>
                <button
                  onClick={async () => {
                    await copyToClipboard(newsletter.html);
                    window.open("https://substack.com/publish/post/new", "_blank");
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-muted-bg text-foreground hover:bg-accent/10 transition-colors"
                >
                  <Newspaper size={10} />
                  Copy HTML & Open Substack
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
