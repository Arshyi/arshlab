# ARSHLAB Learning Paths Architecture

ARSHLAB v13.0.0 adds a deterministic learning-path layer that sits above the existing tools. It does not change scanner recognition, OCR, molecular compiler internals, AI routes, Supabase/auth, middleware, chemistry databases, or solver calculations.

## Purpose

Learning Paths answer a product-level question: "What should I study next?" The system organizes existing ARSHLAB modules into guided tracks, then tracks local lesson progress, mastery checkpoints, prerequisites, and recommendations.

## Files

- `lib/learning-paths/curriculum.ts` defines paths, lessons, prerequisites, outcomes, module links, scanner concepts, Knowledge Graph nodes, virtual labs, mechanisms, and review timing.
- `lib/learning-paths/progress-engine.ts` stores local browser progress in `localStorage`.
- `lib/learning-paths/mastery-engine.ts` calculates completion and quiz-based mastery from 0 to 100.
- `lib/learning-paths/prerequisites.ts` determines locked, available, in-progress, and completed lessons.
- `lib/learning-paths/recommendation-engine.ts` produces deterministic next-lesson, review, lab, mechanism, scanner, and Knowledge Graph recommendations.
- `lib/learning-paths/lesson-sequencer.ts` produces ordered paths, current lessons, next lessons, recent activity, and timeline summaries.
- `app/learning-paths` renders the student-facing learning-path hub.

## Data Model

Each lesson includes:

- Topic and subtopic labels
- Difficulty and estimated time
- Prerequisites
- Learning outcomes
- Connected ARSHLAB modules
- Optional scanner concepts, Knowledge Graph nodes, virtual lab IDs, mechanism IDs, and review cadence

Progress records are local and include:

- Lesson status
- View count
- Best quiz score
- Last accessed timestamp
- Activity events from learning path interactions

## Mastery Model

Mastery is deterministic and intentionally conservative:

- Completed lessons contribute completion credit.
- Quiz checkpoints contribute scored mastery.
- Missing data produces starter guidance instead of fake personalization.
- Scores are clamped from 0 to 100.

## Integration Points

Learning Paths are linked from:

- Homepage
- Navbar Tools menu
- Chemistry Hub
- Learning Dashboard
- Knowledge Graph node detail panels
- Roadmap
- Patch Notes

Deep links support:

- `/learning-paths?path=<pathId>`
- `/learning-paths?lesson=<lessonId>`
- `/learning-paths?focus=<conceptOrGraphNode>`

Invalid parameters fall back to the default path safely.

## Verification

The v13.0.0 verification scripts cover:

- `npm.cmd run test:learning-paths`
- `npm.cmd run test:mastery`
- `npm.cmd run test:recommendations`
- `npm.cmd run test:progress`
- `npm.cmd run test:curriculum`
- `npm.cmd run test:learning-dashboard`
- `npm.cmd run test:lesson-sequencer`

The system is local, deterministic, and database-first. It adds guidance over existing modules rather than changing their engines.
