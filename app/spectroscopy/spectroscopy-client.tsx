"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { BookOpenCheck, Database, Search, Waves } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SPECTROSCOPY_RECORDS, searchSpectroscopyRecords } from "@/lib/chemistry/spectroscopy"

const quickSearches = ["carbonyl", "O-H", "N-H", "2250", "aromatic", "ester"]

export function SpectroscopyClient() {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(SPECTROSCOPY_RECORDS[0]?.id ?? "")
  const records = useMemo(() => searchSpectroscopyRecords(query), [query])
  const selected =
    SPECTROSCOPY_RECORDS.find((record) => record.id === selectedId) ??
    records[0] ??
    SPECTROSCOPY_RECORDS[0]

  function runSearch(value: string) {
    setQuery(value)
    const next = searchSpectroscopyRecords(value)[0]
    if (next) setSelectedId(next.id)
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Waves className="h-6 w-6" />
            </div>
            <div>
              <Badge variant="secondary">Spectroscopy Knowledge Core</Badge>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">IR Spectroscopy Reference</h1>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Browse functional-group IR peaks, compare ranges, and study the evidence ARSHLAB uses for
            deterministic spectroscopy questions.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild className="rounded-xl">
              <Link href="/practice-generator?topic=Spectroscopy&subtopic=IR+Spectroscopy">Practice Spectroscopy</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/chemistry-database">Open Chemistry Database</Link>
            </Button>
          </div>
        </motion.section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5" />
                  Search Functional Groups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search carbonyl, O-H, 2250, ester, aromatic..."
                  className="h-12 rounded-xl bg-background"
                />
                <div className="flex flex-wrap gap-2">
                  {quickSearches.map((value) => (
                    <Button key={value} type="button" variant="outline" size="sm" onClick={() => runSearch(value)}>
                      {value}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>IR Reference Table</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Functional group</th>
                      <th className="px-3 py-2">Key range</th>
                      <th className="px-3 py-2">Shape</th>
                      <th className="px-3 py-2">Strength</th>
                      <th className="px-3 py-2">Assignment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr
                        key={record.id}
                        className="cursor-pointer border-b border-border/70 transition-colors hover:bg-secondary/40"
                        onClick={() => setSelectedId(record.id)}
                      >
                        <td className="px-3 py-3 font-medium">{record.name}</td>
                        <td className="px-3 py-3 font-mono text-xs">{record.peakRange}</td>
                        <td className="px-3 py-3">{record.peakShape}</td>
                        <td className="px-3 py-3">{record.peakStrength}</td>
                        <td className="px-3 py-3">{record.irPeaks[0]?.assignment ?? record.functionalGroup}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {selected && (
            <aside className="space-y-4">
              <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpenCheck className="h-5 w-5" />
                    Quick Study
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold">{selected.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.notes}</p>
                  </div>
                  <div className="grid gap-2">
                    <ReferenceRow label="Key range" value={selected.peakRange} />
                    <ReferenceRow label="Shape" value={selected.peakShape} />
                    <ReferenceRow label="Strength" value={selected.peakStrength} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.exampleCompounds.map((compound) => (
                      <Badge key={compound} variant="secondary">
                        {compound}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Database className="h-5 w-5" />
                    Characteristic Peaks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selected.irPeaks.map((peak) => (
                    <div key={peak.id} className="rounded-xl border border-border bg-secondary/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-mono text-sm font-semibold">{peak.range}</p>
                        <Badge variant="outline">{peak.strength}</Badge>
                      </div>
                      <p className="mt-2 text-sm">{peak.assignment}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{peak.shape}</p>
                      {peak.notes && <p className="mt-2 text-xs text-muted-foreground">{peak.notes}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </aside>
          )}
        </section>
      </div>
    </main>
  )
}

function ReferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
