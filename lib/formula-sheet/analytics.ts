import { getFormulaById } from "./formulas"
import type { FormulaViewStats } from "./types"

export const FORMULA_STATS_STORAGE_KEY = "arshlab-formula-sheet-stats"

const EMPTY_STATS: FormulaViewStats = {
  totalViews: 0,
  formulaViews: {},
  categoryViews: {},
  lastViewedFormulaIds: [],
}

export function readFormulaViewStats(): FormulaViewStats {
  if (typeof window === "undefined") return EMPTY_STATS
  try {
    const parsed = JSON.parse(localStorage.getItem(FORMULA_STATS_STORAGE_KEY) ?? "null") as Partial<FormulaViewStats> | null
    return {
      totalViews: parsed?.totalViews ?? 0,
      formulaViews: parsed?.formulaViews ?? {},
      categoryViews: parsed?.categoryViews ?? {},
      lastViewedFormulaIds: parsed?.lastViewedFormulaIds ?? [],
    }
  } catch {
    return EMPTY_STATS
  }
}

function writeFormulaViewStats(stats: FormulaViewStats) {
  try {
    localStorage.setItem(FORMULA_STATS_STORAGE_KEY, JSON.stringify(stats))
  } catch {
    // Formula analytics are local convenience data only.
  }
}

export function recordFormulaView(formulaId: string): FormulaViewStats {
  const formula = getFormulaById(formulaId)
  const current = readFormulaViewStats()
  const next: FormulaViewStats = {
    totalViews: current.totalViews + 1,
    formulaViews: {
      ...current.formulaViews,
      [formulaId]: (current.formulaViews[formulaId] ?? 0) + 1,
    },
    categoryViews: {
      ...current.categoryViews,
      ...(formula
        ? { [formula.category]: (current.categoryViews[formula.category] ?? 0) + 1 }
        : {}),
    },
    lastViewedFormulaIds: [formulaId, ...current.lastViewedFormulaIds.filter((id) => id !== formulaId)].slice(0, 8),
  }
  writeFormulaViewStats(next)
  return next
}

export function formulaMasteryProgress(stats: FormulaViewStats): number {
  const uniqueFormulaViews = Object.keys(stats.formulaViews).length
  return Math.max(0, Math.min(100, Math.round((uniqueFormulaViews / 10) * 100)))
}

export function mostViewedFormulaIds(stats: FormulaViewStats, limit = 4): string[] {
  return Object.entries(stats.formulaViews)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id)
}
