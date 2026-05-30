import type { CompoundRecord, ExamBoard } from "../../types"

const BOARDS: ExamBoard[] = ["high-school", "ib-sl", "ib-hl", "ap", "a-level", "university-intro"]

const carbonPrefixes: Record<number, string> = {
  1: "meth",
  2: "eth",
  3: "prop",
  4: "but",
  5: "pent",
  6: "hex",
  7: "hept",
  8: "oct",
  9: "non",
  10: "dec",
  11: "undec",
  12: "dodec",
  13: "tridec",
  14: "tetradec",
  15: "pentadec",
  16: "hexadec",
  17: "heptadec",
  18: "octadec",
  19: "nonadec",
  20: "eicos",
}

function chainArt(carbons: number, endGroup = "H"): string {
  if (carbons === 1) {
    if (endGroup === "H") return "CH4"
    if (endGroup === "OH") return "CH3—OH"
    if (endGroup === "COOH") return "H—COOH"
    return `CH3—${endGroup}`
  }
  const parts: string[] = ["CH3"]
  for (let i = 2; i < carbons; i++) parts.push("CH2")
  if (endGroup === "H") parts.push("CH3")
  else if (endGroup === "OH") parts.push("CH2—OH")
  else if (endGroup === "COOH") parts.push("COOH")
  else if (endGroup === "=CH2") parts[parts.length - 1] = "CH=CH2"
  else if (endGroup === "≡CH") parts[parts.length - 1] = "C≡CH"
  else parts.push(endGroup)
  return parts.join("—")
}

function baseCompound(
  partial: Omit<CompoundRecord, "kind" | "examBoards" | "topics" | "subtopics" | "tags"> &
    Partial<Pick<CompoundRecord, "topics" | "subtopics" | "tags">>,
): CompoundRecord {
  return {
    kind: "compound",
    examBoards: BOARDS,
    topics: partial.topics ?? ["organic-chemistry"],
    subtopics: partial.subtopics ?? [],
    tags: partial.tags ?? [partial.family],
    ...partial,
  }
}

export function generateAlkanes(maxC = 20): CompoundRecord[] {
  const out: CompoundRecord[] = []
  for (let n = 1; n <= maxC; n++) {
    const prefix = carbonPrefixes[n]
    const name = `${prefix}ane`
    const formula = n === 1 ? "CH4" : `C${n}H${2 * n + 2}`
    const condensed = n === 1 ? "CH4" : `CH3${"—CH2".repeat(n - 2)}—CH3`
    out.push(
      baseCompound({
        id: `compound-${name}`,
        name,
        aliases: [name, formula, `C${n}H${2 * n + 2}`],
        formula,
        condensed,
        family: "Alkane",
        functionalGroup: "None",
        polarity: "Nonpolar",
        hydrogenBonding: false,
        explanation: `Saturated hydrocarbon with ${n} carbon(s). CnH2n+2.`,
        structureArt: chainArt(n),
        commonReactions: ["Combustion", "Free-radical substitution (halogenation)"],
        subtopics: ["alkanes"],
      }),
    )
  }
  return out
}

export function generateAlkenes(maxC = 20): CompoundRecord[] {
  const out: CompoundRecord[] = []
  for (let n = 2; n <= maxC; n++) {
    const prefix = carbonPrefixes[n]
    const name = `${prefix}ene`
    const formula = `C${n}H${2 * n}`
    out.push(
      baseCompound({
        id: `compound-${name}`,
        name,
        aliases: [name, formula],
        formula,
        condensed: chainArt(n, "=CH2"),
        family: "Alkene",
        functionalGroup: "Alkene",
        polarity: "Nonpolar",
        hydrogenBonding: false,
        explanation: `Unsaturated hydrocarbon with one C=C double bond.`,
        structureArt: chainArt(n, "=CH2"),
        commonReactions: ["Addition (H2, Br2, HX)", "Combustion", "Polymerization"],
        subtopics: ["alkenes"],
      }),
    )
  }
  return out
}

export function generateAlkynes(maxC = 20): CompoundRecord[] {
  const out: CompoundRecord[] = []
  for (let n = 2; n <= maxC; n++) {
    const prefix = carbonPrefixes[n]
    const name = `${prefix}yne`
    const formula = `C${n}H${2 * n - 2}`
    out.push(
      baseCompound({
        id: `compound-${name}`,
        name,
        aliases: [name, formula],
        formula,
        condensed: chainArt(n, "≡CH"),
        family: "Alkyne",
        functionalGroup: "Alkyne",
        polarity: "Nonpolar",
        hydrogenBonding: false,
        explanation: `Unsaturated hydrocarbon with one C≡C triple bond.`,
        structureArt: chainArt(n, "≡CH"),
        commonReactions: ["Addition", "Combustion"],
        subtopics: ["alkynes"],
      }),
    )
  }
  return out
}

export function generateAlcohols(maxC = 20): CompoundRecord[] {
  const out: CompoundRecord[] = []
  for (let n = 1; n <= maxC; n++) {
    const prefix = carbonPrefixes[n]
    const name = n === 1 ? "methanol" : `${prefix}an-1-ol`
    const formula = n === 1 ? "CH4O" : `C${n}H${2 * n + 2}O`
    out.push(
      baseCompound({
        id: `compound-${name.replace(/\s/g, "-")}`,
        name,
        aliases: [name, formula, `${prefix}anol`],
        formula,
        condensed: chainArt(n, "OH"),
        family: "Alcohol",
        functionalGroup: "Hydroxyl",
        polarity: "Polar",
        hydrogenBonding: true,
        explanation: `Primary alcohol — contains —OH group.`,
        structureArt: chainArt(n, "OH"),
        commonReactions: ["Oxidation", "Esterification", "Dehydration", "Combustion"],
        subtopics: ["alcohols"],
        tags: ["alcohol", "hydroxyl"],
      }),
    )
  }
  return out
}

export function generateCarboxylicAcids(maxC = 20): CompoundRecord[] {
  const out: CompoundRecord[] = []
  for (let n = 1; n <= maxC; n++) {
    const prefix = carbonPrefixes[n]
    const name = n === 1 ? "methanoic acid" : `${prefix}anoic acid`
    const formula = `C${n}H${2 * n}O2`
    out.push(
      baseCompound({
        id: `compound-${name.replace(/\s/g, "-")}`,
        name,
        aliases: [name, formula, n === 1 ? "formic acid" : n === 2 ? "acetic acid" : ""].filter(Boolean),
        formula,
        condensed: chainArt(n, "COOH"),
        family: "Carboxylic acid",
        functionalGroup: "Carboxyl",
        polarity: "Polar",
        hydrogenBonding: true,
        explanation: `Carboxylic acid with —COOH group.`,
        structureArt: chainArt(n, "COOH"),
        commonReactions: ["Esterification", "Neutralization", "Reduction"],
        subtopics: ["carboxylic-acids"],
        tags: ["carboxylic-acid", "carboxyl"],
      }),
    )
  }
  return out
}

export function generateAldehydes(maxC = 10): CompoundRecord[] {
  const out: CompoundRecord[] = []
  for (let n = 1; n <= maxC; n++) {
    const prefix = carbonPrefixes[n]
    const name = n === 1 ? "methanal" : `${prefix}anal`
    const formula = `C${n}H${2 * n}O`
    out.push(
      baseCompound({
        id: `compound-${name}`,
        name,
        aliases: [name, formula, n === 1 ? "formaldehyde" : n === 2 ? "ethanal" : "acetaldehyde"],
        formula,
        condensed: n === 1 ? "H—CHO" : `CH3${"—CH2".repeat(Math.max(0, n - 2))}—CHO`,
        family: "Aldehyde",
        functionalGroup: "Carbonyl (aldehyde)",
        polarity: "Polar",
        hydrogenBonding: false,
        explanation: `Aldehyde with terminal —CHO group.`,
        structureArt: n === 1 ? "H—C(=O)—H" : `CH3—${"CH2—".repeat(n - 2)}CHO`,
        commonReactions: ["Oxidation to acid", "Reduction to alcohol", "Nucleophilic addition"],
        subtopics: ["aldehydes"],
      }),
    )
  }
  return out
}

export function generateKetones(maxC = 10): CompoundRecord[] {
  const out: CompoundRecord[] = []
  for (let n = 3; n <= maxC; n++) {
    const prefix = carbonPrefixes[n]
    const name = `${prefix}anone`
    const formula = `C${n}H${2 * n}O`
    out.push(
      baseCompound({
        id: `compound-${name}`,
        name,
        aliases: [name, formula, n === 3 ? "propanone" : "acetone"],
        formula,
        condensed: `CH3—CO—CH3`.replace("3", String(n)),
        family: "Ketone",
        functionalGroup: "Carbonyl (ketone)",
        polarity: "Polar",
        hydrogenBonding: false,
        explanation: `Ketone with internal C=O group.`,
        structureArt: `CH3—CO—CH2—...`,
        commonReactions: ["Nucleophilic addition", "Reduction", "Combustion"],
        subtopics: ["ketones"],
      }),
    )
  }
  return out
}

export function generateAllOrganic(): CompoundRecord[] {
  return [
    ...generateAlkanes(),
    ...generateAlkenes(),
    ...generateAlkynes(),
    ...generateAlcohols(),
    ...generateCarboxylicAcids(),
    ...generateAldehydes(),
    ...generateKetones(),
  ]
}
