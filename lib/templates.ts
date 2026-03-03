export interface NoteTemplate {
  id: string;
  name: string;
  icon: string;
  content: (name: string) => string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    icon: "FileText",
    content: (name) => `# ${name}\n\n`,
  },
  {
    id: "meeting",
    name: "Meeting Notes",
    icon: "Users",
    content: (name) => `# ${name}

## Date
${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

## Attendees
-

## Agenda
1.

## Notes


## Action Items
- [ ]

## Follow-up
`,
  },
  {
    id: "project",
    name: "Project Plan",
    icon: "Kanban",
    content: (name) => `# ${name}

## Overview


## Goals
-

## Timeline

| Phase | Target Date | Status |
|-------|------------|--------|
|       |            |        |

## Tasks
- [ ]

## Resources


## Notes
`,
  },
  {
    id: "weekly",
    name: "Weekly Review",
    icon: "Calendar",
    content: (name) => `# ${name}

## Wins This Week
-

## Challenges
-

## Lessons Learned
-

## Next Week Priorities
1.
2.
3.

## Notes
`,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    icon: "Lightbulb",
    content: (name) => `# ${name}

## Topic


## Ideas
-
-
-

## Pros & Cons

| Idea | Pros | Cons |
|------|------|------|
|      |      |      |

## Next Steps
- [ ]
`,
  },
  {
    id: "journal",
    name: "Journal Entry",
    icon: "BookOpen",
    content: (name) => `# ${name}

*${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}*

## How am I feeling?


## What happened today?


## What am I grateful for?
1.
2.
3.

## Reflections
`,
  },
];
