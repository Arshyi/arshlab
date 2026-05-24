"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Layers,
  Search,
  Droplets,
  Zap,
  FlaskConical,
  BookOpen,
  Radio,
  Atom,
  ArrowRight,
  X,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { functionalGroups, type FunctionalGroup } from "@/lib/chemistry/functional-groups"
import { getCompoundsForFunctionalGroup } from "@/lib/chemistry/functional-group-detection"
import { getFgColors } from "@/lib/fg-colors"

export default function FunctionalGroupsPage() {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<FunctionalGroup | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return functionalGroups
    return functionalGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.representativeClass.toLowerCase().includes(q) ||
        g.searchKeywords.some((k) => k.includes(q))
    )
  }, [query])

  const exampleCompounds = selected
    ? getCompoundsForFunctionalGroup(selected.id).slice(0, 8)
    : []

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Functional Groups</h1>
              <p className="text-muted-foreground">IB Chemistry HL — 9 core organic groups</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mt-4">
            Explore structures, properties, spectroscopy hints, and example molecules for each IB HL functional group.
          </p>
        </motion.div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups, e.g. alcohol, amine, ketone..."
            className="pl-10 h-11 rounded-xl"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((group, i) => {
              const colors = getFgColors(group.color)
              return (
                <motion.button
                  key={group.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(group)}
                  className={cn(
                    "text-left rounded-2xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02] hover:shadow-lg",
                    colors.card,
                    selected?.id === group.id && `ring-2 ${colors.ring}`
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-foreground leading-tight">{group.name}</h3>
                    <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium", colors.badge)}>
                      {group.representativeClass.split(" ")[0]}
                    </span>
                  </div>
                  <p className="font-mono text-sm text-foreground/80 mb-3">{group.structures.join(" ")}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{group.explanation}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[10px]">
                      <Zap className="h-3 w-3" /> {group.polarity}
                    </span>
                    {group.hydrogenBonding && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[10px]">
                        <Droplets className="h-3 w-3" /> H-bond
                      </span>
                    )}
                    {group.acidityBasicity && (
                      <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px]">
                        {group.acidityBasicity.split("(")[0].trim()}
                      </span>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>

          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="lg:sticky lg:top-24 h-fit"
              >
                <Card className="rounded-2xl overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-xl">{selected.name}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground">{selected.generalFormula}</p>
                  </CardHeader>
                  <CardContent className="space-y-5 max-h-[70vh] overflow-y-auto">
                    <p className="text-sm text-muted-foreground leading-relaxed">{selected.explanation}</p>

                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Text-art</h4>
                      {selected.structureArtExamples.map((art) => (
                        <pre key={art} className="font-mono text-sm bg-secondary/50 rounded-lg p-3 mb-2">
                          {art}
                        </pre>
                      ))}
                    </div>

                    <Section title="Properties" icon={Zap}>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {selected.properties.map((p) => (
                          <li key={p} className="flex gap-2">
                            <span className="text-accent">•</span> {p}
                          </li>
                        ))}
                      </ul>
                    </Section>

                    <Section title="IUPAC Naming" icon={BookOpen}>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {selected.iupacNamingRules.map((r) => (
                          <li key={r}>{r}</li>
                        ))}
                      </ul>
                    </Section>

                    <Section title="IR Ranges" icon={Radio}>
                      {selected.irAbsorptionRanges.map((ir) => (
                        <div key={ir.range} className="text-sm mb-2">
                          <span className="font-mono text-accent">{ir.range}</span>
                          <span className="text-muted-foreground"> — {ir.description}</span>
                        </div>
                      ))}
                    </Section>

                    <Section title="NMR Hints" icon={Atom}>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {selected.nmrHints.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    </Section>

                    <Section title="Mass Spec" icon={FlaskConical}>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {selected.msFragmentationNotes.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    </Section>

                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                        Example Molecules
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {exampleCompounds.map((c) => (
                          <Link
                            key={c.name}
                            href={`/molecule-builder?q=${encodeURIComponent(c.name)}`}
                            className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm capitalize hover:bg-secondary transition-colors"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <Link href={`/spectroscopy-lab`}>
                      <Button variant="outline" className="w-full rounded-xl gap-2">
                        Open Spectroscopy Lab <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>

                    <p className="text-[10px] text-muted-foreground text-center italic">
                      Reaction animations — coming in a future update
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hidden lg:flex items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 min-h-[400px] p-8"
              >
                <div className="text-center text-muted-foreground">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Select a functional group to explore details</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h4>
      {children}
    </div>
  )
}
