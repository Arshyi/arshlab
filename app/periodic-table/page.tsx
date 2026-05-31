"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { TableProperties, Search } from "lucide-react"
import { PeriodicTableGrid } from "@/components/periodic-table-grid"
import { getDatabaseMeta } from "@/lib/chemistry/database/registry"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const QUICK_EXAMPLES = ["Fe", "Cu", "Xe", "S", "Al", "Cr", "Mn"]

export default function PeriodicTablePage() {
  const meta = getDatabaseMeta()
  const [focusSymbol, setFocusSymbol] = useState<string | null>(null)

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <TableProperties className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Periodic Table</h1>
              <p className="text-muted-foreground">
                All {meta.counts.elements} elements — click for element profiles
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mt-4">
            Interactive periodic table with electron configurations, orbital diagrams, periodic
            properties, and teaching-focused exception examples.
          </p>
        </motion.div>

        <Card className="rounded-2xl mb-6">
          <CardContent className="pt-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Quick examples</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_EXAMPLES.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => setFocusSymbol(symbol)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 font-mono text-sm font-medium transition-all",
                      focusSymbol === symbol
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-secondary/30 text-foreground hover:bg-secondary",
                    )}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
            <PeriodicTableGrid focusSymbol={focusSymbol} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Data from ARSHLAB Chemistry Database v{meta.version}. Some properties use teaching
          approximations for synthetic and heavy elements.
        </p>
      </div>
    </div>
  )
}
