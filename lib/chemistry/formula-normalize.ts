// Condensed formula normalization and equivalence matching for ARSHLAB

import type { Compound } from "./compounds"

/** Strip spaces and unify bond dashes for comparison */
export function normalizeBasic(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s\-—–]/g, "")
}

/** Expand common reversed / alternate orientation notations */
export function expandOrientationTokens(formula: string): string {
  let f = normalizeBasic(formula)
  f = f.replace(/h3c/g, "ch3")
  f = f.replace(/h2n/g, "nh2")
  return f
}

/** CH3-(CH2)n-OH ↔ HO-(CH2)n-CH3 */
function alcoholChainVariants(expanded: string): string[] {
  const variants: string[] = []
  if (expanded.includes("cooh")) return variants

  if (expanded.endsWith("oh")) {
    const chain = expanded.slice(0, -2)
    if (chain === "ch3") {
      variants.push("hoch3")
    } else if (/^ch3(?:ch2)+$/.test(chain)) {
      const ch2count = (chain.match(/ch2/g) || []).length
      variants.push("ho" + "ch2".repeat(ch2count) + "ch3")
    }
  }

  if (expanded.startsWith("ho")) {
    const tail = expanded.slice(2)
    if (tail === "ch3") {
      variants.push("ch3oh")
    } else if (/^(?:ch2)+ch3$/.test(tail)) {
      const ch2count = (tail.match(/ch2/g) || []).length
      variants.push("ch3" + "ch2".repeat(ch2count) + "oh")
    }
  }

  return variants
}

/** CH3-(CH2)n-NH2 ↔ NH2-(CH2)n-CH3 */
function amineChainVariants(expanded: string): string[] {
  const variants: string[] = []

  if (expanded.endsWith("nh2")) {
    const chain = expanded.slice(0, -3)
    if (chain === "ch3") {
      variants.push("nh2ch3")
    } else if (/^ch3(?:ch2)+$/.test(chain)) {
      const ch2count = (chain.match(/ch2/g) || []).length
      variants.push("nh2" + "ch2".repeat(ch2count) + "ch3")
    }
  }

  if (expanded.startsWith("nh2")) {
    const tail = expanded.slice(3)
    if (tail === "ch3") {
      variants.push("ch3nh2")
    } else if (/^(?:ch2)+ch3$/.test(tail)) {
      const ch2count = (tail.match(/ch2/g) || []).length
      variants.push("ch3" + "ch2".repeat(ch2count) + "nh2")
    }
  }

  return variants
}

/** Generate all normalized orientation variants for a condensed formula */
export function getCondensedVariants(condensed: string): Set<string> {
  const variants = new Set<string>()

  const add = (s: string) => {
    const expanded = expandOrientationTokens(s)
    variants.add(expanded)
    variants.add(expanded.replace(/ch3/g, "h3c"))
    for (const v of alcoholChainVariants(expanded)) {
      variants.add(v)
      variants.add(v.replace(/ch3/g, "h3c"))
    }
    for (const v of amineChainVariants(expanded)) {
      variants.add(v)
      variants.add(v.replace(/ch3/g, "h3c"))
    }
  }

  add(condensed)
  add(condensed.replace(/[\s\-—–]/g, ""))

  return variants
}

/** Collect all searchable condensed variants for a compound */
export function getCompoundCondensedVariants(compound: Compound): Set<string> {
  const variants = new Set<string>()

  getCondensedVariants(compound.condensed).forEach((v) => variants.add(v))

  for (const alias of compound.aliases) {
    if (/[CHONchon\-—–]/.test(alias) && alias.length > 2) {
      getCondensedVariants(alias).forEach((v) => variants.add(v))
    }
  }

  getCondensedVariants(compound.formula).forEach((v) => variants.add(v))

  return variants
}

/** Canonical normalized form used for primary condensed display matching */
export function getCanonicalCondensed(compound: Compound): string {
  return expandOrientationTokens(compound.condensed)
}

/** True when query matches via a non-canonical condensed orientation */
export function shouldShowAlternateOrientation(query: string, compound: Compound): boolean {
  const userNorm = expandOrientationTokens(query)
  const canonical = getCanonicalCondensed(compound)
  if (userNorm === canonical) return false

  const basicQuery = query.toLowerCase().trim().replace(/\s+/g, "")
  if (compound.name.toLowerCase().replace(/\s+/g, "") === basicQuery) return false

  return matchesCondensedVariants(query, compound)
}

/** Match query against compound condensed variants */
export function matchesCondensedVariants(query: string, compound: Compound): boolean {
  const userNorm = expandOrientationTokens(query)
  return getCompoundCondensedVariants(compound).has(userNorm)
}
