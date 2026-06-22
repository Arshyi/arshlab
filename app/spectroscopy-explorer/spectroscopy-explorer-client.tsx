"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Atom, BarChart3, BookOpenCheck, Database, FlaskConical, Radio, Search, Waves } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  SPECTROSCOPY_CATEGORIES,
  getCompoundSpectroscopyProfile,
  getExpectedIrSignals,
  getSpectroscopyMetrics,
  getSpectroscopySignal,
  listCompoundSpectroscopyProfiles,
  searchSpectroscopySignals,
  spectroscopySlug,
} from "@/lib/spectroscopy/spectroscopy-engine"
import type { SpectroscopyCategory } from "@/lib/spectroscopy/spectroscopy-types"
import { cn } from "@/lib/utils"

const quickSearches = ["ir-carbonyl", "O-H", "1H NMR", "13C carbonyl", "base peak", "bromine isotope"]

function categoryIcon(category: SpectroscopyCategory) {
  if (category === "IR") return Waves
  if (category === "1H NMR") return Atom
  if (category === "13C NMR") return BarChart3
  return Radio
}

function categoryPracticeTopic(category: SpectroscopyCategory): string {
  if (category === "IR") return "IR Spectroscopy"
  if (category === "Mass Spec") return "Mass Spectrometry"
  return "NMR Spectroscopy"
}

export function SpectroscopyExplorerClient() {
  const metrics = useMemo(() => getSpectroscopyMetrics(), [])
  const profiles = useMemo(() => listCompoundSpectroscopyProfiles(), [])
  const [category, setCategory] = useState<SpectroscopyCategory>("IR")
  const [query, setQuery] = useState("")
  const [selectedSignalId, setSelectedSignalId] = useState("ir-carbonyl-general")
  const [selectedCompoundId, setSelectedCompoundId] = useState("ethanol")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedCompound = params.get("compound")
    const requestedTopic = params.get("topic")

    if (requestedCompound) {
      const profile = getCompoundSpectroscopyProfile(requestedCompound)
      if (profile) setSelectedCompoundId(profile.compoundId)
    }

    if (requestedTopic) {
      const signal = getSpectroscopySignal(requestedTopic)
      if (signal) {
        setSelectedSignalId(signal.id)
        setCategory(signal.category)
        setQuery(requestedTopic)
      }
    }
  }, [])

  const signals = useMemo(() => searchSpectroscopySignals(query, category), [category, query])
  const selectedSignal =
    getSpectroscopySignal(selectedSignalId) ??
    signals[0] ??
    searchSpectroscopySignals("", category)[0]
  const selectedProfile = getCompoundSpectroscopyProfile(selectedCompoundId) ?? profiles[0]
  const expectedIrSignals = getExpectedIrSignals(selectedProfile)
  const SelectedIcon = categoryIcon(category)

  useEffect(() => {
    document.getElementById("spectroscopy-signal")?.scrollIntoView({ block: "nearest" })
  }, [selectedSignal?.id])

  function chooseQuick(value: string) {
    const signal = getSpectroscopySignal(value) ?? searchSpectroscopySignals(value)[0]
    setQuery(value)
    if (signal) {
      setCategory(signal.category)
      setSelectedSignalId(signal.id)
    }
  }

  return (
    <main id="spectroscopy-explorer" className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Waves className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">ARSHLAB v5.4.3</Badge>
                  <Badge variant="outline">Database mode = no AI usage</Badge>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Spectroscopy Explorer</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Interpret IR, 1H NMR, 13C NMR, and mass spectrometry clues from deterministic ARSHLAB records.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/practice-generator?topic=Spectroscopy&source=database">Practice Spectroscopy</Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href="/exam-generator?topic=Spectroscopy&source=database">Generate Exam Set</Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Metric label="Signals" value={metrics.signalRecords} />
            <Metric label="IR" value={metrics.irSignals} />
            <Metric label="1H NMR" value={metrics.protonNmrSignals} />
            <Metric label="13C NMR" value={metrics.carbonNmrSignals} />
            <Metric label="Mass Spec" value={metrics.massSpecSignals} />
            <Metric label="Profiles" value={metrics.compoundProfiles} />
          </div>
        </motion.section>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-6">
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5" />
                  Search Spectroscopy Records
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search carbonyl, proton NMR, base peak, 1700, isotope..."
                  className="h-12 rounded-xl bg-background"
                />
                <div className="flex flex-wrap gap-2">
                  {quickSearches.map((value) => (
                    <Button key={value} type="button" variant="outline" size="sm" onClick={() => chooseQuick(value)}>
                      {value}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SelectedIcon className="h-5 w-5" />
                  Reference Tabs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {SPECTROSCOPY_CATEGORIES.map((item) => {
                    const Icon = categoryIcon(item)
                    return (
                      <Button
                        key={item}
                        type="button"
                        variant={category === item ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setCategory(item)
                          setSelectedSignalId(searchSpectroscopySignals("", item)[0]?.id ?? "")
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {item}
                      </Button>
                    )
                  })}
                </div>

                {signals.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {signals.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => setSelectedSignalId(record.id)}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-colors",
                          selectedSignal?.id === record.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/20 hover:bg-secondary",
                        )}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-semibold">{record.signal}</p>
                          <Badge variant="outline">{record.category}</Badge>
                        </div>
                        <p className="mt-2 font-mono text-sm text-muted-foreground">{record.range}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{record.functionalGroup}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">No spectroscopy records matched that search.</p>
                    <p className="mt-1">Try carbonyl, O-H, proton NMR, molecular ion, or base peak.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedSignal && (
              <Card id="spectroscopy-signal" className="scroll-mt-24 rounded-2xl border-teal-500/20 bg-teal-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpenCheck className="h-5 w-5" />
                    Selected Signal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedSignal.signal}</h2>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">{selectedSignal.range}</p>
                    </div>
                    <Badge>{selectedSignal.category}</Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoBlock label="Functional group" value={selectedSignal.functionalGroup} />
                    <InfoBlock label="Found in" value={selectedSignal.foundIn.join(", ")} />
                  </div>
                  <p className="rounded-xl border border-border bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground">
                    {selectedSignal.explanation}
                  </p>
                  <div>
                    <p className="text-sm font-semibold">Common exam clues</p>
                    <div className="mt-2 grid gap-2">
                      {selectedSignal.examClues.map((clue) => (
                        <div key={clue} className="rounded-xl border border-border bg-background/80 px-3 py-2 text-sm">
                          {clue}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="rounded-xl">
                      <Link href={`/practice-generator?topic=${encodeURIComponent(categoryPracticeTopic(selectedSignal.category))}&subtopic=${encodeURIComponent(selectedSignal.signal)}&source=database`}>
                        Practice This Signal
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href={`/exam-generator?topic=Spectroscopy&subtopic=${encodeURIComponent(selectedSignal.signal)}&source=database`}>
                        Generate Exam Set
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="min-w-0 space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5" />
                  Compound Expected Spectra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid max-h-52 gap-2 overflow-y-auto pr-1">
                  {profiles.map((profile) => (
                    <button
                      key={profile.compoundId}
                      type="button"
                      onClick={() => setSelectedCompoundId(profile.compoundId)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left transition-colors",
                        selectedProfile?.compoundId === profile.compoundId
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/20 hover:bg-secondary",
                      )}
                    >
                      <span className="block font-medium">{profile.compoundName}</span>
                      <span className="block font-mono text-xs text-muted-foreground">{profile.formula}</span>
                    </button>
                  ))}
                </div>

                {selectedProfile ? (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-bold">{selectedProfile.compoundName}</h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{selectedProfile.notes}</p>
                    </div>
                    <SpectraSection title="Expected IR" items={expectedIrSignals.map((signal) => `${signal.signal}: ${signal.range}`)} />
                    <SpectraSection
                      title="Expected 1H NMR"
                      items={selectedProfile.protonNmr.map(
                        (signal) => `${signal.environment}: ${signal.shiftRange}, ${signal.integration}, ${signal.splitting}`,
                      )}
                    />
                    <SpectraSection
                      title="Expected 13C NMR"
                      items={selectedProfile.carbonNmr.map((signal) => `${signal.environment}: ${signal.shiftRange}`)}
                    />
                    <SpectraSection
                      title="Expected Mass Spec"
                      items={selectedProfile.massSpec.map((signal) => `${signal.peak} m/z ${signal.mz}: ${signal.explanation}`)}
                    />
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link href={`/molecular-visualizer?compound=${encodeURIComponent(selectedProfile.compoundId)}#molecule-viewer`}>
                          Open Molecule
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-xl">
                        <Link href={`/practice-generator?topic=Spectroscopy&subtopic=Compound%20Spectra&source=database`}>
                          Practice Compound Spectra
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <FlaskConical className="h-4 w-4" />
                  Deterministic Interpretation
                </div>
                <p>
                  IR is strongest for functional-group clues. NMR helps count environments and locate neighboring atoms.
                  Mass spectrometry supports molecular mass, fragments, and isotope patterns.
                </p>
                <Badge variant="outline" className="rounded-full">
                  No OpenRouter calls
                </Badge>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 px-4 py-3">
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 px-3 py-2">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  )
}

function SpectraSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 space-y-2">
        {items.length ? (
          items.map((item) => (
            <p key={spectroscopySlug(item)} className="text-sm leading-relaxed text-muted-foreground">
              {item}
            </p>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No local signals listed yet.</p>
        )}
      </div>
    </div>
  )
}
