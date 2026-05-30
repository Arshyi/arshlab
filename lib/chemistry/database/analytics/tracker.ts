import type { AnalyticsEvent, AnalyticsEventType } from "../types"

export interface AnalyticsSummary {
  topCompounds: { id: string; count: number }[]
  topReactions: { id: string; count: number }[]
  topFunctionalGroups: { id: string; count: number }[]
  topOrbitals: { id: string; count: number }[]
  topSearches: { query: string; count: number }[]
}

const STORAGE_KEY = "arshlab-analytics-v1"

class AnalyticsTracker {
  private events: AnalyticsEvent[] = []

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) this.events = JSON.parse(raw)
      } catch {
        this.events = []
      }
    }
  }

  track(type: AnalyticsEventType, payload?: { entityId?: string; query?: string }) {
    const event: AnalyticsEvent = {
      type,
      entityId: payload?.entityId,
      query: payload?.query,
      timestamp: Date.now(),
    }
    this.events.push(event)
    if (this.events.length > 5000) this.events = this.events.slice(-3000)
    this.persist()
  }

  private persist() {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events))
    } catch {
      /* quota exceeded — trim */
      this.events = this.events.slice(-1000)
    }
  }

  getSummary(): AnalyticsSummary {
    const compoundCounts = new Map<string, number>()
    const reactionCounts = new Map<string, number>()
    const fgCounts = new Map<string, number>()
    const orbitalCounts = new Map<string, number>()
    const searchCounts = new Map<string, number>()

    for (const e of this.events) {
      if (e.type === "view_compound" && e.entityId)
        compoundCounts.set(e.entityId, (compoundCounts.get(e.entityId) ?? 0) + 1)
      if (e.type === "view_reaction" && e.entityId)
        reactionCounts.set(e.entityId, (reactionCounts.get(e.entityId) ?? 0) + 1)
      if (e.type === "view_functional_group" && e.entityId)
        fgCounts.set(e.entityId, (fgCounts.get(e.entityId) ?? 0) + 1)
      if (e.type === "view_orbital" && e.entityId)
        orbitalCounts.set(e.entityId, (orbitalCounts.get(e.entityId) ?? 0) + 1)
      if (e.type === "search" && e.query)
        searchCounts.set(e.query, (searchCounts.get(e.query) ?? 0) + 1)
    }

    const top = (map: Map<string, number>) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ id, count }))

    return {
      topCompounds: top(compoundCounts),
      topReactions: top(reactionCounts),
      topFunctionalGroups: top(fgCounts),
      topOrbitals: top(orbitalCounts),
      topSearches: top(searchCounts).map(({ id, count }) => ({ query: id, count })),
    }
  }

  clear() {
    this.events = []
    this.persist()
  }
}

export const analytics = new AnalyticsTracker()
