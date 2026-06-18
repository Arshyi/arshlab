import type { StudyProgressEvent, StudyProgressState } from "./study-types"

export type { StudyProgressState } from "./study-types"

export const STUDY_PROGRESS_STORAGE_KEY = "arshlab-adaptive-study-progress"
const MAX_EVENTS = 800

function emptyStudyProgress(): StudyProgressState {
  return { events: [] }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

function safeEvent(value: unknown): StudyProgressEvent | null {
  if (!value || typeof value !== "object") return null
  const entry = value as Partial<StudyProgressEvent>
  if (!entry.type || !entry.createdAt) return null
  return {
    id: entry.id ?? `${entry.type}-${entry.createdAt}`,
    type: entry.type,
    topicId: typeof entry.topicId === "string" ? entry.topicId : undefined,
    topic: typeof entry.topic === "string" ? entry.topic : undefined,
    subtopic: typeof entry.subtopic === "string" ? entry.subtopic : undefined,
    entityId: typeof entry.entityId === "string" ? entry.entityId : undefined,
    createdAt: entry.createdAt,
  }
}

export function readStudyProgress(): StudyProgressState {
  if (!canUseStorage()) return emptyStudyProgress()

  try {
    const raw = window.localStorage.getItem(STUDY_PROGRESS_STORAGE_KEY)
    if (!raw) return emptyStudyProgress()
    const parsed = JSON.parse(raw) as Partial<StudyProgressState>
    const events = (parsed.events ?? []).map(safeEvent).filter((event): event is StudyProgressEvent => Boolean(event))
    return {
      events,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    }
  } catch {
    return emptyStudyProgress()
  }
}

export function writeStudyProgress(state: StudyProgressState): StudyProgressState {
  const nextState: StudyProgressState = {
    events: state.events.slice(0, MAX_EVENTS),
    updatedAt: new Date().toISOString(),
  }

  if (canUseStorage()) {
    window.localStorage.setItem(STUDY_PROGRESS_STORAGE_KEY, JSON.stringify(nextState))
  }

  return nextState
}

export function recordStudyEvent(input: Omit<StudyProgressEvent, "id" | "createdAt">): StudyProgressState {
  const createdAt = new Date().toISOString()
  return writeStudyProgress({
    events: [
      {
        ...input,
        id: `${input.type}-${input.entityId ?? input.topicId ?? input.topic ?? "event"}-${createdAt}`,
        createdAt,
      },
      ...readStudyProgress().events,
    ],
  })
}

export function getStudyProgressEvents(): StudyProgressEvent[] {
  return readStudyProgress().events
}
