import { ViewPlugin, Decoration, MatchDecorator, DecorationSet, EditorView } from "@codemirror/view";

const tagDecorator = new MatchDecorator({
  regexp: /(?:^|\s)(#[a-zA-Z][\w-]*)/g,
  decoration: () => Decoration.mark({ class: "cm-tag" }),
});

export const tagHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = tagDecorator.createDeco(view);
    }
    update(update: { docChanged: boolean; view: EditorView; viewportChanged: boolean }) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = tagDecorator.createDeco(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);
