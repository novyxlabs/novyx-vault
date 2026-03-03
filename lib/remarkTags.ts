import { visit } from "unist-util-visit";
import type { Root, Text, PhrasingContent } from "mdast";

const TAG_REGEX = /(?:^|\s)(#[a-zA-Z][\w-]*)/g;

export default function remarkTags() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const matches: { tag: string; start: number; end: number }[] = [];
      let match;
      TAG_REGEX.lastIndex = 0;
      while ((match = TAG_REGEX.exec(node.value)) !== null) {
        const fullMatch = match[0];
        const tag = match[1];
        const start = match.index + (fullMatch.length - tag.length);
        matches.push({ tag, start, end: start + tag.length });
      }

      if (matches.length === 0) return;

      const children: PhrasingContent[] = [];
      let lastEnd = 0;

      for (const m of matches) {
        if (m.start > lastEnd) {
          children.push({ type: "text", value: node.value.slice(lastEnd, m.start) });
        }
        children.push({
          type: "html",
          value: `<span class="note-tag">${m.tag}</span>`,
        } as unknown as PhrasingContent);
        lastEnd = m.end;
      }

      if (lastEnd < node.value.length) {
        children.push({ type: "text", value: node.value.slice(lastEnd) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
}
