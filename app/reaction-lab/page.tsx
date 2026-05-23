"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FlaskConical, Scale, Lightbulb, ArrowRight, Beaker, BookOpen, Sparkles, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { analyzeReaction, getSupportedReactions, type ReactionResult } from "@/lib/chemistry/reactions"
import { ReactionResultCard } from "@/components/reaction-result-card"

const reactionExamples = [
  "CH4 + O2 → CO2 + H2O",
  "ethanol + ethanoic acid ⇌ ester + water",
  "C2H4 + H2 → C2H6",
  "C2H4 + Br2 → C2H4Br2",
  "HCl + NaOH → NaCl + H2O",
  "Mg + HCl → MgCl2 + H2",
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
    title: "Auto-Balancing",
    description: "Automatically balance chemical equations with coefficients",
  },
  {
    icon: ArrowRight,
    title: "Mechanism Visualization",
    description: "Step-by-step electron flow diagrams for organic reactions",
  },
  {
    icon: Lightbulb,
    title: "Product Prediction",
    description: "AI-powered suggestions for likely products",
  },
  {
    icon: BookOpen,
    title: "Reaction Library",
    description: "Browse common reactions by category",
  },
]

export default function ReactionLabPage() {
  const [reactionInput, setReactionInput] = useState("")
  const [result, setResult] = useState<ReactionResult | null>(null)

  const handleAnalyze = () => {
    if (!reactionInput.trim()) return
    const analysisResult = analyzeReaction(reactionInput)
    setResult(analysisResult)
  }

  const supportedReactions = getSupportedReactions()

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
            Input chemical equations to identify reaction types and explore products.
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
                  placeholder="Example: CH4 + O2 → CO2 + H2O"
                  className="min-h-[120px] rounded-xl font-mono text-base resize-none"
                />

                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleAnalyze} className="rounded-xl">
                    <FlaskConical className="mr-2 h-4 w-4" />
                    Analyze Reaction
                  </Button>
                  <Button variant="outline" className="rounded-xl" disabled>
                    <Scale className="mr-2 h-4 w-4" />
                    Balance Equation
                    <span className="ml-2 text-xs bg-secondary px-1.5 py-0.5 rounded">Soon</span>
                  </Button>
                </div>

                <div className="pt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Try an example:</p>
                  <div className="flex flex-wrap gap-2">
                    {reactionExamples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => {
                          setReactionInput(ex)
                          const analysisResult = analyzeReaction(ex)
                          setResult(analysisResult)
                        }}
                        className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-left text-xs font-mono text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result */}
            <AnimatePresence mode="wait">
              {result ? (
                <ReactionResultCard key="result" result={result} />
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="rounded-2xl">
                    <CardContent className="flex min-h-[200px] items-center justify-center p-6">
                      <div className="text-center">
                        <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold text-foreground">Enter a Reaction</h3>
                        <p className="mt-2 max-w-md text-sm text-muted-foreground">
                          Type a chemical equation above or click an example to analyze the reaction type.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

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

            {/* Supported Reactions */}
            <Card className="rounded-2xl bg-primary text-primary-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Info className="h-5 w-5" />
                  Supported Reactions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supportedReactions.map((reaction) => (
                  <div key={reaction.type} className="text-sm">
                    <p className="font-medium opacity-90">{reaction.type}</p>
                    <p className="font-mono text-xs opacity-70 mt-0.5">{reaction.example}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
