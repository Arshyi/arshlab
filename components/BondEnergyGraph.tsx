"use client"

import { useMemo } from "react"
import type { BondPreset, PotentialEnergyPoint } from "@/lib/chemistry/database/bonding"
import {
  calculateMorsePotential,
  generatePotentialEnergyCurve,
} from "@/lib/chemistry/database/bonding"

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatEnergy(value: number): string {
  if (Math.abs(value) < 1) return value.toFixed(2)
  if (Math.abs(value) < 10) return value.toFixed(1)
  return Math.round(value).toString()
}

interface BondEnergyGraphProps {
  preset: BondPreset
  currentDistance: number
  showCurve: boolean
  className?: string
}

export function BondEnergyGraph({ preset, currentDistance, showCurve, className }: BondEnergyGraphProps) {
  const curve = useMemo<PotentialEnergyPoint[]>(() => generatePotentialEnergyCurve(preset), [preset])
  const currentEnergy = calculateMorsePotential(currentDistance, preset)

  const layout = useMemo(() => {
    const width = 640
    const height = 360
    const margin = { top: 24, right: 28, bottom: 46, left: 58 }
    const plotWidth = width - margin.left - margin.right
    const plotHeight = height - margin.top - margin.bottom
    const xMin = 0.3
    const xMax = 5
    const eFloor = -Math.max(1, preset.bondEnergy * 1.08)
    const eCeil = Math.max(8, preset.bondEnergy * 0.72)

    const x = (distance: number) => margin.left + ((distance - xMin) / (xMax - xMin)) * plotWidth
    const y = (energy: number) => {
      const clipped = clamp(energy, eFloor, eCeil)
      return margin.top + ((eCeil - clipped) / (eCeil - eFloor)) * plotHeight
    }

    const path = curve
      .map((point, index) => {
        const command = index === 0 ? "M" : "L"
        return `${command}${x(point.distance).toFixed(2)},${y(point.energy).toFixed(2)}`
      })
      .join(" ")

    return {
      width,
      height,
      margin,
      plotWidth,
      plotHeight,
      x,
      y,
      path,
      xMin,
      xMax,
      eFloor,
      eCeil,
    }
  }, [curve, preset.bondEnergy])

  const currentX = layout.x(currentDistance)
  const currentY = layout.y(currentEnergy)
  const equilibriumX = layout.x(preset.equilibriumDistance)
  const zeroY = layout.y(0)
  const minimumY = layout.y(-preset.bondEnergy)

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="Potential energy curve" className="h-full w-full">
        <defs>
          <linearGradient id="bond-energy-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <rect width={layout.width} height={layout.height} rx="18" fill="hsl(var(--card))" />

        {[0.3, 1, 2, 3, 4, 5].map((tick) => (
          <g key={`x-${tick}`}>
            <line
              x1={layout.x(tick)}
              x2={layout.x(tick)}
              y1={layout.margin.top}
              y2={layout.margin.top + layout.plotHeight}
              stroke="hsl(var(--border))"
              strokeOpacity="0.45"
            />
            <text x={layout.x(tick)} y={layout.height - 18} textAnchor="middle" className="fill-muted-foreground text-[12px]">
              {tick}
            </text>
          </g>
        ))}

        {[layout.eFloor, -preset.bondEnergy, 0, layout.eCeil].map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={layout.margin.left}
              x2={layout.margin.left + layout.plotWidth}
              y1={layout.y(tick)}
              y2={layout.y(tick)}
              stroke="hsl(var(--border))"
              strokeOpacity="0.45"
            />
            <text x={layout.margin.left - 10} y={layout.y(tick) + 4} textAnchor="end" className="fill-muted-foreground text-[12px]">
              {formatEnergy(tick)}
            </text>
          </g>
        ))}

        <line
          x1={layout.margin.left}
          x2={layout.margin.left + layout.plotWidth}
          y1={zeroY}
          y2={zeroY}
          stroke="hsl(var(--foreground))"
          strokeOpacity="0.35"
        />

        {showCurve && (
          <>
            <path d={`${layout.path} L${layout.x(layout.xMax)},${zeroY} L${layout.x(layout.xMin)},${zeroY} Z`} fill="url(#bond-energy-fill)" />
            <path d={layout.path} fill="none" stroke="#14b8a6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}

        <line
          x1={equilibriumX}
          x2={equilibriumX}
          y1={layout.margin.top}
          y2={layout.margin.top + layout.plotHeight}
          stroke="#f59e0b"
          strokeDasharray="6 6"
          strokeWidth="2"
        />
        <circle cx={equilibriumX} cy={minimumY} r="6" fill="#f59e0b" />
        <text x={equilibriumX + 10} y={minimumY - 10} className="fill-foreground text-[12px] font-semibold">
          r_e {preset.equilibriumDistance.toFixed(2)} A
        </text>

        <line
          x1={currentX}
          x2={currentX}
          y1={layout.margin.top}
          y2={layout.margin.top + layout.plotHeight}
          stroke="#8b5cf6"
          strokeWidth="2.5"
        />
        <circle cx={currentX} cy={currentY} r="7" fill="#8b5cf6" stroke="hsl(var(--background))" strokeWidth="3" />
        <text x={currentX + 10} y={currentY - 14} className="fill-foreground text-[12px] font-semibold">
          current {formatEnergy(currentEnergy)}
        </text>

        <line x1={equilibriumX + 34} x2={equilibriumX + 34} y1={minimumY} y2={zeroY} stroke="#ef4444" strokeWidth="3" />
        <text x={equilibriumX + 42} y={(minimumY + zeroY) / 2} className="fill-foreground text-[12px] font-semibold">
          D_e {formatEnergy(preset.bondEnergy)}
        </text>

        <text x={layout.width / 2} y={layout.height - 4} textAnchor="middle" className="fill-muted-foreground text-[13px]">
          Internuclear distance / A
        </text>
        <text
          x="16"
          y={layout.height / 2}
          transform={`rotate(-90 16 ${layout.height / 2})`}
          textAnchor="middle"
          className="fill-muted-foreground text-[13px]"
        >
          Potential energy / kJ mol-1
        </text>
      </svg>
    </div>
  )
}
