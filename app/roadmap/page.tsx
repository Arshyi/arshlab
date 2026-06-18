"use client"

import { motion } from "framer-motion"
import { Map, Check, Hammer, Lightbulb, ScanSearch } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const completed = [
  "Molecule Builder",
  "Reaction Lab",
  "Functional Groups",
  "Spectroscopy Lab",
  "Orbital Viewer",
  "Periodic Table",
  "Chemistry Database",
  "Chemistry Knowledge Core",
  "Spectroscopy Knowledge Core",
  "Database Generated Question Engine",
  "Deterministic Exam Engine",
  "Adaptive Learning Engine",
  "Adaptive Learning Engine Hardening",
  "Chemistry Reaction Engine",
  "Molecular Visualization Engine",
  "Molecular Visualization Refinement",
  "Organic Mechanism Trainer",
  "Chemistry Solver Engine",
  "Formula Sheet Engine",
  "Curriculum Roadmap Engine",
  "Molecular Visualizer",
  "Visual Reaction Pathways",
  "Reaction Database",
  "Reaction Prediction Engine",
  "Reaction Balancing Practice",
  "Learning Dashboard",
  "Personal Study Plan",
  "Exam Readiness Index",
  "Chemistry Hub",
  "Hybridization Builder Alpha",
  "AI Chemistry Assistant Alpha",
  "Practice Generator Plus",
  "Exam Generator Alpha",
  "Study Mode & Adaptive Learning",
  "Recovery Mode",
  "Mistake Analytics & Mastery Tracking",
  "Automatic Subtopic Classification",
  "PDF Export System",
  "Diagnostic Assessment & Placement Engine",
  "Curriculum Engine",
  "Context-Aware Deep Linking",
  "Reaction Explorer / Knowledge Graph",
  "Graph and Periodic Table Layout Polish",
  "Adaptive Study Mode",
  "Molecular Structure Scanner",
]

const inDevelopment = [
  "Practice Papers",
  "Video Solutions",
  "Educational Content Library",
]

const planned = [
  "User Accounts",
  "Search History",
  "Saved Compounds",
  "Saved Reactions",
  "Saved Generated Practice Sets",
  "Mobile Application",
  "Community Features",
]

function RoadmapSection({
  title,
  items,
  icon: Icon,
  iconClass,
  dotClass,
}: {
  title: string
  items: string[]
  icon: React.ElementType
  iconClass: string
  dotClass?: string
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconClass)}>
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-3">
              {dotClass ? (
                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotClass)} />
              ) : (
                <Check className="h-4 w-4 text-green-600 shrink-0" />
              )}
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function RoadmapPage() {
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
              <Map className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Roadmap</h1>
              <p className="text-muted-foreground">
                Where ARSHLAB is today and where it&apos;s heading
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mt-4">
            ARSHLAB is evolving from a chemistry visualization platform into a broader STEM
            educational ecosystem — chemistry-first, with room to grow into mathematics, physics,
            and engineering.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-6 lg:grid-cols-3"
        >
          <RoadmapSection
            title="Completed"
            items={completed}
            icon={Check}
            iconClass="bg-green-500/10 text-green-600"
          />
          <RoadmapSection
            title="In Development"
            items={inDevelopment}
            icon={Hammer}
            iconClass="bg-yellow-500/10 text-yellow-600"
            dotClass="bg-yellow-500/60"
          />
          <RoadmapSection
            title="Planned"
            items={planned}
            icon={Lightbulb}
            iconClass="bg-blue-500/10 text-blue-600"
            dotClass="bg-muted-foreground/30"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <Card className="rounded-2xl border-green-500/20 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                  <ScanSearch className="h-4 w-4" />
                </div>
                Molecular Structure Scanner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Now available: upload or describe a molecule, match it against ARSHLAB&apos;s local
                chemistry records, and open linked visualizers, reactions, formulas, practice, exams,
                and curriculum topics.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          ARSHLAB v4.5.0 - Molecular Structure Scanner
        </motion.p>
      </div>
    </div>
  )
}
