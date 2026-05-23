"use client"

import { motion } from "framer-motion"
import { Check, Clock, Rocket, Star, Zap, ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { cn } from "@/lib/utils"

type VersionStatus = "released" | "beta" | "coming-soon"

interface PatchNote {
  version: string
  date: string
  status: VersionStatus
  title: string
  changes: string[]
}

const patchNotes: PatchNote[] = [
  {
    version: "0.4.0",
    date: "Coming Soon",
    status: "coming-soon",
    title: "Equation Balancing Beta",
    changes: [
      "Added equation balancing beta",
      "Added support for (aq), (l), (s), (g) state symbols",
      "Added reversible reaction arrows ⇌",
      "Improved reaction parsing system",
      "Added coefficient detection and validation",
    ],
  },
  {
    version: "0.3.0",
    date: "Coming Soon",
    status: "coming-soon",
    title: "Functional Group Recognition",
    changes: [
      "Added alcohol functional group recognition (-OH)",
      "Added carboxylic acid recognition (-COOH)",
      "Added esterification reaction suggestions",
      "Added lone pair visualization placeholders",
      "Improved organic compound detection",
    ],
  },
  {
    version: "0.2.0",
    date: "Coming Soon",
    status: "beta",
    title: "Alkane Generation",
    changes: [
      "Added alkane generation up to 20 carbons long",
      "Basic condensed formula parser implemented",
      "Added support for cycloalkanes",
      "Improved molecule rendering performance",
      "Added branched alkane support (iso-, neo-)",
    ],
  },
  {
    version: "0.1.0",
    date: "Current",
    status: "released",
    title: "Initial ARSHLAB Launch",
    changes: [
      "Landing page completed with modern design",
      "Molecule Builder UI added with input system",
      "Reaction Lab UI added with equation input",
      "Account system placeholder added",
      "Patch notes system implemented",
      "Responsive mobile-friendly layout",
      "Navigation between all sections",
    ],
  },
]

const roadmap = [
  { label: "2D Structure Rendering", status: "in-progress" as const },
  { label: "3D Molecule Visualization", status: "planned" as const },
  { label: "Polarity Calculations", status: "planned" as const },
  { label: "Bond Angle Display", status: "planned" as const },
  { label: "Hybridization Detection", status: "planned" as const },
  { label: "Reaction Mechanism Diagrams", status: "planned" as const },
  { label: "User Account System", status: "planned" as const },
  { label: "Saved Molecule History", status: "planned" as const },
]

const statusConfig = {
  released: { label: "Released", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Check },
  beta: { label: "Beta", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", icon: Zap },
  "coming-soon": { label: "Coming Soon", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
}

function StatusBadge({ status }: { status: VersionStatus }) {
  const config = statusConfig[status]
  const Icon = config.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function VersionCard({ note, defaultExpanded = false }: { note: PatchNote; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <Card className="rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="flex flex-row items-center justify-between gap-4 p-5 hover:bg-secondary/30 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono font-bold">
              {note.version}
            </div>
            <div>
              <CardTitle className="text-lg">{note.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">{note.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={note.status} />
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          </div>
        </CardHeader>
      </button>
      
      {expanded && (
        <CardContent className="px-5 pb-5 pt-0">
          <ul className="space-y-2 border-l-2 border-border pl-4 ml-6">
            {note.changes.map((change, i) => (
              <li key={i} className="text-sm text-muted-foreground relative before:absolute before:-left-[21px] before:top-2 before:h-2 before:w-2 before:rounded-full before:bg-accent">
                {change}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}

export default function PatchNotesPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Rocket className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Patch Notes
              </h1>
              <p className="text-muted-foreground">Development Progress & Changelog</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Track what chemistry functionality has been implemented and what&apos;s coming next. 
            ARSHLAB is actively developed with new features added regularly.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
          {/* Version History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {patchNotes.map((note, i) => (
              <VersionCard key={note.version} note={note} defaultExpanded={i === patchNotes.length - 1} />
            ))}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Roadmap */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5" />
                  Roadmap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {roadmap.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      item.status === "in-progress" ? "bg-yellow-500" : "bg-muted-foreground/30"
                    )} />
                    <span className={cn(
                      "text-sm",
                      item.status === "in-progress" ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {item.label}
                    </span>
                    {item.status === "in-progress" && (
                      <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="rounded-2xl bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg">Project Stats</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{patchNotes.length}</p>
                  <p className="text-sm opacity-80">Versions</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{patchNotes.reduce((acc, n) => acc + n.changes.length, 0)}</p>
                  <p className="text-sm opacity-80">Changes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{roadmap.length}</p>
                  <p className="text-sm opacity-80">Planned</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">1</p>
                  <p className="text-sm opacity-80">In Progress</p>
                </div>
              </CardContent>
            </Card>

            {/* Contribute */}
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Have a feature request or found a bug? 
                  <br />
                  <span className="text-foreground font-medium">Feedback coming soon!</span>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
