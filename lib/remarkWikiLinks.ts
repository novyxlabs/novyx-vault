import { findAndReplace } from "mdast-util-find-and-replace";
import type { Root } from "mdast";

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

export default function remarkWikiLinks() {
  return (tree: Root) => {
    findAndReplace(tree, [
      [
        WIKILINK_REGEX,
        (_match: string, linkText: string) => {
          return {
            type: "link" as const,
            url: `wikilink://${linkText}`,
            data: {
              hProperties: {
                className: "wiki-link",
                "data-wiki-link": linkText,
              },
            },
            children: [{ type: "text" as const, value: linkText }],
          };
        },
      ],
    ]);
  };
}
