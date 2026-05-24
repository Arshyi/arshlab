"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { buildIRSpectrum, type IRPeak } from "@/lib/chemistry/spectroscopy"
import { cn } from "@/lib/utils"

interface IRSpectrumViewerProps {
  peaks: IRPeak[]
  className?: string
}

const chartConfig = {
  absorbance: { label: "Absorbance", color: "hsl(var(--accent))" },
} satisfies ChartConfig

export function IRSpectrumViewer({ peaks, className }: IRSpectrumViewerProps) {
  const [hoveredPeak, setHoveredPeak] = useState<IRPeak | null>(null)
  const data = useMemo(() => buildIRSpectrum(peaks), [peaks])

  return (
    <div className={cn("space-y-3", className)}>
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[4000, 400]}
              reversed
              tickFormatter={(v) => `${v}`}
              label={{ value: "Wavenumber (cm⁻¹)", position: "insideBottom", offset: -5, fontSize: 11 }}
              tick={{ fontSize: 10 }}
            />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const wn = payload[0].payload.x as number
                const nearPeak = peaks.find((p) => Math.abs(p.wavenumber - wn) < 80)
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="rounded-lg border border-border bg-background px-3 py-2 shadow-md text-xs"
                  >
                    <p className="font-mono font-medium">{wn} cm⁻¹</p>
                    {nearPeak && (
                      <p className="text-accent mt-0.5">
                        {nearPeak.label}
                        {nearPeak.broad ? " (broad)" : ""}
                      </p>
                    )}
                  </motion.div>
                )
              }}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke="var(--color-absorbance)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            {peaks.map((peak) => (
              <ReferenceLine
                key={peak.wavenumber}
                x={peak.wavenumber}
                stroke="hsl(var(--accent))"
                strokeDasharray={peak.broad ? "4 4" : undefined}
                strokeOpacity={0.5}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      <div className="flex flex-wrap gap-2">
        {peaks.map((peak) => (
          <button
            key={peak.wavenumber}
            onMouseEnter={() => setHoveredPeak(peak)}
            onMouseLeave={() => setHoveredPeak(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              hoveredPeak?.wavenumber === peak.wavenumber
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
            )}
          >
            {peak.wavenumber} cm⁻¹ — {peak.label}
            {peak.broad && " (broad)"}
          </button>
        ))}
      </div>
    </div>
  )
}
