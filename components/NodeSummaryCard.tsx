"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrbitalData } from "@/data/orbitals"

interface NodeSummaryCardProps {
  orbital: OrbitalData
}

export function NodeSummaryCard({ orbital }: NodeSummaryCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Node Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Total nodes</span> = n − 1 ={" "}
            <span className="font-mono">{orbital.totalNodes}</span>
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Angular nodes</span> = l ={" "}
            <span className="font-mono">{orbital.angularNodes}</span>
          </p>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Radial nodes</span> = n − l − 1 ={" "}
            <span className="font-mono">{orbital.radialNodes}</span>
          </p>
        </div>

        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Radial nodes</strong> are spherical surfaces where electron
            probability density goes to zero, creating nested shell gaps in s orbitals and spherical shells in
            higher p, d, and f orbitals.
          </p>
          <p>
            <strong className="text-foreground">Angular nodes</strong> are planes or cones through the nucleus
            where probability density is zero — they define the lobed shapes of p, d, and f orbitals.
          </p>
          <p>
            Use <strong className="text-foreground">Show Node Asymptotes</strong> to reveal translucent node
            surfaces — conceptual boundaries where the wavefunction changes sign or passes through zero.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function EducationalPanel() {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Understanding Orbitals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
        <p>
          Atomic orbitals describe regions where an electron is <em>likely</em> to be found — they are
          probability-density regions, not fixed circular paths around the nucleus.
        </p>
        <p>
          The colored lobes show regions of high electron density. Phase colors (blue +ψ, orange −ψ) indicate
          the sign of the wavefunction — this affects how orbitals overlap during bonding, but does{" "}
          <strong className="text-foreground">not</strong> mean positive or negative electric charge.
        </p>
        <p>
          Quantum numbers summarize each orbital: <strong className="text-foreground">n</strong> sets size and
          energy, <strong className="text-foreground">l</strong> sets angular shape and node count. These
          ARSHLAB models are simplified for classroom intuition.
        </p>
      </CardContent>
    </Card>
  )
}
