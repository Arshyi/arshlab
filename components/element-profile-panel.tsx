"use client"

import { motion } from "framer-motion"
import {
  Atom,
  Box,
  FlaskConical,
  Layers,
  Palette,
  Scale,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"
import type { ElementRecord, OctetRuleCategory } from "@/lib/chemistry/database/types"
import { TRANSITION_METAL_COLOR_DISCLAIMER } from "@/lib/chemistry/database/periodic-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const OCTET_LABELS: Record<OctetRuleCategory, string> = {
  "normal-octet": "Normal octet",
  "incomplete-octet": "Incomplete octet",
  "expanded-octet": "Expanded octet",
  "odd-electron": "Odd-electron species",
  "noble-gas-compounds": "Noble gas compounds",
}

interface ElementProfilePanelProps {
  element: ElementRecord
}

export function ElementProfilePanel({ element }: ElementProfilePanelProps) {
  const hasTransitionColors = element.transitionMetalColors.length > 0
  const showOctetSection =
    element.octetRuleCategory !== "normal-octet" || element.octetRuleExamples.length > 0

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">
                {element.name}{" "}
                <span className="font-mono text-primary">({element.symbol})</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground capitalize mt-1">
                {element.category.replace(/-/g, " ")} · Period {element.period}
                {element.group ? ` · Group ${element.group}` : ""} · {element.block}-block
              </p>
            </div>
            <Badge variant="secondary" className="font-mono">
              Z = {element.atomicNumber}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileCard
          icon={Atom}
          title="Electron Configuration"
          description="Full and noble gas shorthand notation"
        >
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-1">Full notation</p>
              <p className="font-mono text-sm leading-relaxed">{element.electronConfiguration}</p>
            </div>
            {element.shorthandConfiguration &&
              element.shorthandConfiguration !== element.electronConfiguration && (
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground mb-1">
                    Noble gas shorthand
                  </p>
                  <p className="font-mono text-sm leading-relaxed">
                    {element.shorthandConfiguration}
                  </p>
                </div>
              )}
            <p className="text-xs text-muted-foreground pt-1">
              Valence electrons: {element.valenceElectrons}
            </p>
          </div>
        </ProfileCard>

        <ProfileCard
          icon={Box}
          title="Orbital Box Diagram"
          description="Aufbau · Hund's rule · Pauli exclusion (↑↓)"
        >
          <div className="space-y-2 overflow-x-auto">
            {element.orbitalDiagram.map((subshell) => (
              <div key={subshell.label} className="flex items-center gap-2 min-w-max">
                <span className="w-8 font-mono text-xs text-muted-foreground shrink-0">
                  {subshell.label}
                </span>
                <div className="flex gap-1">
                  {subshell.boxes.map((box, i) => (
                    <div
                      key={`${subshell.label}-${i}`}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded border border-border bg-secondary/30 font-mono text-sm",
                        box && "border-accent/40 bg-accent/5",
                      )}
                    >
                      {box || ""}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ProfileCard>

        <ProfileCard
          icon={Scale}
          title="Periodic Properties"
          description="Selected atomic and periodic trends data"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <PropertyItem label="Atomic mass" value={`${element.atomicMass} u`} />
            <PropertyItem
              label="Atomic radius"
              value={element.atomicRadiusPm ? `${element.atomicRadiusPm} pm` : "—"}
            />
            <PropertyItem
              label="Electronegativity"
              value={element.electronegativity?.toString() ?? "—"}
            />
            <PropertyItem
              label="First ionization energy"
              value={
                element.ionizationEnergyKjMol
                  ? `${element.ionizationEnergyKjMol} kJ/mol`
                  : "—"
              }
            />
            <PropertyItem
              label="Electron affinity"
              value={
                element.electronAffinityKjMol !== null
                  ? `${element.electronAffinityKjMol} kJ/mol`
                  : "—"
              }
            />
            <PropertyItem label="Valence e⁻" value={String(element.valenceElectrons)} />
          </div>
        </ProfileCard>

        <ProfileCard icon={Zap} title="Oxidation States" description="Common oxidation states and ions">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-2">Oxidation states</p>
              {element.oxidationStates.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {element.oxidationStates.map((state) => (
                    <Badge key={state} variant="outline" className="font-mono">
                      {state > 0 ? `+${state}` : state}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            {element.commonIons.length > 0 && (
              <div>
                <p className="text-[10px] uppercase text-muted-foreground mb-2">Common ions</p>
                <div className="flex flex-wrap gap-1.5">
                  {element.commonIons.map((ion) => (
                    <Badge key={ion} variant="secondary" className="font-mono">
                      {ion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ProfileCard>

        <ProfileCard icon={Layers} title="Natural Form" description="Elemental form or allotrope">
          <p className="text-sm leading-relaxed">
            {element.naturalForm ?? "Varies — consult standard references for allotropes and phases."}
          </p>
        </ProfileCard>

        {showOctetSection && (
          <ProfileCard
            icon={Shield}
            title="Octet Rule Exceptions"
            description="Representative teaching examples"
          >
            <div className="space-y-2">
              <Badge variant="outline">{OCTET_LABELS[element.octetRuleCategory]}</Badge>
              {element.octetRuleExamples.length > 0 ? (
                <ul className="space-y-1 pt-1">
                  {element.octetRuleExamples.map((ex) => (
                    <li key={ex} className="text-sm text-muted-foreground font-mono">
                      {ex}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Follows a stable octet in most common compounds.
                </p>
              )}
            </div>
          </ProfileCard>
        )}

        <ProfileCard
          icon={FlaskConical}
          title="Example Compounds"
          description="Common compounds for study and reference"
          className={showOctetSection ? undefined : "lg:col-span-1"}
        >
          {element.exampleCompounds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {element.exampleCompounds.map((compound) => (
                <Badge key={compound} variant="secondary" className="font-mono">
                  {compound}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Limited common compound data.</p>
          )}
        </ProfileCard>

        {hasTransitionColors && (
          <ProfileCard
            icon={Palette}
            title="Transition Metal Colors"
            description="Common ions and compounds in solution"
            className="lg:col-span-2"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {element.transitionMetalColors.map((entry) => (
                <div
                  key={entry.species}
                  className="rounded-xl border border-border bg-secondary/20 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono font-medium">{entry.species}</span>
                    <Badge variant="outline">{entry.color}</Badge>
                  </div>
                  {entry.wavelengthRange && (
                    <p className="text-xs text-muted-foreground">{entry.wavelengthRange}</p>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4 leading-relaxed border-t border-border pt-3">
              {TRANSITION_METAL_COLOR_DISCLAIMER}
            </p>
          </ProfileCard>
        )}
      </div>

      {!hasTransitionColors && element.category === "transition-metal" && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex items-start gap-3 p-5">
            <Sparkles className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Transition metal color data for {element.symbol} is not yet catalogued. Check
              common ions such as {element.commonIons.join(", ") || "reference texts"} for
              solution chemistry.
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}

function ProfileCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm h-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-sm">{value}</p>
    </div>
  )
}
