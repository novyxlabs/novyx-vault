export interface Frontmatter {
  [key: string]: string | string[] | boolean | number;
}

export interface ParsedNote {
  frontmatter: Frontmatter;
  body: string;
}

/**
 * Parse YAML frontmatter from markdown content.
 * Frontmatter is delimited by --- at the start of the file.
 */
export function parseFrontmatter(content: string): ParsedNote {
  if (!content.startsWith("---")) {
    return { frontmatter: {}, body: content };
  }

  const endIdx = content.indexOf("\n---", 3);
  if (endIdx === -1) {
    return { frontmatter: {}, body: content };
  }

  const yamlBlock = content.slice(4, endIdx).trim();
  const body = content.slice(endIdx + 4).trimStart();
  const frontmatter: Frontmatter = {};

  for (const line of yamlBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let value: string | string[] | boolean | number = trimmed.slice(colonIdx + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse arrays: [item1, item2]
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    }
    // Parse booleans
    else if (value === "true") value = true;
    else if (value === "false") value = false;
    // Parse numbers
    else if (/^\d+(\.\d+)?$/.test(value as string)) value = Number(value);

    if (key) frontmatter[key] = value;
  }

  return { frontmatter, body };
}

/**
 * Check if the content has frontmatter.
 */
export function hasFrontmatter(content: string): boolean {
  if (!content.startsWith("---")) return false;
  return content.indexOf("\n---", 3) !== -1;
}
