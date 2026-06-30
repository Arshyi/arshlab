"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRightLeft, Atom, Award, Beaker, BookOpen, BookOpenCheck, Bot, Calculator, Database, FlaskConical, Gauge, Search, GraduationCap, Orbit, Route, Sparkles, FileQuestion, Target, ClipboardCheck, ClipboardList, ListChecks, Waves, Network, ScanSearch } from "lucide-react"
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
  { href: "/formula-sheet", label: "Formula Sheet" },
  { href: "/chemistry-solver", label: "Chemistry Solver" },
  { href: "/chemistry-database", label: "Chemistry Database" },
  { href: "/structure-scanner", label: "Structure Scanner" },
  { href: "/lab-explorer", label: "Lab Explorer" },
  { href: "/synthesis-explorer", label: "Synthesis Explorer" },
  { href: "/molecular-visualizer", label: "Molecular Visualizer" },
  { href: "/reaction-explorer", label: "Reaction Explorer" },
  { href: "/mechanism-trainer", label: "Mechanism Trainer" },
  { href: "/reaction-database", label: "Reaction Database" },
  { href: "/reaction-database?query=reagent", label: "Reaction Conditions" },
  { href: "/question-engine", label: "Question Engine" },
  { href: "/exam-engine", label: "Exam Engine" },
  { href: "/curriculum", label: "Curriculum Engine" },
  { href: "/learning-dashboard", label: "Learning Dashboard" },
  { href: "/study-plan", label: "Study Plan" },
  { href: "/diagnostic", label: "Diagnostic Assessment" },
  { href: "/study", label: "Study Mode" },
  { href: "/recovery", label: "Recovery Mode" },
  { href: "/practice-generator", label: "Practice Generator" },
  { href: "/exam-generator", label: "Exam Generator" },
  { href: "/molecule-builder", label: "Molecule Builder" },
  { href: "/electron-configurations", label: "Electron Configuration Builder" },
  { href: "/bonding-explorer", label: "Bonding Explorer" },
  { href: "/hybridization-builder", label: "Hybridization Builder" },
  { href: "/orbital-viewer", label: "Orbital Viewer" },
  { href: "/spectroscopy-explorer", label: "Spectroscopy Explorer" },
  { href: "/spectroscopy", label: "Spectroscopy Reference" },
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
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Curriculum Engine</h2>
                <p className="text-sm text-muted-foreground">
                  Follow deterministic General Chemistry and Organic Chemistry roadmaps,
                  track topic completion, and open the right ARSHLAB tool for each topic.
                </p>
              </div>
            </div>
            <Link
              href="/curriculum"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Curriculum
            </Link>
          </CardContent>
        </Card>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Gauge className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Learning Dashboard</h2>
                  <p className="text-sm text-muted-foreground">
                    Review overall mastery, curriculum progress, diagnostic coverage, exam readiness,
                    streaks, weak areas, strong areas, and recommended next actions.
                  </p>
                </div>
              </div>
              <Link
                href="/learning-dashboard"
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Open Dashboard
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Route className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Study Plan</h2>
                  <p className="text-sm text-muted-foreground">
                    Get today&apos;s practice and recovery actions, this week&apos;s unit plan,
                    and a long-term curriculum completion roadmap.
                  </p>
                </div>
              </div>
              <Link
                href="/study-plan"
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Open Plan
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Exam Readiness</h2>
                  <p className="text-sm text-muted-foreground">
                    Check the 0-100 readiness index, strongest topics, weakest topics,
                    and recommended exam focus areas.
                  </p>
                </div>
              </div>
              <Link
                href="/learning-dashboard#exam-readiness"
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                View Readiness
              </Link>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold">Achievements</h2>
                  <p className="text-sm text-muted-foreground">
                    Track adaptive learning milestones including diagnostics, recovery, database practice,
                    spectroscopy, curriculum mastery, and long-term question goals.
                  </p>
                </div>
              </div>
              <Link
                href="/learning-dashboard#achievements"
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                View Achievements
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl mb-8 border-teal-500/20 bg-teal-500/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Chemistry Database</h2>
                <p className="text-sm text-muted-foreground">
                  Browse ARSHLAB&apos;s local knowledge core for compounds, ions, functional groups,
                  and starter reaction templates.
                </p>
              </div>
            </div>
            <Link
              href="/chemistry-database"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Database
            </Link>
          </CardContent>
        </Card>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <HubActionCard
            icon={BookOpenCheck}
            title="Formula Sheet"
            description="Search formulas, variables, units, when-to-use notes, common mistakes, and worked examples from the local formula handbook."
            href="/formula-sheet"
            action="Open Formula Sheet"
          />
          <HubActionCard
            icon={Calculator}
            title="Chemistry Solver"
            description="Solve molarity, dilution, percent yield, empirical formula, gas law, calorimetry, pH, and stoichiometry problems step by step."
            href="/chemistry-solver"
            action="Open Solver"
          />
            <HubActionCard
              icon={ScanSearch}
              title="Molecular Structure Scanner"
              description="Upload or capture a local structure snapshot, compile visual tokens into rollback-safe optimized molecular IR, then inspect functional groups, scaffolds, properties, spectra, reactions, and study links."
              href="/structure-scanner"
              action="Open Scanner"
            />
          <HubActionCard
            icon={ClipboardList}
            title="Lab Explorer"
            description="Review lab techniques, glassware, safety, common mistakes, lab-report checklists, and deterministic lab skills practice."
            href="/lab-explorer"
            action="Open Lab Explorer"
          />
          <HubActionCard
            icon={Route}
            title="Synthesis Pathway Explorer"
            description="Find shortest deterministic pathways between compounds using the existing Reaction Explorer chemistry graph."
            href="/synthesis-explorer"
            action="Find Pathway"
          />
          <HubActionCard
            icon={Network}
            title="Molecular Visualizer"
            description="Explore deterministic 2D molecule sketches, functional group highlights, reaction diagrams, and pathway examples."
            href="/molecular-visualizer"
            action="Open Visualizer"
          />
          <HubActionCard
            icon={Network}
            title="Reaction Explorer"
            description="Explore a deterministic chemistry graph connecting compounds, functional groups, reactions, mechanisms, formulas, solvers, and practice."
            href="/reaction-explorer"
            action="Open Explorer"
          />
          <HubActionCard
            icon={Network}
            title="Visual Reaction Pathways"
            description="Follow alkane-to-ester, benzene functionalization, and ethene-to-ester pathways with molecule cards."
            href="/molecular-visualizer#pathways"
            action="View Pathways"
          />
          <HubActionCard
            icon={FlaskConical}
            title="Mechanism Trainer"
            description="Step through deterministic organic mechanisms with highlighted atoms, highlighted bonds, and next-step prediction practice."
            href="/mechanism-trainer"
            action="Open Trainer"
          />
          <HubActionCard
            icon={Beaker}
            title="Reaction Conditions"
            description="Review reagents, catalysts, solvents, temperature, pressure, yield notes, safety notes, and common mistakes."
            href="/reaction-database?query=reagent"
            action="Open Conditions"
          />
          <HubActionCard
            icon={ArrowRightLeft}
            title="Reaction Database"
            description="Browse deterministic reaction records for balancing, prediction, classification, and curriculum-aligned practice."
            href="/reaction-database"
            action="Open Reactions"
          />
          <HubActionCard
            icon={Sparkles}
            title="Reaction Predictor"
            description="Practice missing-product and product-set prediction questions generated from the local reaction engine."
            href="/practice-generator?topic=Reaction%20Prediction&source=database"
            action="Practice Prediction"
          />
          <HubActionCard
            icon={ListChecks}
            title="Balancing Practice"
            description="Generate deterministic balancing questions from skeleton equations without using AI requests."
            href="/practice-generator?topic=Reaction%20Balancing&source=database"
            action="Balance Equations"
          />
          <HubActionCard
            icon={Gauge}
            title="Reaction Mastery"
            description="Track reaction attempts, weakest reaction concepts, and reaction achievements from saved progress."
            href="/progress"
            action="View Progress"
          />
        </div>

        <Card className="rounded-2xl mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ListChecks className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Question Engine</h2>
                <p className="text-sm text-muted-foreground">
                  Generate local database-backed chemistry questions with deterministic templates,
                  source badges, and zero AI token usage.
                </p>
              </div>
            </div>
            <Link
              href="/question-engine"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Engine
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
                <h2 className="font-semibold">Exam Engine</h2>
                <p className="text-sm text-muted-foreground">
                  Assemble deterministic chemistry exams from local blueprints and database-backed questions
                  without API calls or token usage.
                </p>
              </div>
            </div>
            <Link
              href="/exam-engine"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Exam Engine
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl mb-8 border-teal-500/20 bg-teal-500/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Diagnostic Assessment</h2>
                <p className="text-sm text-muted-foreground">
                  Take a placement-style chemistry checkup, identify weak topics and subtopics,
                  and export diagnostic reports with recommended study order.
                </p>
              </div>
            </div>
            <Link
              href="/diagnostic"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Take Diagnostic
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Study Mode</h2>
                <p className="text-sm text-muted-foreground">
                  Practice one question at a time with immediate feedback, streaks, XP, daily goals,
                  achievements, adaptive recovery sets, and printable PDF exports.
                </p>
              </div>
            </div>
            <Link
              href="/study"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Start Study Mode
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-2xl mb-8 border-orange-500/20 bg-orange-500/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Recovery Mode</h2>
                <p className="text-sm text-muted-foreground">
                  Detect weak topics and concepts, generate adaptive recovery sessions, and export printable PDFs with mastery summaries.
                </p>
              </div>
            </div>
            <Link
              href="/recovery"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Start Recovery
            </Link>
          </CardContent>
        </Card>

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

        <Card className="rounded-2xl mb-8 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Waves className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Spectroscopy Explorer</h2>
                <p className="text-sm text-muted-foreground">
                  Browse IR, 1H NMR, 13C NMR, and mass spectrometry records, expected compound spectra,
                  and deterministic spectroscopy practice without AI calls.
                </p>
              </div>
            </div>
            <Link
              href="/spectroscopy-explorer"
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Open Explorer
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
                  Generate original chemistry practice questions with answers, explanations, validation guardrails, and PDF export.
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
                  self-marked progress, and printable exam PDFs.
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

function HubActionCard({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  href: string
  action: string
}) {
  return (
    <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Link
          href={href}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          {action}
        </Link>
      </CardContent>
    </Card>
  )
}
