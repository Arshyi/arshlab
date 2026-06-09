"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ALL_ELEMENTS,
  getElementBySymbol,
  getElementGridPosition,
  getElementTrendValue,
  getTrendRange,
  PERIODIC_TREND_METRICS,
} from "@/lib/chemistry/database/periodic-table"
import type { TrendMode } from "@/lib/chemistry/database/periodic-table"
import type { ElementRecord } from "@/lib/chemistry/database/types"
import { ElementProfilePanel } from "@/components/element-profile-panel"
import { cn } from "@/lib/utils"
import { analytics } from "@/lib/chemistry/database/analytics/tracker"

const CATEGORY_COLORS: Record<string, string> = {
  "alkali-metal": "bg-red-500/20 border-red-500/40 hover:bg-red-500/30",
  "alkaline-earth-metal": "bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/30",
  "transition-metal": "bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30",
  "post-transition-metal": "bg-slate-500/20 border-slate-500/40",
  metalloid: "bg-teal-500/20 border-teal-500/40 hover:bg-teal-500/30",
  nonmetal: "bg-green-500/20 border-green-500/40 hover:bg-green-500/30",
  halogen: "bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30",
  "noble-gas": "bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30",
  lanthanide: "bg-pink-500/20 border-pink-500/40 hover:bg-pink-500/30",
  actinide: "bg-rose-500/20 border-rose-500/40 hover:bg-rose-500/30",
  unknown: "bg-muted border-border",
}

const HEATMAP_HUES: Record<TrendMode, number> = {
  atomicRadius: 172,
  electronegativity: 205,
  ionizationEnergy: 265,
  electronAffinity: 145,
}

interface PeriodicTableGridProps {
  focusSymbol?: string | null
  heatmapMode?: TrendMode | null
  comparisonMode?: boolean
  comparisonSymbols?: string[]
  onComparisonToggle?: (element: ElementRecord) => void
}

function normalizeTrendValue(value: number, min: number, max: number): number {
  if (max === min) return 0
  return (value - min) / (max - min)
}

function heatmapStyle(mode: TrendMode, normalized: number): React.CSSProperties {
  const hue = HEATMAP_HUES[mode]
  const lightness = 94 - normalized * 48
  const borderLightness = Math.max(34, lightness - 18)

  return {
    backgroundColor: `hsl(${hue} 72% ${lightness}%)`,
    borderColor: `hsl(${hue} 72% ${borderLightness}%)`,
    color: normalized > 0.62 ? "white" : "hsl(222 35% 12%)",
  }
}

function formatCompactValue(mode: TrendMode, value: number): string {
  if (mode === "electronegativity") return value.toFixed(2)
  return String(Math.round(value))
}

export function PeriodicTableGrid({
  focusSymbol,
  heatmapMode = null,
  comparisonMode = false,
  comparisonSymbols = [],
  onComparisonToggle,
}: PeriodicTableGridProps) {
  const [selected, setSelected] = useState<ElementRecord | null>(null)

  useEffect(() => {
    if (!focusSymbol) return
    const el = getElementBySymbol(focusSymbol)
    if (el) {
      setSelected(el)
      analytics.track("view_element", { entityId: el.id })
    }
  }, [focusSymbol])

  const trendRange = useMemo(
    () => (heatmapMode ? getTrendRange(ALL_ELEMENTS, heatmapMode) : null),
    [heatmapMode],
  )

  const mainElements = ALL_ELEMENTS.filter(
    (e) =>
      !(e.atomicNumber >= 57 && e.atomicNumber <= 71) &&
      !(e.atomicNumber >= 89 && e.atomicNumber <= 103),
  )
  const lanthanides = ALL_ELEMENTS.filter((e) => e.atomicNumber >= 57 && e.atomicNumber <= 71)
  const actinides = ALL_ELEMENTS.filter((e) => e.atomicNumber >= 89 && e.atomicNumber <= 103)

  function handleSelect(el: ElementRecord) {
    if (comparisonMode && onComparisonToggle) {
      onComparisonToggle(el)
      return
    }

    setSelected(el)
    analytics.track("view_element", { entityId: el.id })
  }

  function renderCell(el: ElementRecord, row: number, col: number) {
    const mode = heatmapMode
    const categoryColor = CATEGORY_COLORS[el.category] ?? CATEGORY_COLORS.unknown
    const comparisonIndex = comparisonSymbols.indexOf(el.symbol)
    const isCompared = comparisonIndex >= 0
    const trendValue = mode ? getElementTrendValue(el, mode) : null
    const normalized =
      mode && trendRange && trendValue !== null
        ? normalizeTrendValue(trendValue, trendRange.min, trendRange.max)
        : 0
    const metric = mode ? PERIODIC_TREND_METRICS[mode] : null
    const cellStyle: React.CSSProperties = {
      gridRow: row,
      gridColumn: col,
      ...(mode ? heatmapStyle(mode, normalized) : {}),
    }
    const mutedText =
      heatmapMode && normalized > 0.62 ? "text-white/75" : "text-muted-foreground"

    return (
      <button
        key={el.id}
        type="button"
        onClick={() => handleSelect(el)}
        className={cn(
          "relative flex h-12 w-12 flex-col items-center justify-center rounded-lg border text-xs transition-all sm:h-14 sm:w-14",
          heatmapMode ? "hover:brightness-95" : categoryColor,
          selected?.id === el.id && !comparisonMode && "ring-2 ring-primary",
          isCompared && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
        style={cellStyle}
        title={
          mode && metric && trendValue !== null
            ? `${el.name}: ${metric.label} ${formatCompactValue(mode, trendValue)} ${metric.unit}`
            : el.name
        }
      >
        {isCompared && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
            {comparisonIndex + 1}
          </span>
        )}
        <span className={cn("text-[9px]", mutedText)}>{el.atomicNumber}</span>
        <span className="font-mono font-bold">{el.symbol}</span>
        <span className={cn("hidden text-[8px] sm:block", mutedText)}>
          {mode && trendValue !== null
            ? formatCompactValue(mode, trendValue)
            : el.atomicMass.toFixed(1)}
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div
        className="grid gap-1 overflow-x-auto pb-2"
        style={{
          gridTemplateColumns: "repeat(18, minmax(2.5rem, 1fr))",
          gridTemplateRows: "repeat(9, minmax(2.5rem, 1fr))",
        }}
      >
        {mainElements.map((el) => {
          const pos = getElementGridPosition(el.atomicNumber)
          if (!pos) return null
          return renderCell(el, pos.row, pos.col)
        })}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Lanthanides</p>
        <div className="flex flex-wrap gap-1">{lanthanides.map((el) => renderCell(el, 1, 1))}</div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Actinides</p>
        <div className="flex flex-wrap gap-1">{actinides.map((el) => renderCell(el, 1, 1))}</div>
      </div>

      <AnimatePresence>
        {selected && !comparisonMode && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ElementProfilePanel element={selected} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
