import { describe, it, expect } from "vitest";
import { parseLinks, parseLinkTargets, extractTagNames, parseTags } from "@/lib/index/resolve";

describe("parseLinks", () => {
  it("returns each link with its trimmed line as context, lowercased", () => {
    const content = "intro line\n  see [[Project Ideas]] for more\noutro";
    expect(parseLinks(content)).toEqual([
      { targetRaw: "project ideas", context: "see [[Project Ideas]] for more" },
    ]);
  });

  it("captures multiple links on one line in order", () => {
    const links = parseLinks("[[A]] then [[B]]");
    expect(links.map((l) => l.targetRaw)).toEqual(["a", "b"]);
  });

  it("treats alias syntax as a literal target (no special-casing)", () => {
    expect(parseLinks("[[Real|Display]]")[0].targetRaw).toBe("real|display");
  });
});

describe("parseLinkTargets", () => {
  it("dedupes targets, preserving first-seen order", () => {
    expect(parseLinkTargets("[[a]] [[B]] [[a]] [[c]]")).toEqual(["a", "b", "c"]);
  });
});

describe("extractTagNames vs parseTags", () => {
  it("extractTagNames preserves duplicates (used for occurrence-weighted scoring)", () => {
    expect(extractTagNames("#work and #work and #life")).toEqual(["work", "work", "life"]);
  });

  it("parseTags dedupes", () => {
    expect(parseTags("#work and #work and #life")).toEqual(["work", "life"]);
  });

  it("requires a leading boundary and strips the '#'", () => {
    // "#a#b" — only the first is a tag (no boundary before #b)
    expect(extractTagNames("#a#b")).toEqual(["a"]);
    expect(extractTagNames("start #tag\n#next")).toEqual(["tag", "next"]);
  });
});
