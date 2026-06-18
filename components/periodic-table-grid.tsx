"use client"

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ALL_ELEMENTS,
  getElementBySymbol,
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

const TABLE_GRID_STYLE = {
  gridTemplateColumns: "repeat(18, minmax(3.25rem, 3.75rem))",
} as const

const GROUP_NUMBERS = Array.from({ length: 18 }, (_, index) => index + 1)

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

function getStandardElementGridPosition(z: number): { period: number; group: number } | null {
  if (z === 1) return { period: 1, group: 1 }
  if (z === 2) return { period: 1, group: 18 }
  if (z >= 3 && z <= 4) return { period: 2, group: z - 2 }
  if (z >= 5 && z <= 10) return { period: 2, group: z + 8 }
  if (z >= 11 && z <= 12) return { period: 3, group: z - 10 }
  if (z >= 13 && z <= 18) return { period: 3, group: z }
  if (z >= 19 && z <= 36) return { period: 4, group: z - 18 }
  if (z >= 37 && z <= 54) return { period: 5, group: z - 36 }
  if (z >= 55 && z <= 56) return { period: 6, group: z - 54 }
  if (z >= 57 && z <= 71) return null
  if (z >= 72 && z <= 86) return { period: 6, group: z - 68 }
  if (z >= 87 && z <= 88) return { period: 7, group: z - 86 }
  if (z >= 89 && z <= 103) return null
  if (z >= 104 && z <= 118) return { period: 7, group: z - 100 }
  return null
}

function tableGridRow(period: number): number {
  return period + 1
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
          "relative flex h-12 w-full min-w-0 flex-col items-center justify-center rounded-lg border text-xs transition-all sm:h-14",
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

  function renderSeriesPlaceholder(label: string, row: number) {
    return (
      <div
        key={label}
        className="flex h-12 w-full min-w-0 flex-col items-center justify-center rounded-lg border border-dashed border-pink-500/40 bg-pink-500/10 text-center text-[9px] font-semibold leading-tight text-pink-700 dark:text-pink-200 sm:h-14"
        style={{ gridRow: row, gridColumn: 3 }}
        title={`${label} are shown in the separated f-block rows below`}
      >
        <span>{label}</span>
        <span className="text-[8px] font-normal text-muted-foreground">below</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="max-w-full overflow-x-auto pb-2">
        <div
          className="grid w-max gap-1"
          style={{
            ...TABLE_GRID_STYLE,
            gridTemplateRows: "1.25rem repeat(7, minmax(3.25rem, 3.75rem))",
          }}
        >
          {GROUP_NUMBERS.map((group) => (
            <div
              key={`group-${group}`}
              className="flex items-center justify-center text-[10px] font-semibold text-muted-foreground"
              style={{ gridRow: 1, gridColumn: group }}
            >
              {group}
            </div>
          ))}
          {renderSeriesPlaceholder("La-Lu", tableGridRow(6))}
          {renderSeriesPlaceholder("Ac-Lr", tableGridRow(7))}
          {mainElements.map((el) => {
            const pos = getStandardElementGridPosition(el.atomicNumber)
            if (!pos) return null
            return renderCell(el, tableGridRow(pos.period), pos.group)
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="max-w-full overflow-x-auto pb-1">
          <div className="grid w-max gap-1" style={TABLE_GRID_STYLE}>
            <div
              className="flex h-12 items-center rounded-lg border border-dashed border-border/70 bg-secondary/20 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:h-14"
              style={{ gridColumn: "1 / span 2" }}
            >
              Lanthanides
            </div>
            {lanthanides.map((el, index) => renderCell(el, 1, index + 3))}
          </div>
        </div>
        <div className="max-w-full overflow-x-auto pb-1">
          <div className="grid w-max gap-1" style={TABLE_GRID_STYLE}>
            <div
              className="flex h-12 items-center rounded-lg border border-dashed border-border/70 bg-secondary/20 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:h-14"
              style={{ gridColumn: "1 / span 2" }}
            >
              Actinides
            </div>
            {actinides.map((el, index) => renderCell(el, 1, index + 3))}
          </div>
        </div>
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
