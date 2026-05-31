"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { History, Atom, FlaskConical, AlertCircle, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  clearAllGuestHistory,
  clearMoleculeHistory,
  clearReactionHistory,
  formatHistoryTimestamp,
  getGuestHistoryByType,
  getMoleculeSummary,
  getReactionSummary,
  GUEST_HISTORY_UPDATED_EVENT,
  type GuestHistoryEntry,
  type GuestHistoryFilter,
} from "@/lib/guest-history"

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

export default function HistoryPage() {
  const [filter, setFilter] = useState<GuestHistoryFilter>("all")
  const [entries, setEntries] = useState<GuestHistoryEntry[]>([])

  const refresh = useCallback(() => {
    setEntries(getGuestHistoryByType(filter))
  }, [filter])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const handleUpdate = () => refresh()
    window.addEventListener(GUEST_HISTORY_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(GUEST_HISTORY_UPDATED_EVENT, handleUpdate)
  }, [refresh])

  const moleculeCount = getGuestHistoryByType("molecule").length
  const reactionCount = getGuestHistoryByType("reaction").length

  function handleClearMolecules() {
    clearMoleculeHistory()
  }

  function handleClearReactions() {
    clearReactionHistory()
  }

  function handleClearAll() {
    clearAllGuestHistory()
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">History</h1>
              <p className="text-muted-foreground">Guest session search history</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="rounded-2xl mb-6 border-accent/30 bg-accent/5">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Guest history is temporary and only stored in this browser tab. Create an
                account later to save history permanently.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="rounded-2xl mb-6">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg">Filters</CardTitle>
              <div className="flex flex-wrap gap-2">
                <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                  All ({moleculeCount + reactionCount})
                </FilterButton>
                <FilterButton
                  active={filter === "molecule"}
                  onClick={() => setFilter("molecule")}
                >
                  Molecules ({moleculeCount})
                </FilterButton>
                <FilterButton
                  active={filter === "reaction"}
                  onClick={() => setFilter("reaction")}
                >
                  Reactions ({reactionCount})
                </FilterButton>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1.5"
                onClick={handleClearMolecules}
                disabled={moleculeCount === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Molecule History
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1.5"
                onClick={handleClearReactions}
                disabled={reactionCount === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Reaction History
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1.5"
                onClick={handleClearAll}
                disabled={moleculeCount + reactionCount === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All History
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          {entries.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center">
                <History className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No history yet for this session.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Search molecules in{" "}
                  <Link href="/molecule-builder" className="text-accent hover:underline">
                    Molecule Builder
                  </Link>{" "}
                  or analyze reactions in{" "}
                  <Link href="/reaction-lab" className="text-accent hover:underline">
                    Reaction Lab
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          ) : (
            entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i }}
              >
                <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            entry.type === "molecule"
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/10 text-accent"
                          )}
                        >
                          {entry.type === "molecule" ? (
                            <Atom className="h-4 w-4" />
                          ) : (
                            <FlaskConical className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="secondary" className="capitalize">
                              {entry.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatHistoryTimestamp(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate">
                            Query: {entry.query}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {entry.type === "molecule"
                              ? getMoleculeSummary(entry)
                              : getReactionSummary(entry)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="rounded-lg shrink-0" asChild>
                        <Link
                          href={
                            entry.type === "molecule"
                              ? `/molecule-builder?q=${encodeURIComponent(entry.resolvedName)}`
                              : "/reaction-lab"
                          }
                        >
                          {entry.type === "molecule" ? "View" : "Open Lab"}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  )
}
