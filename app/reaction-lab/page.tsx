"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FlaskConical, Scale, Lightbulb, ArrowRight, Beaker, BookOpen, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

const reactionExamples = [
  "CH4(g) + 2O2(g) → CO2(g) + 2H2O(g)",
  "ethanol(l) + ethanoic acid(aq) ⇌ ethyl ethanoate(l) + water(l)",
  "NaCl(aq) + AgNO3(aq) → AgCl(s) + NaNO3(aq)",
  "2H2(g) + O2(g) → 2H2O(l)",
  "C6H12O6(aq) + 6O2(g) → 6CO2(g) + 6H2O(l)",
]

const syntaxGuide = [
  { symbol: "+", description: "Separate reactants/products" },
  { symbol: "→", description: "Irreversible reaction arrow" },
  { symbol: "⇌", description: "Reversible/equilibrium arrow" },
  { symbol: "(aq)", description: "Aqueous solution" },
  { symbol: "(l)", description: "Liquid state" },
  { symbol: "(s)", description: "Solid state" },
  { symbol: "(g)", description: "Gas state" },
  { symbol: "2, 3...", description: "Coefficients before formulas" },
]

const futureFeatures = [
  {
    icon: Sparkles,
    title: "Reaction Prediction",
    description: "AI-powered suggestions for likely products based on reactant types",
  },
  {
    icon: ArrowRight,
    title: "Mechanism Visualization",
    description: "Step-by-step electron flow diagrams for organic reactions",
  },
  {
    icon: Lightbulb,
    title: "Product Suggestions",
    description: "Predict what forms when common compounds react",
  },
  {
    icon: BookOpen,
    title: "Reaction Explanations",
    description: "Learn why reactions occur with detailed explanations",
  },
]

export default function ReactionLabPage() {
  const [reactionInput, setReactionInput] = useState("")

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Reaction Lab
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Input chemical equations, balance them, and explore reaction products.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Reaction Input */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Reaction Input</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={reactionInput}
                  onChange={(e) => setReactionInput(e.target.value)}
                  placeholder="Example: CH4(g) + 2O2(g) → CO2(g) + 2H2O(g)"
                  className="min-h-[120px] rounded-xl font-mono text-base resize-none"
                />

                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-xl">
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Analyze Reaction
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    <Scale className="mr-2 h-4 w-4" />
                    Balance Equation
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    <Lightbulb className="mr-2 h-4 w-4" />
                    Suggest Products
                  </Button>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {reactionExamples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setReactionInput(ex)}
                        className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-left text-xs font-mono text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Placeholders */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { title: "Reactants", description: "Future parser will identify compounds, coefficients, and states." },
                { title: "Products", description: "Future engine will suggest or verify reaction products." },
                { title: "Explanation", description: "Future mode will explain the reaction mechanism." },
              ].map((section) => (
                <Card key={section.title} className="rounded-2xl">
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-foreground">{section.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                    {reactionInput && (
                      <div className="mt-4 rounded-lg bg-secondary/50 p-3">
                        <p className="text-xs text-muted-foreground">Placeholder for parsed data</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Future Features */}
            <div className="grid gap-4 sm:grid-cols-2">
              {futureFeatures.map((feature) => (
                <Card key={feature.title} className="rounded-2xl border-border/50 bg-card/80">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <feature.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{feature.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
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
            {/* Syntax Guide */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Beaker className="h-5 w-5" />
                  Syntax Guide
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {syntaxGuide.map((item) => (
                    <div key={item.symbol} className="flex items-center gap-3">
                      <code className="flex h-8 min-w-[48px] items-center justify-center rounded-lg bg-secondary font-mono text-sm text-foreground">
                        {item.symbol}
                      </code>
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className="rounded-2xl bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="text-lg">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm opacity-90">
                <p>• Use standard chemical formulas (H2O, CO2, NaCl)</p>
                <p>• Include state symbols for accurate analysis</p>
                <p>• Coefficients go before the formula (2H2O)</p>
                <p>• Use → for one-way and ⇌ for reversible reactions</p>
                <p>• Type IUPAC names for organic compounds</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
