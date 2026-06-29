"use client"

import Link from "next/link"
import { Atom, BookOpen, Brain, FlaskConical, Network, ShieldAlert, Waves } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CompoundIntelligence } from "@/lib/chemistry-intelligence/types"

interface ChemistryIntelligencePanelProps {
  intelligence: CompoundIntelligence | null
}

function ConfidenceBadge({ value }: { value: number }) {
  return (
    <Badge variant={value >= 80 ? "default" : "outline"} className="rounded-full">
      {value}% confidence
    </Badge>
  )
}

function ChipList({ values }: { values: string[] }) {
  if (!values.length) return <p className="text-sm text-muted-foreground">No deterministic records found yet.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Badge key={value} variant="secondary" className="rounded-full">
          {value}
        </Badge>
      ))}
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

export function ChemistryIntelligencePanel({ intelligence }: ChemistryIntelligencePanelProps) {
  if (!intelligence) return null

  const property = intelligence.properties
  const links = intelligence.resources.slice(0, 6)

  return (
    <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5" id="chemistry-intelligence">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Brain className="h-5 w-5" />
              Chemistry Intelligence Engine
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Deterministic chemistry interpretation from the selected canonical molecular graph.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full">ARSHLAB v7.0.0</Badge>
            <ConfidenceBadge value={intelligence.confidence.overall} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Identity</p>
                <h3 className="mt-1 text-2xl font-bold">{intelligence.identity.name}</h3>
                <p className="font-mono text-sm text-muted-foreground">{intelligence.identity.formula}</p>
              </div>
              <ConfidenceBadge value={intelligence.identity.confidence} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniMetric label="Vision" value={`${intelligence.confidence.vision}%`} />
              <MiniMetric label="Graph" value={`${intelligence.confidence.graph}%`} />
              <MiniMetric label="Chemistry" value={`${intelligence.confidence.chemistry}%`} />
              <MiniMetric label="Knowledge" value={`${intelligence.confidence.knowledge}%`} />
            </div>
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Matched by</p>
              <ChipList values={intelligence.identity.matchedBy} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Atom className="h-4 w-4" />
              Properties
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <MiniMetric label="Molar mass" value={property.molarMass ? `${property.molarMass} g/mol` : "Unavailable"} />
              <MiniMetric label="Aromatic" value={property.aromatic ? "Yes" : "No"} />
              <MiniMetric label="Rings" value={property.ringCount} />
              <MiniMetric label="H-bond donors" value={property.hydrogenBondDonorCount} />
              <MiniMetric label="H-bond acceptors" value={property.hydrogenBondAcceptorCount} />
              <MiniMetric label="State" value={property.physicalState} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{property.hybridizationSummary}</p>
            <p className="mt-2 text-sm text-muted-foreground">{property.estimatedSolubilityClass}</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="font-semibold">Functional Groups</p>
            <div className="mt-3 space-y-2">
              {intelligence.functionalGroups.slice(0, 6).map((group) => (
                <div key={group.id} className="rounded-lg bg-secondary/40 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{group.label}</span>
                    <span className="text-xs text-muted-foreground">{group.confidence}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{group.hierarchy.join(" > ")}</p>
                </div>
              ))}
              {!intelligence.functionalGroups.length && <p className="text-sm text-muted-foreground">No functional group hierarchy could be resolved yet.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="font-semibold">Scaffold and Family</p>
            <div className="mt-3 space-y-3">
              <ChipList values={intelligence.scaffolds.map((item) => `${item.name} (${item.confidence}%)`)} />
              <ChipList values={intelligence.families.map((item) => item.label)} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Waves className="h-4 w-4" />
              Spectroscopy
            </p>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {intelligence.spectroscopy.summary.slice(0, 5).map((line) => (
                <p key={line}>{line}</p>
              ))}
              {!intelligence.spectroscopy.summary.length && <p>No spectroscopy record is connected yet.</p>}
            </div>
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-xl">
              <Link href={intelligence.spectroscopy.href}>View Spectra</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <FlaskConical className="h-4 w-4" />
              Known Reactions and Mechanisms
            </p>
            <div className="mt-3 space-y-3">
              {intelligence.reactions.slice(0, 4).map((reaction) => (
                <div key={reaction.id} className="rounded-lg bg-secondary/40 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={reaction.href} className="font-medium hover:underline">{reaction.name}</Link>
                    <Badge variant="outline" className="rounded-full">{reaction.difficulty}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{reaction.mechanismFamily}</p>
                </div>
              ))}
              {!intelligence.reactions.length && <p className="text-sm text-muted-foreground">No reaction records are linked yet.</p>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {intelligence.mechanisms.map((item) => (
                <Button key={item.href} asChild variant="outline" size="sm" className="rounded-xl">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <BookOpen className="h-4 w-4" />
              Learning Resources
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {links.map((item) => (
                <Button key={item.href} asChild variant="outline" size="sm" className="justify-start rounded-xl">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {intelligence.curriculum.map((item) => (
                <p key={item.href} className="text-sm text-muted-foreground">
                  <Link href={item.href} className="font-medium text-foreground hover:underline">{item.label}</Link>: {item.reason}
                </p>
              ))}
            </div>
          </div>
        </section>

        {intelligence.safety.length > 0 && (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              Safety Context
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              {intelligence.safety.slice(0, 5).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-border bg-background/80 p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Network className="h-4 w-4" />
            Explain Why
          </p>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            {intelligence.explainWhy.map((line) => (
              <li key={line} className="rounded-lg bg-secondary/40 p-2">{line}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full">{intelligence.knowledgeGraph.nodes.length} intelligence nodes</Badge>
            <Badge variant="outline" className="rounded-full">{intelligence.knowledgeGraph.edges.length} links</Badge>
            <Badge variant="outline" className="rounded-full">{intelligence.knowledgeGraph.linkedModules.length} ARSHLAB modules</Badge>
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
