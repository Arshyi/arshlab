"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Radio, BarChart3, Magnet, Search, Atom, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IRSpectrumViewer } from "@/components/ir-spectrum-viewer"
import {
  getSpectroscopyForCompound,
  getAvailableSpectroscopyCompounds,
  getDefaultIRForGroup,
  type SpectroscopyData,
} from "@/lib/chemistry/spectroscopy"
import { searchCompound, getSuggestions } from "@/lib/chemistry/compounds"
import { detectFunctionalGroups } from "@/lib/chemistry/functional-group-detection"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"

function SpectroscopyLabContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""
  const [input, setInput] = useState(initialQuery)
  const [compoundName, setCompoundName] = useState(initialQuery)

  const compound = useMemo(() => (compoundName ? searchCompound(compoundName) : null), [compoundName])
  const specData: SpectroscopyData | null = useMemo(() => {
    if (!compound) return null
    return getSpectroscopyForCompound(compound.name, compound.aliases)
  }, [compound])

  const fallbackIR = useMemo(() => {
    if (specData || !compound) return null
    const groups = detectFunctionalGroups(compound)
    const peaks = groups.flatMap((g) => getDefaultIRForGroup(g.id))
    return peaks.length > 0 ? peaks : null
  }, [specData, compound])

  const suggestions = useMemo(() => getSuggestions(input, 5), [input])
  const available = getAvailableSpectroscopyCompounds()

  useEffect(() => {
    if (initialQuery) setCompoundName(initialQuery)
  }, [initialQuery])

  function handleSearch(name?: string) {
    const q = name ?? input
    if (!q.trim()) return
    setCompoundName(q.trim())
    setInput(q.trim())
  }

  const msChartData =
    specData?.msFragments.map((f) => ({
      mz: f.mz,
      intensity: f.intensity,
      label: f.label,
    })) ?? []

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Spectroscopy Lab</h1>
              <p className="text-muted-foreground">IR, mass spectrometry & proton NMR (educational)</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            Approximate spectra for IB HL study — not for research-grade analysis.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Molecule Search</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="e.g. ethanol, propanone, benzene"
                    className="h-12 rounded-xl pr-10"
                  />
                  <button
                    onClick={() => handleSearch()}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </button>
                  {suggestions.length > 0 && input.length >= 2 && (
                    <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border bg-card shadow-lg overflow-hidden">
                      {suggestions.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => handleSearch(s.name)}
                          className="flex w-full px-4 py-2 text-left text-sm hover:bg-secondary/50 capitalize"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {["ethanol", "propanone", "ethanal", "benzene", "methyl ethanoate"].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => handleSearch(ex)}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground hover:bg-secondary"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {!compound ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Atom className="h-14 w-14 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">Search for a molecule to view spectroscopy data</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="capitalize">{compound.name}</CardTitle>
                  <p className="text-sm font-mono text-muted-foreground">{compound.formula}</p>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="ir" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 rounded-xl mb-6">
                      <TabsTrigger value="ir" className="rounded-lg gap-1.5">
                        <Radio className="h-4 w-4" /> IR
                      </TabsTrigger>
                      <TabsTrigger value="ms" className="rounded-lg gap-1.5">
                        <BarChart3 className="h-4 w-4" /> MS
                      </TabsTrigger>
                      <TabsTrigger value="nmr" className="rounded-lg gap-1.5">
                        <Magnet className="h-4 w-4" /> ¹H NMR
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ir" className="space-y-4">
                      {specData || fallbackIR ? (
                        <>
                          <IRSpectrumViewer peaks={specData?.irPeaks ?? fallbackIR!} />
                          <p className="text-sm text-muted-foreground">
                            {specData?.irSummary ??
                              "Approximate peaks based on detected functional groups (educational estimate)."}
                          </p>
                          {!specData && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Full spectrum data not yet available — showing group defaults
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No IR data for this molecule yet.</p>
                      )}
                    </TabsContent>

                    <TabsContent value="ms" className="space-y-4">
                      {specData ? (
                        <>
                          <div className="h-[220px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={msChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                                <XAxis
                                  dataKey="mz"
                                  label={{ value: "m/z", position: "insideBottom", offset: -5, fontSize: 11 }}
                                  tick={{ fontSize: 10 }}
                                />
                                <YAxis hide />
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (!active || !payload?.[0]) return null
                                    const d = payload[0].payload as { mz: number; label: string }
                                    const frag = specData.msFragments.find((f) => f.mz === d.mz)
                                    return (
                                      <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md max-w-[200px]">
                                        <p className="font-mono font-medium">m/z {d.mz}</p>
                                        <p className="text-accent">{d.label}</p>
                                        {frag && <p className="text-muted-foreground mt-1">{frag.explanation}</p>}
                                      </div>
                                    )
                                  }}
                                />
                                <Bar dataKey="intensity" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-sm">
                            <span className="font-medium">M⁺ = {specData.molecularIon}</span>
                            <span className="text-muted-foreground"> — {specData.msSummary}</span>
                          </p>
                          <ul className="space-y-2">
                            {specData.msFragments.map((f) => (
                              <li key={f.mz} className="text-sm text-muted-foreground flex gap-2">
                                <span className="font-mono text-foreground shrink-0">m/z {f.mz}</span>
                                {f.explanation}
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No mass spectrometry data for this molecule yet.</p>
                      )}
                    </TabsContent>

                    <TabsContent value="nmr" className="space-y-4">
                      {specData ? (
                        <>
                          <p className="text-sm text-muted-foreground">{specData.nmrSummary}</p>
                          <div className="space-y-3">
                            {specData.nmrEnvironments.map((env) => (
                              <div
                                key={env.proton}
                                className="rounded-xl border border-border bg-secondary/30 p-4 grid gap-2 sm:grid-cols-4 text-sm"
                              >
                                <span className="font-medium">{env.proton}</span>
                                <span className="font-mono text-accent">{env.shift}</span>
                                <span>{env.splitting}</span>
                                <span className="text-muted-foreground">{env.integration}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No NMR data for this molecule yet.</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="rounded-2xl h-fit lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-lg">Spectra Available</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[60vh] overflow-y-auto">
              {available.map((name) => (
                <button
                  key={name}
                  onClick={() => handleSearch(name)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-left capitalize transition-colors",
                    compoundName.toLowerCase() === name.toLowerCase()
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary/50 text-foreground"
                  )}
                >
                  {name}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SpectroscopyLabPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading...</div>}>
      <SpectroscopyLabContent />
    </Suspense>
  )
}
