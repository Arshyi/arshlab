"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Atom, RotateCcw, History, Eye, Zap, Hexagon, Droplets, Ruler, Triangle, Search, AlertCircle, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getSuggestions, type Compound } from "@/lib/chemistry/compounds"
import { searchExtended, type CategorySearchResult } from "@/lib/chemistry/functional-group-detection"
import { MoleculeResultCard } from "@/components/molecule-result-card"
import { addMoleculeHistory } from "@/lib/guest-history"

const examples = [
  "ethanol",
  "amine",
  "ketone",
  "propanone",
  "methyl ethanoate",
  "benzene",
]

const futureFeatures = [
  { icon: Eye, label: "Partial Charges", description: "Visualize δ+ and δ- on atoms" },
  { icon: Zap, label: "Polarity", description: "Show molecular dipole moments" },
  { icon: Ruler, label: "Bond Angles", description: "Display precise bond angles" },
  { icon: Hexagon, label: "Hybridization", description: "sp, sp², sp³ orbital states" },
  { icon: Triangle, label: "H-Bonding", description: "Highlight hydrogen bond sites" },
]

export default function MoleculeBuilderPage() {
  return (
    <Suspense fallback={<motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 text-center text-muted-foreground">Loading...</motion.div>}>
      <MoleculeBuilderContent />
    </Suspense>
  )
}

function MoleculeBuilderContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") ?? ""

  const [moleculeInput, setMoleculeInput] = useState(initialQuery)
  const [history, setHistory] = useState<string[]>([])
  const [result, setResult] = useState<Compound | null>(null)
  const [categoryResult, setCategoryResult] = useState<CategorySearchResult | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showLonePairs, setShowLonePairs] = useState(false)
  const [showSymmetry, setShowSymmetry] = useState(true)
  const [showStudyMode, setShowStudyMode] = useState(false)
  const [alternateOrientation, setAlternateOrientation] = useState(false)

  // Get suggestions based on input
  const suggestions = useMemo(() => {
    if (!moleculeInput.trim() || moleculeInput.length < 2) return []
    return getSuggestions(moleculeInput, 6)
  }, [moleculeInput])

  // Hide suggestions when clicking outside
  useEffect(() => {
    const handleClick = () => setShowSuggestions(false)
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  useEffect(() => {
    if (initialQuery) handleSearch(initialQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery])

  function handleSearch(query?: string) {
    const searchQuery = query || moleculeInput
    if (!searchQuery.trim()) return

    const extended = searchExtended(searchQuery)

    if (extended?.type === "compound" && extended.compoundResult) {
      const compound = extended.compoundResult.compound
      setResult(compound)
      setCategoryResult(null)
      setAlternateOrientation(extended.compoundResult.alternateOrientation ?? false)
      setNotFound(false)
      setMoleculeInput(compound.name)
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.toLowerCase() !== compound.name.toLowerCase())
        return [compound.name, ...filtered.slice(0, 5)]
      })
      addMoleculeHistory({
        query: searchQuery.trim(),
        resolvedName: compound.name,
        formula: compound.formula,
        family: compound.family,
      })
    } else if (extended?.type === "category" && extended.category) {
      setResult(null)
      setCategoryResult(extended.category)
      setAlternateOrientation(false)
      setNotFound(false)
      setMoleculeInput(searchQuery)
    } else {
      setResult(null)
      setCategoryResult(null)
      setAlternateOrientation(false)
      setNotFound(true)
    }
    setShowSuggestions(false)
  }

  function handleClear() {
    setMoleculeInput("")
    setResult(null)
    setCategoryResult(null)
    setNotFound(false)
    setAlternateOrientation(false)
  }

  function handleSuggestionClick(compound: Compound) {
    setMoleculeInput(compound.name)
    handleSearch(compound.name)
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Molecule Builder
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Search by IUPAC name, common name, or formula to explore molecular structures.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Main Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Molecule Search</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Input
                        value={moleculeInput}
                        onChange={(e) => {
                          setMoleculeInput(e.target.value)
                          setShowSuggestions(true)
                          setNotFound(false)
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Example: propan-1-ol, ethanol, CH3COOH"
                        className="h-12 rounded-xl text-base pr-10"
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      
                      {/* Suggestions Dropdown */}
                      <AnimatePresence>
                        {showSuggestions && suggestions.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {suggestions.map((compound) => (
                              <button
                                key={compound.name}
                                onClick={() => handleSuggestionClick(compound)}
                                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
                              >
                                <div>
                                  <p className="font-medium text-foreground capitalize">{compound.name}</p>
                                  <p className="text-xs text-muted-foreground">{compound.family} • {compound.formula}</p>
                                </div>
                                <span className="text-xs text-muted-foreground font-mono">{compound.formula}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleSearch()} className="h-12 rounded-xl px-6">
                        Search
                      </Button>
                      <Button onClick={handleClear} variant="outline" className="h-12 w-12 rounded-xl p-0">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => {
                        setMoleculeInput(ex)
                        handleSearch(ex)
                      }}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Result or Placeholder */}
            <AnimatePresence mode="wait">
              {result ? (
                <MoleculeResultCard
                  key={result.name}
                  compound={result}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  alternateOrientation={alternateOrientation}
                  showLonePairs={showLonePairs}
                  onShowLonePairsChange={setShowLonePairs}
                  showSymmetry={showSymmetry}
                  onShowSymmetryChange={setShowSymmetry}
                  showStudyMode={showStudyMode}
                  onShowStudyModeChange={setShowStudyMode}
                />
              ) : categoryResult ? (
                <motion.div
                  key="category"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Layers className="h-5 w-5" />
                        {categoryResult.categoryName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {categoryResult.compounds.length} molecules in this category
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {categoryResult.compounds.slice(0, 12).map((c) => (
                          <button
                            key={c.name}
                            onClick={() => handleSearch(c.name)}
                            className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3 text-left hover:bg-secondary transition-colors"
                          >
                            <span className="capitalize font-medium">{c.name}</span>
                            <span className="text-xs font-mono text-muted-foreground">{c.formula}</span>
                          </button>
                        ))}
                      </div>
                      <Link href="/functional-groups" className="inline-block mt-4">
                        <Button variant="outline" size="sm" className="rounded-lg">
                          Explore functional group details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : notFound ? (
                <motion.div
                  key="not-found"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="rounded-2xl border-destructive/30 bg-destructive/5">
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Molecule Not Found</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          &quot;{moleculeInput}&quot; is not in the ARSHLAB database yet. Try searching for common alkanes, alkenes, alcohols, or carboxylic acids.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-lg">Structure Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex min-h-[300px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 p-6">
                        <div className="text-center">
                          <Atom className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-semibold text-foreground">Search for a Molecule</h3>
                          <p className="mt-2 max-w-md text-sm text-muted-foreground">
                            Type a molecule name or formula above, or click an example to get started.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Future Features Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {futureFeatures.map((feature) => (
                <Card key={feature.label} className="rounded-2xl border-border/50 bg-card/80">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <feature.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{feature.label}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Recent Molecules */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="h-5 w-5" />
                  Recent Molecules
                </CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Your recent molecules will appear here after you search them.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item, index) => (
                      <button
                        key={`${item}-${index}`}
                        onClick={() => {
                          setMoleculeInput(item)
                          handleSearch(item)
                        }}
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3 text-left transition-colors hover:bg-secondary"
                      >
                        <span className="text-sm text-foreground capitalize">{item}</span>
                        <span className="text-xs text-muted-foreground">Open</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supported Compounds */}
            <Card className="rounded-2xl bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg">Supported Compounds</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-80 mb-4">
                  ARSHLAB currently supports:
                </p>
                <div className="space-y-2 text-sm">
                  {[
                    "Alkanes (C1-C20)",
                    "Alkenes (C2-C20)",
                    "Alkynes (C2-C20)",
                    "Alcohols (C1-C20)",
                    "Carboxylic Acids (C1-C20)",
                    "Primary Amines (NH2)",
                    "Halogenoalkanes",
                    "Aldehydes & Ketones",
                    "Ethers & Amides",
                    "Simple Esters",
                    "Benzene & Phenol",
                    "Glucose & Glycogen",
                  ].map((family) => (
                    <div key={family} className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground/50" />
                      <span className="opacity-90">{family}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
