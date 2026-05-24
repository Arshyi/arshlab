export const fgColorClasses: Record<string, { card: string; badge: string; ring: string }> = {
  emerald: {
    card: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-500/50",
    badge: "bg-emerald-500/15 text-emerald-700 border-emerald-500/25",
    ring: "ring-emerald-500/30",
  },
  blue: {
    card: "from-blue-500/20 to-blue-600/5 border-blue-500/30 hover:border-blue-500/50",
    badge: "bg-blue-500/15 text-blue-700 border-blue-500/25",
    ring: "ring-blue-500/30",
  },
  violet: {
    card: "from-violet-500/20 to-violet-600/5 border-violet-500/30 hover:border-violet-500/50",
    badge: "bg-violet-500/15 text-violet-700 border-violet-500/25",
    ring: "ring-violet-500/30",
  },
  amber: {
    card: "from-amber-500/20 to-amber-600/5 border-amber-500/30 hover:border-amber-500/50",
    badge: "bg-amber-500/15 text-amber-700 border-amber-500/25",
    ring: "ring-amber-500/30",
  },
  cyan: {
    card: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 hover:border-cyan-500/50",
    badge: "bg-cyan-500/15 text-cyan-700 border-cyan-500/25",
    ring: "ring-cyan-500/30",
  },
  rose: {
    card: "from-rose-500/20 to-rose-600/5 border-rose-500/30 hover:border-rose-500/50",
    badge: "bg-rose-500/15 text-rose-700 border-rose-500/25",
    ring: "ring-rose-500/30",
  },
  indigo: {
    card: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30 hover:border-indigo-500/50",
    badge: "bg-indigo-500/15 text-indigo-700 border-indigo-500/25",
    ring: "ring-indigo-500/30",
  },
  orange: {
    card: "from-orange-500/20 to-orange-600/5 border-orange-500/30 hover:border-orange-500/50",
    badge: "bg-orange-500/15 text-orange-700 border-orange-500/25",
    ring: "ring-orange-500/30",
  },
  fuchsia: {
    card: "from-fuchsia-500/20 to-fuchsia-600/5 border-fuchsia-500/30 hover:border-fuchsia-500/50",
    badge: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/25",
    ring: "ring-fuchsia-500/30",
  },
}

export function getFgColors(color: string) {
  return fgColorClasses[color] ?? fgColorClasses.blue
}
