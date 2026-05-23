"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Atom, RotateCcw, History, Eye, Zap, Hexagon, Droplets, Ruler, Triangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const examples = [
  "propan-1-ol",
  "ethanoic acid",
  "CH3-CH2-CH2-OH",
  "benzene",
  "2-methylpropane",
  "cyclohexane",
]

const futureFeatures = [
  { icon: Eye, label: "Partial Charges", description: "Visualize δ+ and δ- on atoms" },
  { icon: Droplets, label: "Lone Pairs", description: "Display non-bonding electron pairs" },
  { icon: Zap, label: "Polarity", description: "Show molecular dipole moments" },
  { icon: Ruler, label: "Bond Angles", description: "Display precise bond angles" },
  { icon: Hexagon, label: "Hybridization", description: "sp, sp², sp³ orbital states" },
  { icon: Triangle, label: "H-Bonding", description: "Highlight hydrogen bond sites" },
]

export default function MoleculeBuilderPage() {
  const [moleculeInput, setMoleculeInput] = useState("")
  const [history, setHistory] = useState<string[]>([])

  function handleGenerate() {
    if (!moleculeInput.trim()) return
    setHistory((prev) => [moleculeInput.trim(), ...prev.slice(0, 5)])
  }

  function handleClear() {
    setMoleculeInput("")
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
            Type an IUPAC name, condensed formula, or SMILES string to visualize molecular structures.
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
                <CardTitle className="text-lg">Molecule Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={moleculeInput}
                    onChange={(e) => setMoleculeInput(e.target.value)}
                    placeholder="Example: propan-1-ol or CH3-CH2-CH2-OH"
                    className="h-12 rounded-xl text-base"
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleGenerate} className="h-12 rounded-xl px-6">
                      Generate Structure
                    </Button>
                    <Button onClick={handleClear} variant="outline" className="h-12 w-12 rounded-xl p-0">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {examples.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setMoleculeInput(ex)}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Structure Preview Placeholder */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Structure Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex min-h-[300px] sm:min-h-[400px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 p-6">
                  <div className="text-center">
                    <Atom className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold text-foreground">Future Molecule Canvas</h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      This area will display 2D/3D molecular structures with interactive controls
                      for rotating, zooming, and toggling visualization options.
                    </p>
                    {moleculeInput && (
                      <div className="mt-6 rounded-xl bg-primary px-6 py-4 text-primary-foreground">
                        <p className="text-sm opacity-80">Current input:</p>
                        <p className="mt-1 font-mono text-lg font-semibold">{moleculeInput}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                    Your recent molecules will appear here after you generate them.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.map((item, index) => (
                      <button
                        key={`${item}-${index}`}
                        onClick={() => setMoleculeInput(item)}
                        className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3 text-left transition-colors hover:bg-secondary"
                      >
                        <span className="font-mono text-sm text-foreground">{item}</span>
                        <span className="text-xs text-muted-foreground">Open</span>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visualization Toggles Placeholder */}
            <Card className="rounded-2xl bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg">Visualization Toggles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm opacity-80 mb-4">
                  These toggles will control what&apos;s displayed on the molecule:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {["Lone pairs", "Partial charges", "Polarity", "Bond lengths", "Bond angles", "Functional groups"].map((toggle) => (
                    <div key={toggle} className="flex items-center gap-2 opacity-60">
                      <div className="h-4 w-4 rounded border border-primary-foreground/30" />
                      <span>{toggle}</span>
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
