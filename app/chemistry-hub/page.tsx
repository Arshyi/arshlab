"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Atom, BookOpen, Bot, Database, Search, GraduationCap, Orbit, Sparkles, FileQuestion } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState, useMemo } from "react"
import {
  EDUCATION_HUB_SECTIONS,
  getDatabaseMeta,
  searchChemistry,
} from "@/lib/chemistry/database"
import { analytics } from "@/lib/chemistry/database/analytics/tracker"

const LAB_LINKS = [
  { href: "/ai-assistant", label: "AI Chemistry Assistant" },
  { href: "/practice-generator", label: "Practice Generator" },
  { href: "/exam-generator", label: "Exam Generator" },
  { href: "/molecule-builder", label: "Molecule Builder" },
  { href: "/electron-configurations", label: "Electron Configuration Builder" },
  { href: "/bonding-explorer", label: "Bonding Explorer" },
  { href: "/hybridization-builder", label: "Hybridization Builder" },
  { href: "/orbital-viewer", label: "Orbital Viewer" },
  { href: "/spectroscopy-lab", label: "Spectroscopy Lab" },
  { href: "/functional-groups", label: "Functional Groups" },
  { href: "/reaction-lab", label: "Reaction Lab" },
  { href: "/periodic-table", label: "Periodic Table" },
  { href: "/periodic-trends-quiz", label: "Periodic Trends Quiz" },
]

export default function ChemistryHubPage() {
  const [query, setQuery] = useState("")
  const meta = getDatabaseMeta()

  const results = useMemo(() => {
    if (!query.trim()) return []
    const hits = searchChemistry(query, { limit: 12 })
    if (hits.length) analytics.track("search", { query })
    return hits
  }, [query])

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Chemistry Hub</h1>
              <p className="text-muted-foreground">Master database · Search · Education (coming soon)</p>
            </div>
          </div>
        </motion.div>

        <Card className="rounded-2xl mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Global Chemistry Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search compounds, elements, orbitals, reactions…"
              className="h-12 rounded-xl"
            />
            {results.length > 0 && (
              <ul className="space-y-2">
                {results.map((hit) => (
                  <li
                    key={`${hit.record.kind}-${hit.record.id}`}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-2 text-sm"
                  >
                    <span>
                      <span className="font-medium">{hit.record.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {hit.record.kind}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">{hit.matchField}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {Object.entries(meta.counts).map(([key, count]) => (
            <Card key={key} className="rounded-2xl">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold font-mono">{count}</p>
                <p className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Atom className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Element Explorer</h2>
                <p className="text-sm text-muted-foreground">
                  Explore electron configurations, trends, ionization energies, oxidation states,
                  natural forms, and transition-metal colors.
                </p>
              </div>
            </div>
            <Link
              href="/periodic-table"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Periodic Table
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl mb-8 border-teal-500/20 bg-teal-500/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Orbit className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Hybridization Builder</h2>
                <p className="text-sm text-muted-foreground">
                  Build atoms and orbitals interactively, hybridize s/p orbitals, drag atoms together,
                  and visualize sigma/pi overlap.
                </p>
              </div>
            </div>
            <Link
              href="/hybridization-builder"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Builder
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl mb-8 border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">AI Chemistry Assistant</h2>
                <p className="text-sm text-muted-foreground">
                  Ask short chemistry questions with free-model-only guardrails and no saved AI chat history.
                </p>
              </div>
            </div>
            <Link
              href="/ai-assistant"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Assistant
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Practice Generator</h2>
                <p className="text-sm text-muted-foreground">
                  Generate original chemistry practice questions with answers, explanations, and validation guardrails.
                </p>
              </div>
            </div>
            <Link
              href="/practice-generator"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Generator
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl mb-8 border-teal-500/20 bg-teal-500/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <FileQuestion className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Exam Generator</h2>
                <p className="text-sm text-muted-foreground">
                  Generate full chemistry practice exams with answer reveal controls, explanations,
                  and self-marked progress.
                </p>
              </div>
            </div>
            <Link
              href="/exam-generator"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Exam Generator
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 mb-8">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Labs & Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {LAB_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Education Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {EDUCATION_HUB_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border border-border bg-secondary/20 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{section.title}</p>
                    <span className="text-xs rounded-full bg-muted px-2 py-0.5 capitalize">
                      {section.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          ARSHLAB Chemistry Engine v{meta.version} — HS · IB SL/HL · AP · A-Level · University Intro
        </p>
      </div>
    </div>
  )
}
