"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OrbitalData } from "@/data/orbitals"

interface OrbitalInfoCardProps {
  orbital: OrbitalData
  visible: boolean
}

export function OrbitalInfoCard({ orbital, visible }: OrbitalInfoCardProps) {
  if (!visible) return null

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{orbital.label}</CardTitle>
        <p className="text-sm text-muted-foreground capitalize">{orbital.family} orbital</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "n (principal)", value: orbital.n },
            { label: "l (angular)", value: orbital.l },
            { label: "Total nodes", value: orbital.totalNodes },
            { label: "Radial nodes", value: orbital.radialNodes },
            { label: "Angular nodes", value: orbital.angularNodes },
            { label: "Type", value: orbital.family },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-secondary/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold font-mono">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-medium text-foreground mb-1">Shape</h4>
            <p className="text-muted-foreground leading-relaxed">{orbital.shapeDescription}</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Chemistry relevance</h4>
            <p className="text-muted-foreground leading-relaxed">{orbital.chemistryRelevance}</p>
          </div>
          <div>
            <h4 className="font-medium text-foreground mb-1">Explanation</h4>
            <p className="text-muted-foreground leading-relaxed">{orbital.explanation}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
