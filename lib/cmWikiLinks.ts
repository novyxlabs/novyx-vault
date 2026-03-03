import { ViewPlugin, Decoration, MatchDecorator, DecorationSet, EditorView, ViewUpdate } from "@codemirror/view";

const wikiLinkMatcher = new MatchDecorator({
  regexp: /\[\[([^\]]+)\]\]/g,
  decoration: Decoration.mark({ class: "cm-wikilink" }),
});

export const wikiLinkHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = wikiLinkMatcher.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.decorations = wikiLinkMatcher.updateDeco(update, this.decorations);
    }
  },
  { decorations: (v) => v.decorations }
);
