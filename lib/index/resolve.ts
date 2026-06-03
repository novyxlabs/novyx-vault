/**
 * Single source of truth for extracting wiki-links and tags from note content.
 *
 * These patterns previously lived (triplicated) in backlinks.ts, graph.ts, and
 * connections.ts. The renderer (remarkWikiLinks / remarkTags) keeps its own
 * copies because it operates on the mdast tree, not raw text — this module is
 * strictly for the index/scan path.
 *
 * Targets and tags are returned trimmed + lowercased, ready for resolution.
 * Alias syntax ([[target|display]]) is intentionally NOT special-cased, matching
 * existing behavior: the whole "target|display" string is treated as the target.
 * Adding alias support is a deliberate future change, not part of this cleanup.
 */

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;
const TAG_REGEX = /(?:^|\s)#([a-zA-Z][\w-]*)/g;

export interface ParsedLink {
  /** Wiki-link target, trimmed and lowercased (e.g. "project ideas"). */
  targetRaw: string;
  /** The trimmed line the link appeared on — used for backlink previews. */
  context: string;
}

/**
 * Extract every wiki-link with its line context, in document order.
 * Parses line-by-line so each link carries the trimmed line it lives on.
 */
export function parseLinks(content: string): ParsedLink[] {
  const links: ParsedLink[] = [];
  for (const line of content.split("\n")) {
    WIKILINK_REGEX.lastIndex = 0;
    let match;
    while ((match = WIKILINK_REGEX.exec(line)) !== null) {
      links.push({ targetRaw: match[1].trim().toLowerCase(), context: line.trim() });
    }
  }
  return links;
}

/** Distinct wiki-link targets, in first-seen order. */
export function parseLinkTargets(content: string): string[] {
  const seen = new Set<string>();
  const targets: string[] = [];
  WIKILINK_REGEX.lastIndex = 0;
  let match;
  while ((match = WIKILINK_REGEX.exec(content)) !== null) {
    const target = match[1].trim().toLowerCase();
    if (!seen.has(target)) {
      seen.add(target);
      targets.push(target);
    }
  }
  return targets;
}

/**
 * All tag names (without the leading '#'), in document order, INCLUDING
 * duplicates. Used where the count of occurrences matters (tag scoring).
 */
export function extractTagNames(content: string): string[] {
  const tags: string[] = [];
  TAG_REGEX.lastIndex = 0;
  let match;
  while ((match = TAG_REGEX.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  return tags;
}

/** Distinct tag names (without the leading '#'), in first-seen order. */
export function parseTags(content: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of extractTagNames(content)) {
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}
