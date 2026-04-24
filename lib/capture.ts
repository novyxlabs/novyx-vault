export type CaptureKind = "quick" | "brain-dump" | "voice" | "clip";

const CAPTURE_LABELS: Record<CaptureKind, string> = {
  quick: "Quick Capture",
  "brain-dump": "Brain Dump",
  voice: "Voice Capture",
  clip: "Clip & Remix",
};

const CAPTURE_PREFIXES: Record<CaptureKind, string> = {
  quick: "quick",
  "brain-dump": "dump",
  voice: "voice",
  clip: "clip",
};

interface CaptureContentInput {
  kind: CaptureKind;
  title: string;
  content: string;
  capturedAt?: Date;
  sourceUrl?: string | null;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function getCaptureLabel(kind: CaptureKind): string {
  return CAPTURE_LABELS[kind];
}

export function slugifyCaptureTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[#/\\:*?"<>|]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return slug || "untitled";
}

export function buildCaptureNotePath(
  kind: CaptureKind,
  title: string,
  capturedAt = new Date(),
): string {
  const day = capturedAt.toISOString().slice(0, 10);
  const time = [
    pad(capturedAt.getUTCHours()),
    pad(capturedAt.getUTCMinutes()),
    pad(capturedAt.getUTCSeconds()),
  ].join("");
  const prefix = CAPTURE_PREFIXES[kind];
  const slug = slugifyCaptureTitle(title);

  return `Captures/${day}/${time}-${prefix}-${slug}.md`;
}

export function buildCaptureNoteContent({
  kind,
  title,
  content,
  capturedAt = new Date(),
  sourceUrl,
}: CaptureContentInput): string {
  const metadata = [
    "---",
    `capture_type: ${yamlString(kind)}`,
    `capture_source: ${yamlString(CAPTURE_LABELS[kind])}`,
    `captured_at: ${yamlString(capturedAt.toISOString())}`,
  ];

  if (sourceUrl?.trim()) {
    metadata.push(`source_url: ${yamlString(sourceUrl.trim())}`);
  }

  metadata.push("---");

  return `${metadata.join("\n")}\n\n# ${title.trim()}\n\n${content.trim()}\n`;
}
