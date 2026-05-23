"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Droplets, Zap, FlaskConical, Atom, Copy, Check, Box, Grid2X2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Compound } from "@/lib/chemistry/compounds"

interface MoleculeResultCardProps {
  compound: Compound
  viewMode: "2d" | "3d"
  onViewModeChange: (mode: "2d" | "3d") => void
}

export function MoleculeResultCard({ compound, viewMode, onViewModeChange }: MoleculeResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(compound.formula)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl capitalize">{compound.name}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                  {compound.family}
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm font-mono text-foreground hover:bg-secondary transition-colors"
                >
                  {compound.formula}
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-border bg-secondary/50 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("2d")}
                className={cn(
                  "h-8 rounded-lg px-3",
                  viewMode === "2d" && "bg-background shadow-sm"
                )}
              >
                <Grid2X2 className="h-4 w-4 mr-1.5" />
                2D
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("3d")}
                className={cn(
                  "h-8 rounded-lg px-3",
                  viewMode === "3d" && "bg-background shadow-sm"
                )}
              >
                <Box className="h-4 w-4 mr-1.5" />
                3D
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Structure Visualization */}
          <div className="rounded-xl border border-border bg-secondary/30 p-6">
            <AnimatePresence mode="wait">
              {viewMode === "2d" ? (
                <motion.div
                  key="2d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <p className="text-xs text-muted-foreground mb-3">2D Structure (Text Art)</p>
                  <pre className="font-mono text-lg sm:text-xl text-foreground whitespace-pre leading-relaxed">
                    {compound.structureArt}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-4">
                    Condensed: <span className="font-mono text-foreground">{compound.condensed}</span>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="3d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center min-h-[120px] flex flex-col items-center justify-center"
                >
                  <Atom className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    3D visualization coming soon
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Switch to 2D for faster rendering on all devices
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Properties Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <PropertyCard
              icon={Zap}
              label="Polarity"
              value={compound.polarity}
              highlight={compound.polarity === "Polar"}
            />
            <PropertyCard
              icon={Droplets}
              label="H-Bonding"
              value={compound.hydrogenBonding ? "Yes" : "No"}
              highlight={compound.hydrogenBonding}
            />
            <PropertyCard
              icon={Atom}
              label="Functional Group"
              value={compound.functionalGroup}
              className="sm:col-span-2"
            />
          </div>

          {/* Explanation */}
          <div className="rounded-xl bg-secondary/50 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {compound.explanation}
            </p>
          </div>

          {/* Common Reactions */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Common Reactions
            </h4>
            <div className="flex flex-wrap gap-2">
              {compound.commonReactions.map((reaction) => (
                <span
                  key={reaction}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground"
                >
                  {reaction}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PropertyCard({
  icon: Icon,
  label,
  value,
  highlight = false,
  className,
}: {
  icon: React.ElementType
  label: string
  value: string
  highlight?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border p-3",
        highlight && "border-accent/30 bg-accent/5",
        className
      )}
    >
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        highlight ? "bg-accent/10" : "bg-secondary"
      )}>
        <Icon className={cn("h-4 w-4", highlight ? "text-accent" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium", highlight ? "text-accent" : "text-foreground")}>
          {value}
        </p>
      </div>
    </div>
  )
}
