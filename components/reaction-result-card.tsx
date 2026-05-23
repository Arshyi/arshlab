"use client"

import { motion } from "framer-motion"
import { Check, X, FlaskConical, Lightbulb, Atom } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { ReactionResult } from "@/lib/chemistry/reactions"

interface ReactionResultCardProps {
  result: ReactionResult
}

export function ReactionResultCard({ result }: ReactionResultCardProps) {
  const isRecognized = result.recognized

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className={cn(
        "rounded-2xl overflow-hidden",
        !isRecognized && "border-destructive/30"
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className={cn(
                "text-xl",
                !isRecognized && "text-destructive"
              )}>
                {result.type}
              </CardTitle>
              <div className="mt-2 flex items-center gap-2">
                {isRecognized ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600">
                    <Check className="h-3 w-3" />
                    Recognized
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
                    <X className="h-3 w-3" />
                    Not Supported
                  </span>
                )}
              </div>
            </div>
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              isRecognized ? "bg-accent/10" : "bg-destructive/10"
            )}>
              <FlaskConical className={cn(
                "h-6 w-6",
                isRecognized ? "text-accent" : "text-destructive"
              )} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Reactants & Products */}
          {isRecognized && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Reactants</p>
                <div className="flex flex-wrap gap-2">
                  {result.reactants.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-background border border-border px-3 py-1.5 font-mono text-sm text-foreground"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Products</p>
                <div className="flex flex-wrap gap-2">
                  {result.products.map((p, i) => (
                    <span
                      key={i}
                      className="rounded-lg bg-accent/10 border border-accent/20 px-3 py-1.5 font-mono text-sm text-accent"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Structure Preview */}
          {result.structurePreview && (
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Reaction Preview</p>
              <pre className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {result.structurePreview}
              </pre>
            </div>
          )}

          {/* Explanation */}
          <div className="rounded-xl bg-secondary/50 p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className={cn(
                "h-5 w-5 shrink-0 mt-0.5",
                isRecognized ? "text-accent" : "text-muted-foreground"
              )} />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.explanation}
              </p>
            </div>
          </div>

          {/* Functional Groups */}
          {result.functionalGroups.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Atom className="h-4 w-4" />
                Functional Groups Involved
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.functionalGroups.map((group) => (
                  <span
                    key={group}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    {group}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
