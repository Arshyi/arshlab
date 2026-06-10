"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  Atom,
  CheckCircle2,
  FlaskConical,
  History,
  RefreshCw,
  Save,
  Trash2,
  User,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  clearAllGuestHistory,
  clearMoleculeHistory,
  clearReactionHistory,
  formatHistoryTimestamp,
  getGuestHistory,
  getMoleculeSummary,
  getReactionSummary,
  GUEST_HISTORY_UPDATED_EVENT,
  type GuestHistoryEntry,
  type GuestHistoryFilter,
} from "@/lib/guest-history"
import { createClient } from "@/lib/supabase/client"
import {
  clearAllUserHistory,
  clearUserMoleculeHistory,
  clearUserReactionHistory,
  getUserHistory,
  syncGuestHistoryToUser,
  type UserHistoryEntry,
  type UserHistoryType,
} from "@/lib/supabase/history"

type HistoryMode = "guest" | "account"
type ClearScope = "molecule" | "reaction" | "all"

interface DisplayHistoryEntry {
  id: string
  type: UserHistoryType
  query: string
  title: string
  summary: string
  createdAt: string
}

function mapGuestEntry(entry: GuestHistoryEntry): DisplayHistoryEntry {
  if (entry.type === "molecule") {
    return {
      id: entry.id,
      type: "molecule",
      query: entry.query,
      title: entry.resolvedName,
      summary: getMoleculeSummary(entry),
      createdAt: entry.timestamp,
    }
  }

  return {
    id: entry.id,
    type: "reaction",
    query: entry.query,
    title: entry.reactionType,
    summary: getReactionSummary(entry),
    createdAt: entry.timestamp,
  }
}

function mapUserEntry(entry: UserHistoryEntry): DisplayHistoryEntry {
  return {
    id: entry.id,
    type: entry.type,
    query: entry.query,
    title: entry.resultTitle ?? (entry.type === "molecule" ? "Saved molecule" : "Saved reaction"),
    summary:
      entry.resultSummary ??
      (entry.type === "molecule"
        ? [entry.formula, entry.family].filter(Boolean).join(" - ") || "Saved molecule search"
        : `${entry.reactionType ?? "Reaction"}: ${
            entry.predictedProducts.length ? entry.predictedProducts.join(", ") : "No products identified"
          }`),
    createdAt: entry.createdAt,
  }
}

async function getSignedInEmail(): Promise<string | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.email ?? null
  } catch {
    return null
  }
}

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
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

export default function HistoryPage() {
  const [filter, setFilter] = useState<GuestHistoryFilter>("all")
  const [mode, setMode] = useState<HistoryMode>("guest")
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [entries, setEntries] = useState<DisplayHistoryEntry[]>([])
  const [guestSyncCount, setGuestSyncCount] = useState(0)
  const [syncDismissed, setSyncDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [clearing, setClearing] = useState<ClearScope | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)

    const guestEntries = getGuestHistory()
    setGuestSyncCount(guestEntries.length)

    const email = await getSignedInEmail()
    setUserEmail(email)

    if (!email) {
      setMode("guest")
      setEntries(guestEntries.map(mapGuestEntry))
      setLoading(false)
      return
    }

    setMode("account")
    const result = await getUserHistory()

    if (!result.ok) {
      setEntries([])
      setError(result.error)
      setLoading(false)
      return
    }

    setEntries(result.data.map(mapUserEntry))
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  useEffect(() => {
    const handleUpdate = () => {
      if (mode === "guest") void loadHistory()
      if (mode === "account") setGuestSyncCount(getGuestHistory().length)
    }
    window.addEventListener(GUEST_HISTORY_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(GUEST_HISTORY_UPDATED_EVENT, handleUpdate)
  }, [loadHistory, mode])

  const filteredEntries = useMemo(
    () => (filter === "all" ? entries : entries.filter((entry) => entry.type === filter)),
    [entries, filter],
  )
  const moleculeCount = entries.filter((entry) => entry.type === "molecule").length
  const reactionCount = entries.filter((entry) => entry.type === "reaction").length

  async function handleRefresh() {
    setSuccess(null)
    await loadHistory()
  }

  async function handleClear(scope: ClearScope) {
    setClearing(scope)
    setError(null)
    setSuccess(null)

    if (mode === "account") {
      const result =
        scope === "molecule"
          ? await clearUserMoleculeHistory()
          : scope === "reaction"
            ? await clearUserReactionHistory()
            : await clearAllUserHistory()

      if (!result.ok) {
        setError(result.error)
        setClearing(null)
        return
      }
    } else {
      if (scope === "molecule") clearMoleculeHistory()
      if (scope === "reaction") clearReactionHistory()
      if (scope === "all") clearAllGuestHistory()
    }

    setSuccess(
      scope === "all"
        ? "History cleared."
        : `${scope === "molecule" ? "Molecule" : "Reaction"} history cleared.`,
    )
    await loadHistory()
    setClearing(null)
  }

  async function handleSyncGuestHistory() {
    setSyncing(true)
    setError(null)
    setSuccess(null)

    const result = await syncGuestHistoryToUser()

    if (!result.ok) {
      setError(result.error)
      setSyncing(false)
      return
    }

    setSuccess(
      result.data.synced > 0
        ? `Saved ${result.data.synced} guest history item${result.data.synced === 1 ? "" : "s"} to your account.`
        : "Guest history was already saved to your account.",
    )
    setSyncDismissed(false)
    await loadHistory()
    setSyncing(false)
  }

  function handleClearGuestSyncHistory() {
    clearAllGuestHistory()
    setGuestSyncCount(0)
    setSuccess("Temporary guest history cleared.")
    if (mode === "guest") void loadHistory()
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">History</h1>
              <p className="text-muted-foreground">
                {mode === "account" ? "Permanent account history" : "Guest session search history"}
              </p>
            </div>
          </div>
        </motion.div>

        <Card
          className={cn(
            "mb-6 rounded-2xl",
            mode === "account" ? "border-teal-500/30 bg-teal-500/5" : "border-accent/30 bg-accent/5",
          )}
        >
          <CardContent className="flex items-start gap-3 p-5">
            {mode === "account" ? (
              <User className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            )}
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {mode === "account"
                  ? "You are signed in. History is saved permanently to your ARSHLAB account."
                  : "Guest history is temporary and only stored in this browser tab. Sign in to save history permanently."}
              </p>
              {mode === "account" && userEmail && (
                <p className="break-all text-xs">Signed in as {userEmail}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {mode === "account" && guestSyncCount > 0 && !syncDismissed && (
          <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Save className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">You have temporary guest history from this browser session.</p>
                  <p className="text-sm text-muted-foreground">
                    Save {guestSyncCount} item{guestSyncCount === 1 ? "" : "s"} to your account or keep them temporary.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSyncGuestHistory} disabled={syncing} className="rounded-xl">
                  {syncing ? "Saving..." : "Save guest history to account"}
                </Button>
                <Button variant="outline" onClick={() => setSyncDismissed(true)} className="rounded-xl">
                  Keep as temporary
                </Button>
                <Button variant="ghost" onClick={handleClearGuestSyncHistory} className="rounded-xl">
                  Clear guest history
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {(error || success) && (
          <Card className={cn("mb-6 rounded-2xl", error ? "border-destructive/40 bg-destructive/5" : "border-teal-500/30 bg-teal-500/5")}>
            <CardContent className="flex items-start gap-3 p-4">
              {error ? (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
              )}
              <p className="text-sm text-muted-foreground">{error ?? success}</p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 rounded-2xl">
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            <div className="flex flex-wrap gap-2">
              <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                All ({entries.length})
              </FilterButton>
              <FilterButton active={filter === "molecule"} onClick={() => setFilter("molecule")}>
                Molecules ({moleculeCount})
              </FilterButton>
              <FilterButton active={filter === "reaction"} onClick={() => setFilter("reaction")}>
                Reactions ({reactionCount})
              </FilterButton>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh history
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => handleClear("molecule")}
              disabled={moleculeCount === 0 || clearing !== null}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearing === "molecule" ? "Clearing..." : "Clear Molecule History"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => handleClear("reaction")}
              disabled={reactionCount === 0 || clearing !== null}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearing === "reaction" ? "Clearing..." : "Clear Reaction History"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => handleClear("all")}
              disabled={entries.length === 0 || clearing !== null}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {clearing === "all" ? "Clearing..." : "Clear All History"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Loading history...
              </CardContent>
            </Card>
          ) : filteredEntries.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="py-12 text-center">
                <History className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {error ? "History could not be loaded." : "No history yet."}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
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
            filteredEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * index }}
              >
                <Card className="rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            entry.type === "molecule"
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/10 text-accent",
                          )}
                        >
                          {entry.type === "molecule" ? (
                            <Atom className="h-4 w-4" />
                          ) : (
                            <FlaskConical className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="capitalize">
                              {entry.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatHistoryTimestamp(entry.createdAt)}
                            </span>
                          </div>
                          <p className="truncate text-sm font-medium text-foreground">
                            Query: {entry.query}
                          </p>
                          <p className="mt-1 text-sm font-medium text-foreground">{entry.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{entry.summary}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 rounded-lg" asChild>
                        <Link
                          href={
                            entry.type === "molecule"
                              ? `/molecule-builder?q=${encodeURIComponent(entry.title)}`
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
        </div>
      </div>
    </div>
  )
}
