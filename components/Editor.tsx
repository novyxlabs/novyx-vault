"use client";

import { useEffect, useRef, useCallback, useState, useImperativeHandle, forwardRef } from "react";
import { EditorView, keymap, placeholder as cmPlaceholder } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { wikiLinkHighlight } from "@/lib/cmWikiLinks";
import { tagHighlight } from "@/lib/cmTags";
import { loadSettings, getActiveProvider } from "@/lib/providers";
import SlashCommandMenu from "./SlashCommandMenu";
import WikiLinkMenu from "./WikiLinkMenu";
import SelectionToolbar from "./SelectionToolbar";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onIngestLink?: () => void;
  onPasteUrl?: (url: string) => void;
  noteTitle?: string;
}

export interface EditorHandle {
  insertText: (text: string, cursorOffset?: number) => void;
  scrollToLine: (line: number) => void;
}

const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({ content, onChange, onIngestLink, onPasteUrl, noteTitle }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onIngestLinkRef = useRef(onIngestLink);
  const onPasteUrlRef = useRef(onPasteUrl);
  onIngestLinkRef.current = onIngestLink;
  onPasteUrlRef.current = onPasteUrl;
  const noteTitleRef = useRef(noteTitle);
  noteTitleRef.current = noteTitle;
  const [aiStreaming, setAiStreaming] = useState(false);
  const aiAbortRef = useRef<AbortController | null>(null);
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean;
    filter: string;
    pos: number;
    top: number;
    left: number;
  }>({ open: false, filter: "", pos: 0, top: 0, left: 0 });
  const [wikiMenu, setWikiMenu] = useState<{
    open: boolean;
    filter: string;
    pos: number;
    top: number;
    left: number;
  }>({ open: false, filter: "", pos: 0, top: 0, left: 0 });
  const [selToolbar, setSelToolbar] = useState<{
    open: boolean;
    from: number;
    to: number;
    top: number;
    left: number;
  }>({ open: false, from: 0, to: 0, top: 0, left: 0 });
  const selDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    insertText(text: string, cursorOffset = 0) {
      const view = viewRef.current;
      if (!view) return;
      const { head } = view.state.selection.main;
      view.dispatch({
        changes: { from: head, insert: text },
        selection: { anchor: head + text.length - cursorOffset },
      });
      view.focus();
    },
    scrollToLine(line: number) {
      const view = viewRef.current;
      if (!view) return;
      const clampedLine = Math.min(line, view.state.doc.lines);
      const lineInfo = view.state.doc.line(clampedLine);
      view.dispatch({
        selection: { anchor: lineInfo.from },
        effects: EditorView.scrollIntoView(lineInfo.from, { y: "start" }),
      });
      view.focus();
    },
  }), []);

  const checkSlashCommand = useCallback((view: EditorView) => {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const lineText = line.text.substring(0, head - line.from);

    // Check if line starts with / followed by optional filter text
    const match = lineText.match(/^\/(\w*)$/);
    if (match) {
      const coords = view.coordsAtPos(head);
      if (coords) {
        setSlashMenu({
          open: true,
          filter: match[1],
          pos: line.from,
          top: coords.bottom + 4,
          left: coords.left,
        });
      }
    } else {
      if (slashMenu.open) {
        setSlashMenu((prev) => ({ ...prev, open: false }));
      }
    }
  }, [slashMenu.open]);

  const checkWikiLink = useCallback((view: EditorView) => {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const textBefore = line.text.substring(0, head - line.from);

    const lastOpen = textBefore.lastIndexOf("[[");
    if (lastOpen === -1) {
      if (wikiMenu.open) setWikiMenu((prev) => ({ ...prev, open: false }));
      return;
    }

    const afterOpen = textBefore.substring(lastOpen + 2);
    if (afterOpen.includes("]]")) {
      if (wikiMenu.open) setWikiMenu((prev) => ({ ...prev, open: false }));
      return;
    }

    const coords = view.coordsAtPos(head);
    if (coords) {
      setWikiMenu({
        open: true,
        filter: afterOpen,
        pos: line.from + lastOpen,
        top: coords.bottom + 4,
        left: coords.left,
      });
    }
  }, [wikiMenu.open]);

  const checkSelection = useCallback((view: EditorView) => {
    const { from, to } = view.state.selection.main;
    if (from === to || aiStreaming) {
      if (selToolbar.open) setSelToolbar((prev) => ({ ...prev, open: false }));
      return;
    }
    // Debounce — only show toolbar after selection settles
    if (selDebounceRef.current) clearTimeout(selDebounceRef.current);
    selDebounceRef.current = setTimeout(() => {
      const v = viewRef.current;
      if (!v) return;
      const { from: f, to: t } = v.state.selection.main;
      if (f === t) return;
      const selectedText = v.state.sliceDoc(f, t);
      if (selectedText.trim().length < 3) return;
      const coords = v.coordsAtPos(f);
      if (coords) {
        setSelToolbar({ open: true, from: f, to: t, top: coords.top, left: coords.left });
      }
    }, 300);
  }, [selToolbar.open, aiStreaming]);

  const handleWikiSelect = useCallback((noteName: string) => {
    const view = viewRef.current;
    if (!view) return;

    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const textBefore = line.text.substring(0, head - line.from);
    const lastOpen = textBefore.lastIndexOf("[[");

    if (lastOpen !== -1) {
      const from = line.from + lastOpen;
      const insert = `[[${noteName}]]`;
      view.dispatch({
        changes: { from, to: head, insert },
        selection: { anchor: from + insert.length },
      });
      view.focus();
    }
    setWikiMenu((prev) => ({ ...prev, open: false }));
  }, []);

  const handleWikiClose = useCallback(() => {
    setWikiMenu((prev) => ({ ...prev, open: false }));
    viewRef.current?.focus();
  }, []);

  const gatherAIContext = useCallback((view: EditorView, command: string): { context: string; replaceFrom: number; replaceTo: number } => {
    const { head } = view.state.selection.main;
    const doc = view.state.doc;
    const currentLine = doc.lineAt(head);

    if (command === "continue") {
      const textBefore = doc.sliceString(Math.max(0, head - 500), head);
      return { context: textBefore, replaceFrom: head, replaceTo: head };
    }

    // Find the paragraph above the current line (which had the /command, now cleared)
    let paraStart = 0;
    let paraEnd = 0;
    let lineNum = currentLine.number - 1;

    // Skip blank lines backward
    while (lineNum >= 1) {
      const line = doc.line(lineNum);
      if (line.text.trim() !== "") {
        paraEnd = line.to;
        break;
      }
      lineNum--;
    }

    if (paraEnd === 0) {
      // No paragraph found above — use surrounding context
      const fallbackFrom = Math.max(0, head - 250);
      const fallbackTo = Math.min(doc.length, head + 250);
      const fallback = doc.sliceString(fallbackFrom, fallbackTo).trim();
      return { context: fallback || "", replaceFrom: head, replaceTo: head };
    }

    // Walk backward to find paragraph start
    paraStart = doc.line(lineNum).from;
    while (lineNum > 1) {
      const prevLine = doc.line(lineNum - 1);
      if (prevLine.text.trim() === "") break;
      paraStart = prevLine.from;
      lineNum--;
    }

    const paraText = doc.sliceString(paraStart, paraEnd);

    if (["rewrite", "fix"].includes(command)) {
      return { context: paraText, replaceFrom: paraStart, replaceTo: paraEnd };
    }
    // expand, brainstorm, summarize: insert after the paragraph
    return { context: paraText, replaceFrom: paraEnd, replaceTo: paraEnd };
  }, []);

  const streamAIResponse = useCallback(async (
    view: EditorView,
    command: string,
    context: string,
    provider: { baseURL: string; apiKey: string; model: string },
    insertFrom: number,
    insertTo: number,
  ) => {
    setAiStreaming(true);

    // Insert loading placeholder
    const placeholder = "\u2728 ...";
    view.dispatch({
      changes: { from: insertFrom, to: insertTo, insert: placeholder },
    });

    const aiInsertStart = insertFrom;
    let aiTextLength = placeholder.length;
    const controller = new AbortController();
    aiAbortRef.current = controller;

    try {
      const res = await fetch("/api/notes/slash-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          context,
          noteTitle: noteTitleRef.current || "Untitled",
          provider: {
            baseURL: provider.baseURL,
            apiKey: provider.apiKey,
            model: provider.model,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Remove placeholder on error
        view.dispatch({
          changes: { from: aiInsertStart, to: aiInsertStart + aiTextLength, insert: "" },
        });
        setAiStreaming(false);
        aiAbortRef.current = null;
        view.focus();
        return;
      }

      // Remove placeholder, start inserting real text
      view.dispatch({
        changes: { from: aiInsertStart, to: aiInsertStart + aiTextLength, insert: "" },
      });
      aiTextLength = 0;

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l: string) => l.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) break;
            if (parsed.text) {
              const insertPos = aiInsertStart + aiTextLength;
              view.dispatch({
                changes: { from: insertPos, insert: parsed.text },
              });
              aiTextLength += parsed.text.length;
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Place cursor at end of inserted text
      const finalPos = aiInsertStart + aiTextLength;
      view.dispatch({ selection: { anchor: finalPos } });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("AI slash command error:", err);
      }
      // On abort or error, remove placeholder if still there
      if (aiTextLength === placeholder.length) {
        const currentDoc = view.state.doc.toString();
        const phIdx = currentDoc.indexOf(placeholder, aiInsertStart);
        if (phIdx !== -1) {
          view.dispatch({
            changes: { from: phIdx, to: phIdx + placeholder.length, insert: "" },
          });
        }
      }
    } finally {
      setAiStreaming(false);
      aiAbortRef.current = null;
      view.focus();
    }
  }, []);

  const handleTransformAction = useCallback((command: string) => {
    const view = viewRef.current;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    if (from === to) return;

    const selectedText = view.state.sliceDoc(from, to);
    setSelToolbar((prev) => ({ ...prev, open: false }));

    const settings = loadSettings();
    const provider = getActiveProvider(settings);
    if (!provider) {
      const warningMsg = "\u26A0 Configure an AI provider in Settings to use AI commands.";
      view.dispatch({ changes: { from: to, insert: "\n" + warningMsg } });
      warningTimerRef.current = setTimeout(() => {
        const v = viewRef.current;
        if (!v) return;
        const docText = v.state.doc.toString();
        const idx = docText.indexOf(warningMsg);
        if (idx !== -1) {
          v.dispatch({ changes: { from: idx - 1, to: idx + warningMsg.length, insert: "" } });
        }
      }, 3000);
      return;
    }

    // All selection transforms replace the selection
    streamAIResponse(view, command, selectedText, provider, from, to);
  }, [streamAIResponse]);

  const handleSlashSelect = useCallback((insert: string, cursorOffset?: number) => {
    const view = viewRef.current;
    if (!view) return;

    // Handle AI sentinels
    if (insert.startsWith("__AI_")) {
      const command = insert.replace("__AI_", "").replace("__", "").toLowerCase();

      // Remove the /command text from the editor
      const { head } = view.state.selection.main;
      const line = view.state.doc.lineAt(head);
      view.dispatch({ changes: { from: line.from, to: head, insert: "" } });
      setSlashMenu((prev) => ({ ...prev, open: false }));

      // Check for AI provider
      const settings = loadSettings();
      const provider = getActiveProvider(settings);
      if (!provider) {
        const warningMsg = "\u26A0 Configure an AI provider in Settings to use AI commands.";
        const insertPos = view.state.selection.main.head;
        view.dispatch({ changes: { from: insertPos, insert: warningMsg } });
        warningTimerRef.current = setTimeout(() => {
          const v = viewRef.current;
          if (!v) return;
          const docText = v.state.doc.toString();
          const idx = docText.indexOf(warningMsg);
          if (idx !== -1) {
            v.dispatch({ changes: { from: idx, to: idx + warningMsg.length, insert: "" } });
          }
        }, 3000);
        return;
      }

      // Gather context from surrounding text
      const { context, replaceFrom, replaceTo } = gatherAIContext(view, command);

      if (!context.trim()) {
        // Nothing to work with
        const noCtx = "\u26A0 Write some text first, then use AI commands.";
        const pos = view.state.selection.main.head;
        view.dispatch({ changes: { from: pos, insert: noCtx } });
        warningTimerRef.current = setTimeout(() => {
          const v = viewRef.current;
          if (!v) return;
          const docText = v.state.doc.toString();
          const idx = docText.indexOf(noCtx);
          if (idx !== -1) {
            v.dispatch({ changes: { from: idx, to: idx + noCtx.length, insert: "" } });
          }
        }, 3000);
        return;
      }

      streamAIResponse(view, command, context, provider, replaceFrom, replaceTo);
      return;
    }

    // Handle ingest link sentinel
    if (insert === "__INGEST_LINK__") {
      // Remove the /command text first
      const { head } = view.state.selection.main;
      const line = view.state.doc.lineAt(head);
      view.dispatch({ changes: { from: line.from, to: head, insert: "" } });
      setSlashMenu((prev) => ({ ...prev, open: false }));
      onIngestLinkRef.current?.();
      return;
    }

    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);

    // Replace the /command with the insert text
    view.dispatch({
      changes: { from: line.from, to: head, insert },
      selection: { anchor: line.from + insert.length - (cursorOffset || 0) },
    });
    view.focus();
    setSlashMenu((prev) => ({ ...prev, open: false }));
  }, [gatherAIContext, streamAIResponse]);

  const handleSlashClose = useCallback(() => {
    setSlashMenu((prev) => ({ ...prev, open: false }));
    viewRef.current?.focus();
  }, []);

  // Escape to cancel AI streaming
  useEffect(() => {
    if (!aiStreaming) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        aiAbortRef.current?.abort();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [aiStreaming]);

  const createEditor = useCallback(() => {
    if (!editorRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const state = EditorState.create({
      doc: content,
      extensions: [
        markdown(),
        oneDark,
        wikiLinkHighlight,
        tagHighlight,
        history(),
        keymap.of([
          {
            key: "Mod-b",
            run: (view: EditorView) => {
              const { from, to } = view.state.selection.main;
              if (from === to) {
                view.dispatch({ changes: { from, insert: "****" }, selection: { anchor: from + 2 } });
              } else {
                const sel = view.state.sliceDoc(from, to);
                view.dispatch({ changes: { from, to, insert: `**${sel}**` }, selection: { anchor: to + 4 } });
              }
              return true;
            },
          },
          {
            key: "Mod-i",
            run: (view: EditorView) => {
              const { from, to } = view.state.selection.main;
              if (from === to) {
                view.dispatch({ changes: { from, insert: "**" }, selection: { anchor: from + 1 } });
              } else {
                const sel = view.state.sliceDoc(from, to);
                view.dispatch({ changes: { from, to, insert: `*${sel}*` }, selection: { anchor: to + 2 } });
              }
              return true;
            },
          },
          {
            key: "Mod-k",
            run: (view: EditorView) => {
              const { from, to } = view.state.selection.main;
              if (from === to) {
                view.dispatch({ changes: { from, insert: "[](url)" }, selection: { anchor: from + 1 } });
              } else {
                const sel = view.state.sliceDoc(from, to);
                view.dispatch({ changes: { from, to, insert: `[${sel}](url)` }, selection: { anchor: from + sel.length + 3, head: from + sel.length + 6 } });
              }
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        cmPlaceholder("Start writing..."),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
          if (update.docChanged || update.selectionSet) {
            checkSlashCommand(update.view);
            checkWikiLink(update.view);
            checkSelection(update.view);
          }
        }),
        EditorView.domEventHandlers({
          paste(event) {
            const text = event.clipboardData?.getData("text/plain")?.trim();
            if (text && /^https?:\/\/\S+$/.test(text) && onPasteUrlRef.current) {
              setTimeout(() => onPasteUrlRef.current?.(text), 0);
            }
            return false; // don't prevent the paste
          },
        }),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    createEditor();
    return () => {
      viewRef.current?.destroy();
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (selDebounceRef.current) clearTimeout(selDebounceRef.current);
    };
  }, [createEditor]);

  // Update content when the prop changes (e.g., switching notes)
  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== content) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
    }
  }, [content]);

  return (
    <div ref={editorRef} className="h-full w-full">
      <SlashCommandMenu
        isOpen={slashMenu.open}
        filter={slashMenu.filter}
        position={{ top: slashMenu.top, left: slashMenu.left }}
        onSelect={handleSlashSelect}
        onClose={handleSlashClose}
      />
      <WikiLinkMenu
        isOpen={wikiMenu.open}
        filter={wikiMenu.filter}
        position={{ top: wikiMenu.top, left: wikiMenu.left }}
        onSelect={handleWikiSelect}
        onClose={handleWikiClose}
      />
      <SelectionToolbar
        isOpen={selToolbar.open}
        position={{ top: selToolbar.top, left: selToolbar.left }}
        onAction={handleTransformAction}
        isStreaming={aiStreaming}
      />
    </div>
  );
});

export default Editor;
