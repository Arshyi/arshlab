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
    version: "1.5.0",
    date: "Current",
    status: "released",
    title: "Bond Energy & Orbital Overlap Explorer",
    changes: [
      "Added Interactive Bonding Explorer",
      "Added potential energy vs internuclear distance graph",
      "Added sigma overlap visualization",
      "Added pi overlap visualization",
      "Added electron cloud overlap mode",
      "Added space-filling mode",
      "Added force arrows for attraction and repulsion",
      "Added bond length marker",
      "Added Morse-potential-style educational curve",
      "Added presets for H-H, H-F, F-F, Cl-Cl, O=O, N2, C=C, C2, He-He, and Ne-Ne",
      "Added educational explanations for bond formation",
    ],
  },
  {
    version: "1.4.0",
    date: "Previous",
    status: "released",
    title: "Electron Configurations & Periodic Trends",
    changes: [
      "Added Interactive Electron Configuration Builder",
      "Added orbital filling animation",
      "Added teaching exceptions for Cr, Cu, Ag, Au, and Mo",
      "Added periodic trend heatmaps",
      "Added trend comparison tool",
      "Added Periodic Trends Quiz",
      "Added educational trend explanations",
    ],
  },
  {
    version: "1.3.0",
    date: "Previous",
    status: "released",
    title: "Element Profile Upgrade",
    changes: [
      "Added richer element profile cards",
      "Added electron configuration and noble gas notation",
      "Added orbital box diagrams",
      "Added periodic property panels",
      "Added oxidation state data",
      "Added natural elemental forms",
      "Added octet-rule exception examples",
      "Added transition metal color and wavelength cards",
    ],
  },
  {
    version: "1.2.0",
    date: "Previous",
    status: "released",
    title: "Temporary Guest History",
    changes: [
      "Added temporary guest history",
      "Added History page",
      "Molecule searches now save locally for the current session",
      "Reaction searches now save locally for the current session",
      "Added clear history controls",
      "No account required",
    ],
  },
  {
    version: "1.1.0",
    date: "Previous",
    status: "released",
    title: "Creator and Learning Ecosystem Release",
    changes: [
      "About Creator page with profile, biography, and mission statement",
      "Social links section (YouTube channel linked)",
      "Practice Papers hub with filters and sample metadata entries",
      "Video Solutions hub with category browsing and coming soon entries",
      "Roadmap page with completed, in development, and planned features",
      "Learning Ecosystem section on homepage",
      "High School → First Year University curriculum architecture",
      "Future AI question generation hierarchy (Subject → Topic → Subtopic → Concept → Templates)",
    ],
  },
  {
    version: "1.0.0",
    date: "Previous",
    status: "released",
    title: "Massive Chemistry Engine Release",
    changes: [
      "Master Chemistry Database with scalable TypeScript architecture",
      "Complete periodic table (118 elements) with interactive viewer",
      "Expanded molecule database (organic generators + inorganic seeds)",
      "Lewis structure engine with templates and formal charge analysis",
      "VSEPR engine with all major molecular geometries",
      "Orbital viewer expansion including 6f orbitals and ml quantum numbers",
      "Spectroscopy infrastructure (IR, NMR, MS records + FG fallbacks)",
      "Reaction family database (combustion through redox)",
      "Global chemistry search engine",
      "Question generation metadata foundation (no AI questions yet)",
      "Future-ready user account schema",
      "Local analytics tracker",
      "Education Hub infrastructure (lessons, practice, past papers — planned)",
      "Chemistry Hub dashboard at /chemistry-hub",
    ],
  },
  {
    version: "0.8.0",
    date: "Previous",
    status: "released",
    title: "Full Periodic Table Orbital Viewer",
    changes: [
      "Added s orbitals from 1s to 7s",
      "Added p orbitals from 2p to 7p",
      "Added d orbitals from 3d to 6d",
      "Added f orbitals from 4f to 5f",
      "Added radial node visualization",
      "Added angular node visualization",
      "Added node/asymptote surface toggle",
      "Added phase coloring",
      "Added orbital quantum number cards",
      "Added orbital filtering by family and principal quantum number",
      "Added educational explanations for nodes and phases",
    ],
  },
  {
    version: "0.6.0",
    date: "Previous",
    status: "released",
    title: "Functional Groups & Spectroscopy",
    changes: [
      "Added all 9 IB HL functional groups",
      "Added Functional Group Explorer",
      "Added Spectroscopy Lab learning section",
      "Added educational IR visualization",
      "Added mass spectrometry basics",
      "Added proton NMR basics",
      "Added functional-group-aware search",
      "Added amides and ethers",
      "Added aromatic/phenyl support (toluene)",
      "Added halogenoalkanes, aldehydes, and ketones",
      "Added Study Mode on molecule cards",
      "Added functional group highlighting",
      "Added primary/secondary classifications",
    ],
  },
  {
    version: "0.5.0",
    date: "Previous",
    status: "released",
    title: "Amines, Symmetry, and Better 2D Structures",
    changes: [
      "Added NH2 / primary amine support",
      "Added ammonia, methylamine, ethylamine, propylamine, and aniline",
      "Added condensed formula normalization",
      "Added support for reversed formulas such as H3C-CH3",
      "Added symmetry notes for common molecules",
      "Improved 2D text-art structures",
      "Added double bond = support in text-art",
      "Added triple bond ≡ support in text-art",
      "Added lone pair toggle for 2D and 3D views",
      "Added symmetry toggle",
    ],
  },
  {
    version: "0.7.0",
    date: "Planned",
    status: "coming-soon",
    title: "Equation Balancing & More Isomers",
    changes: [
      "Add automatic equation balancing",
      "Add more isomer support (branched alkanes)",
      "Add ester generation from alcohols + acids",
      "Add benzene derivatives (xylene)",
      "Add user history saving",
      "Add spectroscopy quiz cards",
    ],
  },
  {
    version: "0.4.0",
    date: "Previous",
    status: "released",
    title: "3D Molecule Viewer Alpha",
    changes: [
      "Added interactive 3D molecule viewer using Three.js",
      "Added mouse rotation, zoom, and pan controls",
      "Added hard-coded 3D structures for 15 common molecules",
      "Supported molecules: water, CO2, ammonia, methane, ethane, propane",
      "Supported molecules: ethene, ethyne, methanol, ethanol",
      "Supported molecules: propan-1-ol, propan-2-ol, ethanoic acid, benzene",
      "Added show/hide hydrogens toggle",
      "Added atom labels with element symbols",
      "Added lone pair visualization (purple dots)",
      "Added bond angle arc labels",
      "Added bond length display",
      "Added ball-and-stick mode (default)",
      "Added space-filling mode (van der Waals radii)",
      "Added 2D/3D view toggle in molecule result card",
      "3D button disabled for molecules without 3D data",
      "Added loading animation during 3D generation",
    ],
  },
  {
    version: "0.3.0",
    date: "Previous",
    status: "released",
    title: "Proper 2D Molecule Renderer",
    changes: [
      "Improved text-art structure rendering",
      "Better bond visualization",
      "Improved molecule card layout",
      "Added search suggestions",
    ],
  },
  {
    version: "0.2.0",
    date: "Previous",
    status: "released",
    title: "Rule-Based Chemistry Engine",
    changes: [
      "Added alkanes C1-C20 with auto-generated formulas",
      "Added alkenes C2-C20 with double bond structures",
      "Added alkynes C2-C20 with triple bond structures",
      "Added primary alcohols C1-C20",
      "Added secondary alcohols (propan-2-ol, butan-2-ol)",
      "Added carboxylic acids C1-C20",
      "Added simple esters (methyl/ethyl/propyl ethanoate)",
      "Added benzene, phenol, glucose, glycogen",
      "Added molecule search by name, alias, or formula",
      "Added 2D text-art structure visualization",
      "Added 2D/3D view toggle (3D placeholder)",
      "Added IB-level reaction templates",
      "Added combustion reaction recognition",
      "Added hydrogenation (alkene + H2)",
      "Added bromination (alkene + Br2)",
      "Added esterification recognition",
      "Added neutralization (acid + base)",
      "Added acid + carbonate reactions",
      "Added metal + acid reactions",
      "Added autocomplete suggestions in search",
      "Added polarity and H-bonding indicators",
    ],
  },
  {
    version: "0.1.0",
    date: "Initial",
    status: "released",
    title: "Initial ARSHLAB Launch",
    changes: [
      "Landing page with modern design",
      "Molecule Builder UI with input system",
      "Reaction Lab UI with equation input",
      "Account system placeholder",
      "Patch notes system",
      "Responsive mobile-friendly layout",
      "Navigation between all sections",
      "Floating atoms animation",
    ],
  },
]

const roadmap = [
  { label: "More 3D Molecules", status: "planned" as const },
  { label: "Equation Auto-Balancing", status: "planned" as const },
  { label: "More Isomers & Branching", status: "planned" as const },
  { label: "Polarity Calculations", status: "planned" as const },
  { label: "Partial Charge Display", status: "planned" as const },
  { label: "Hybridization Detection", status: "planned" as const },
  { label: "User Account System", status: "planned" as const },
  { label: "Canvas/SVG 2D Renderer", status: "planned" as const },
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-mono font-bold text-sm">
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
  const totalChanges = patchNotes.reduce((acc, n) => acc + n.changes.length, 0)
  const releasedChanges = patchNotes
    .filter((n) => n.status === "released")
    .reduce((acc, n) => acc + n.changes.length, 0)

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
              <VersionCard key={note.version} note={note} defaultExpanded={i === 0} />
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
                    <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
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
                  <p className="text-3xl font-bold">{releasedChanges}</p>
                  <p className="text-sm opacity-80">Released</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{totalChanges}</p>
                  <p className="text-sm opacity-80">Total Changes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold">{roadmap.length}</p>
                  <p className="text-sm opacity-80">Planned</p>
                </div>
              </CardContent>
            </Card>

            {/* Compound Stats */}
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-5">
                <h3 className="font-medium text-foreground mb-3">Database Stats</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• 20 Alkanes (C1-C20)</p>
                  <p>• 19 Alkenes (C2-C20)</p>
                  <p>• 19 Alkynes (C2-C20)</p>
                  <p>• 20 Alcohols (C1-C20)</p>
                  <p>• 20 Carboxylic Acids</p>
                  <p>• 9 IB HL Functional Groups</p>
                  <p>• Spectroscopy Data (12+ molecules)</p>
                  <p>• 7 Reaction Types</p>
                  <p className="font-medium text-foreground pt-2">~100+ compounds total</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
