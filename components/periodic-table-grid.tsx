"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ALL_ELEMENTS, getElementBySymbol, getElementGridPosition } from "@/lib/chemistry/database/periodic-table"
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

interface PeriodicTableGridProps {
  focusSymbol?: string | null
}

export function PeriodicTableGrid({ focusSymbol }: PeriodicTableGridProps) {
  const [selected, setSelected] = useState<ElementRecord | null>(null)

  useEffect(() => {
    if (!focusSymbol) return
    const el = getElementBySymbol(focusSymbol)
    if (el) {
      setSelected(el)
      analytics.track("view_element", { entityId: el.id })
    }
  }, [focusSymbol])

  const mainElements = ALL_ELEMENTS.filter(
    (e) =>
      !(e.atomicNumber >= 57 && e.atomicNumber <= 71) &&
      !(e.atomicNumber >= 89 && e.atomicNumber <= 103),
  )
  const lanthanides = ALL_ELEMENTS.filter((e) => e.atomicNumber >= 57 && e.atomicNumber <= 71)
  const actinides = ALL_ELEMENTS.filter((e) => e.atomicNumber >= 89 && e.atomicNumber <= 103)

  function handleSelect(el: ElementRecord) {
    setSelected(el)
    analytics.track("view_element", { entityId: el.id })
  }

  function renderCell(el: ElementRecord, row: number, col: number) {
    const color = CATEGORY_COLORS[el.category] ?? CATEGORY_COLORS.unknown
    return (
      <button
        key={el.id}
        type="button"
        onClick={() => handleSelect(el)}
        className={cn(
          "flex h-12 w-12 flex-col items-center justify-center rounded-lg border text-xs transition-all sm:h-14 sm:w-14",
          color,
          selected?.id === el.id && "ring-2 ring-primary",
        )}
        style={{ gridRow: row, gridColumn: col }}
        title={el.name}
      >
        <span className="text-[9px] text-muted-foreground">{el.atomicNumber}</span>
        <span className="font-bold font-mono">{el.symbol}</span>
        <span className="hidden text-[8px] text-muted-foreground sm:block">
          {el.atomicMass.toFixed(1)}
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
        {selected && (
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
