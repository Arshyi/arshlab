"use client"

import { motion } from "framer-motion"
import { TableProperties } from "lucide-react"
import { PeriodicTableGrid } from "@/components/periodic-table-grid"
import { getDatabaseMeta } from "@/lib/chemistry/database/registry"
import { Card, CardContent } from "@/components/ui/card"

export default function PeriodicTablePage() {
  const meta = getDatabaseMeta()

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
                All {meta.counts.elements} elements — click for properties
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mt-4">
            Interactive periodic table for high school through first-year university. Supports IB, AP,
            and A-Level study.
          </p>
        </motion.div>

        <Card className="rounded-2xl mb-6">
          <CardContent className="pt-6">
            <PeriodicTableGrid />
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
