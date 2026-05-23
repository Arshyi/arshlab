// Chemistry Data Layer for ARSHLAB
// Rule-based, hard-coded IB/first-year chemistry engine

export interface Compound {
  name: string
  aliases: string[]
  formula: string
  condensed: string
  family: string
  functionalGroup: string
  polarity: "Nonpolar" | "Polar" | "Ionic"
  hydrogenBonding: boolean
  explanation: string
  structureArt: string
  commonReactions: string[]
}

// IUPAC Prefixes for carbon chain lengths
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

// Generate condensed formula art for straight chains
function generateChainArt(carbons: number, endGroup: string = "H"): string {
  if (carbons === 1) {
    if (endGroup === "H") return "CH4"
    if (endGroup === "OH") return "CH3—OH"
    if (endGroup === "COOH") return "H—COOH"
    return `CH3—${endGroup}`
  }
  
  const parts: string[] = ["CH3"]
  for (let i = 2; i < carbons; i++) {
    parts.push("CH2")
  }
  
  if (endGroup === "H") {
    parts.push("CH3")
  } else if (endGroup === "OH") {
    parts.push("CH2—OH")
  } else if (endGroup === "COOH") {
    parts.push("COOH")
  } else if (endGroup === "=CH2") {
    // Alkene - modify last CH2 to show double bond
    parts[parts.length - 1] = "CH═CH2"
  } else if (endGroup === "≡CH") {
    // Alkyne - modify last CH2 to show triple bond
    parts[parts.length - 1] = "C≡CH"
  } else {
    parts.push(endGroup)
  }
  
  return parts.join("—")
}

// Generate Alkanes (CnH2n+2)
function generateAlkanes(): Compound[] {
  const alkanes: Compound[] = []
  
  for (let n = 1; n <= 20; n++) {
    const prefix = carbonPrefixes[n]
    const name = `${prefix}ane`
    const formula = `C${n === 1 ? "" : n}H${2 * n + 2}`
    
    alkanes.push({
      name,
      aliases: [
        name,
        formula,
        n === 1 ? "CH4" : `C${n}H${2 * n + 2}`,
        ...(n === 1 ? ["natural gas"] : []),
        ...(n === 2 ? ["C2H6"] : []),
        ...(n === 3 ? ["C3H8", "LPG"] : []),
        ...(n === 4 ? ["C4H10"] : []),
        ...(n === 6 ? ["C6H14"] : []),
        ...(n === 8 ? ["C8H18", "octane", "gasoline component"] : []),
      ],
      formula,
      condensed: n === 1 ? "CH4" : `CH3${"—CH2".repeat(n - 2)}—CH3`,
      family: "Alkane",
      functionalGroup: "C—C, C—H (single bonds only)",
      polarity: "Nonpolar",
      hydrogenBonding: false,
      explanation: `${name.charAt(0).toUpperCase() + name.slice(1)} is a saturated hydrocarbon with ${n} carbon atom${n > 1 ? "s" : ""} and only single bonds. Alkanes are unreactive due to strong C—C and C—H bonds.`,
      structureArt: generateChainArt(n, "H"),
      commonReactions: ["Combustion", "Halogenation (UV light)"],
    })
  }
  
  return alkanes
}

// Generate Alkenes (CnH2n, n >= 2)
function generateAlkenes(): Compound[] {
  const alkenes: Compound[] = []
  
  for (let n = 2; n <= 20; n++) {
    const prefix = carbonPrefixes[n]
    const name = `${prefix}ene`
    const formula = `C${n}H${2 * n}`
    
    alkenes.push({
      name,
      aliases: [
        name,
        formula,
        ...(n === 2 ? ["C2H4", "ethylene"] : []),
        ...(n === 3 ? ["C3H6", "propylene"] : []),
      ],
      formula,
      condensed: n === 2 ? "CH2═CH2" : `CH3${"—CH2".repeat(n - 3)}—CH═CH2`,
      family: "Alkene",
      functionalGroup: "C═C (double bond)",
      polarity: "Nonpolar",
      hydrogenBonding: false,
      explanation: `${name.charAt(0).toUpperCase() + name.slice(1)} is an unsaturated hydrocarbon with ${n} carbon atoms and one C═C double bond. The double bond makes alkenes more reactive than alkanes.`,
      structureArt: n === 2 ? "CH2═CH2" : `CH3${"—CH2".repeat(n - 3)}—CH═CH2`,
      commonReactions: ["Addition (Br2)", "Hydrogenation", "Polymerization", "Combustion"],
    })
  }
  
  return alkenes
}

// Generate Alkynes (CnH2n-2, n >= 2)
function generateAlkynes(): Compound[] {
  const alkynes: Compound[] = []
  
  for (let n = 2; n <= 20; n++) {
    const prefix = carbonPrefixes[n]
    const name = `${prefix}yne`
    const formula = `C${n}H${2 * n - 2}`
    
    alkynes.push({
      name,
      aliases: [
        name,
        formula,
        ...(n === 2 ? ["C2H2", "acetylene"] : []),
      ],
      formula,
      condensed: n === 2 ? "CH≡CH" : `CH3${"—CH2".repeat(n - 3)}—C≡CH`,
      family: "Alkyne",
      functionalGroup: "C≡C (triple bond)",
      polarity: "Nonpolar",
      hydrogenBonding: false,
      explanation: `${name.charAt(0).toUpperCase() + name.slice(1)} is an unsaturated hydrocarbon with ${n} carbon atoms and one C≡C triple bond. Alkynes are highly reactive due to the electron-rich triple bond.`,
      structureArt: n === 2 ? "HC≡CH" : `CH3${"—CH2".repeat(n - 3)}—C≡CH`,
      commonReactions: ["Addition (H2)", "Addition (Br2)", "Combustion"],
    })
  }
  
  return alkynes
}

// Generate Primary Alcohols (CnH2n+2O)
function generateAlcohols(): Compound[] {
  const alcohols: Compound[] = []
  
  for (let n = 1; n <= 20; n++) {
    const prefix = carbonPrefixes[n]
    const name = n === 1 ? "methanol" : `${prefix}an-1-ol`
    const formula = `C${n === 1 ? "" : n}H${2 * n + 2}O`
    
    alcohols.push({
      name,
      aliases: [
        name,
        formula,
        `${prefix}anol`,
        ...(n === 1 ? ["CH3OH", "methyl alcohol", "wood alcohol"] : []),
        ...(n === 2 ? ["C2H5OH", "CH3CH2OH", "ethyl alcohol", "drinking alcohol", "alcohol"] : []),
        ...(n === 3 ? ["C3H7OH", "CH3CH2CH2OH", "1-propanol", "n-propanol", "propyl alcohol"] : []),
        ...(n === 4 ? ["C4H9OH", "1-butanol", "n-butanol", "butyl alcohol"] : []),
      ],
      formula,
      condensed: n === 1 ? "CH3—OH" : `CH3${"—CH2".repeat(n - 1)}—OH`,
      family: "Alcohol",
      functionalGroup: "—OH (hydroxyl)",
      polarity: "Polar",
      hydrogenBonding: true,
      explanation: `${name.charAt(0).toUpperCase() + name.slice(1)} is a primary alcohol with the —OH group attached to carbon 1. The hydroxyl group makes it polar and capable of hydrogen bonding, giving it a higher boiling point than alkanes of similar mass.`,
      structureArt: n === 1 ? "CH3—OH" : generateChainArt(n, "OH"),
      commonReactions: ["Combustion", "Oxidation (to aldehyde/acid)", "Esterification", "Dehydration"],
    })
  }
  
  return alcohols
}

// Generate Carboxylic Acids (CnH2nO2)
function generateCarboxylicAcids(): Compound[] {
  const acids: Compound[] = []
  
  for (let n = 1; n <= 20; n++) {
    const prefix = carbonPrefixes[n]
    const name = `${prefix}anoic acid`
    const formula = `C${n === 1 ? "" : n}H${2 * n}O2`
    
    acids.push({
      name,
      aliases: [
        name,
        formula,
        ...(n === 1 ? ["HCOOH", "formic acid"] : []),
        ...(n === 2 ? ["CH3COOH", "acetic acid", "vinegar"] : []),
        ...(n === 3 ? ["C2H5COOH", "propionic acid"] : []),
        ...(n === 4 ? ["C3H7COOH", "butyric acid", "butanoic acid"] : []),
      ],
      formula,
      condensed: n === 1 ? "H—COOH" : `CH3${"—CH2".repeat(n - 2)}—COOH`,
      family: "Carboxylic Acid",
      functionalGroup: "—COOH (carboxyl)",
      polarity: "Polar",
      hydrogenBonding: true,
      explanation: `${name.charAt(0).toUpperCase() + name.slice(1)} is a carboxylic acid with the —COOH functional group. The carboxyl group can donate H⁺, making it acidic. It forms hydrogen bonds, giving it a high boiling point.`,
      structureArt: n === 1 ? "H—C(═O)—OH" : `CH3${"—CH2".repeat(n - 2)}—C(═O)—OH`,
      commonReactions: ["Esterification", "Neutralization", "Reduction"],
    })
  }
  
  return acids
}

// Secondary Alcohols
const secondaryAlcohols: Compound[] = [
  {
    name: "propan-2-ol",
    aliases: ["propan-2-ol", "2-propanol", "isopropanol", "isopropyl alcohol", "IPA", "rubbing alcohol", "C3H8O"],
    formula: "C3H8O",
    condensed: "CH3—CH(OH)—CH3",
    family: "Alcohol (Secondary)",
    functionalGroup: "—OH (hydroxyl)",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation: "Propan-2-ol is a secondary alcohol because the —OH group is attached to a carbon bonded to two other carbons. It is commonly used as rubbing alcohol.",
    structureArt: `    OH
     |
CH3—CH—CH3`,
    commonReactions: ["Combustion", "Oxidation (to ketone)", "Dehydration"],
  },
  {
    name: "butan-2-ol",
    aliases: ["butan-2-ol", "2-butanol", "sec-butanol", "C4H10O"],
    formula: "C4H10O",
    condensed: "CH3—CH(OH)—CH2—CH3",
    family: "Alcohol (Secondary)",
    functionalGroup: "—OH (hydroxyl)",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation: "Butan-2-ol is a secondary alcohol with the —OH group on the second carbon. Oxidation produces a ketone (butanone).",
    structureArt: `       OH
        |
CH3—CH—CH2—CH3`,
    commonReactions: ["Combustion", "Oxidation (to ketone)", "Dehydration"],
  },
]

// Simple Esters
const esters: Compound[] = [
  {
    name: "methyl ethanoate",
    aliases: ["methyl ethanoate", "methyl acetate", "CH3COOCH3", "C3H6O2"],
    formula: "C3H6O2",
    condensed: "CH3—COO—CH3",
    family: "Ester",
    functionalGroup: "—COO— (ester linkage)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "Methyl ethanoate is an ester formed from methanol and ethanoic acid. Esters have characteristic fruity smells and are used in fragrances and flavorings.",
    structureArt: "CH3—C(═O)—O—CH3",
    commonReactions: ["Hydrolysis", "Transesterification"],
  },
  {
    name: "ethyl ethanoate",
    aliases: ["ethyl ethanoate", "ethyl acetate", "CH3COOC2H5", "C4H8O2"],
    formula: "C4H8O2",
    condensed: "CH3—COO—CH2—CH3",
    family: "Ester",
    functionalGroup: "—COO— (ester linkage)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "Ethyl ethanoate is an ester formed from ethanol and ethanoic acid. It has a sweet, fruity odor and is used as a solvent in nail polish remover.",
    structureArt: "CH3—C(═O)—O—CH2—CH3",
    commonReactions: ["Hydrolysis", "Transesterification"],
  },
  {
    name: "propyl ethanoate",
    aliases: ["propyl ethanoate", "propyl acetate", "CH3COOC3H7", "C5H10O2"],
    formula: "C5H10O2",
    condensed: "CH3—COO—CH2—CH2—CH3",
    family: "Ester",
    functionalGroup: "—COO— (ester linkage)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "Propyl ethanoate is an ester formed from propan-1-ol and ethanoic acid. It has a pear-like aroma.",
    structureArt: "CH3—C(═O)—O—CH2—CH2—CH3",
    commonReactions: ["Hydrolysis", "Transesterification"],
  },
]

// Special Compounds
const specialCompounds: Compound[] = [
  {
    name: "benzene",
    aliases: ["benzene", "C6H6", "PhH", "benzol"],
    formula: "C6H6",
    condensed: "C6H6",
    family: "Aromatic Hydrocarbon",
    functionalGroup: "Benzene ring (aromatic)",
    polarity: "Nonpolar",
    hydrogenBonding: false,
    explanation: "Benzene is an aromatic hydrocarbon with a planar hexagonal ring of 6 carbons with delocalized π electrons. The ring is very stable due to resonance.",
    structureArt: `    H
    |
H—C═C—H
    ‖   ‖
H—C   C—H
    ╲ ╱
     C
     |
     H

  ⌬ (benzene ring)`,
    commonReactions: ["Electrophilic substitution", "Nitration", "Halogenation"],
  },
  {
    name: "phenol",
    aliases: ["phenol", "C6H5OH", "hydroxybenzene", "carbolic acid"],
    formula: "C6H6O",
    condensed: "C6H5—OH",
    family: "Phenol",
    functionalGroup: "—OH on benzene ring",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation: "Phenol is a benzene ring with a hydroxyl group attached. It is weakly acidic (more so than alcohols) because the benzene ring stabilizes the negative charge after losing H⁺.",
    structureArt: `     OH
      |
    ⌬ (benzene ring)`,
    commonReactions: ["Electrophilic substitution", "Neutralization (weak acid)"],
  },
  {
    name: "glucose",
    aliases: ["glucose", "C6H12O6", "dextrose", "blood sugar", "grape sugar"],
    formula: "C6H12O6",
    condensed: "C6H12O6",
    family: "Monosaccharide (Carbohydrate)",
    functionalGroup: "Aldehyde + multiple —OH",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation: "Glucose is a simple sugar (monosaccharide) and the primary energy source for cells. It has an aldehyde group and 5 hydroxyl groups.",
    structureArt: `CHO
 |
CHOH
 |
CHOH
 |
CHOH
 |
CHOH
 |
CH2OH`,
    commonReactions: ["Cellular respiration", "Fermentation", "Condensation (to form disaccharides)"],
  },
  {
    name: "glycogen",
    aliases: ["glycogen", "(C6H10O5)n", "animal starch"],
    formula: "(C6H10O5)n",
    condensed: "(C6H10O5)n",
    family: "Polysaccharide (Carbohydrate)",
    functionalGroup: "Glycosidic bonds",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation: "Glycogen is a polysaccharide made of many glucose units. It is stored in the liver and muscles as an energy reserve in animals.",
    structureArt: `[Glucose]—[Glucose]—[Glucose]—...
       |            |
   [Glucose]   [Glucose]
   (branched polymer)`,
    commonReactions: ["Hydrolysis (to glucose)", "Glycogenesis", "Glycogenolysis"],
  },
]

// Combine all compounds into master database
export const compoundDatabase: Compound[] = [
  ...generateAlkanes(),
  ...generateAlkenes(),
  ...generateAlkynes(),
  ...generateAlcohols(),
  ...generateCarboxylicAcids(),
  ...secondaryAlcohols,
  ...esters,
  ...specialCompounds,
]

// Search function - finds compound by name, alias, or formula
export function searchCompound(query: string): Compound | null {
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, "")
  
  // Direct name match
  const directMatch = compoundDatabase.find(
    (c) => c.name.toLowerCase().replace(/\s+/g, "") === normalizedQuery
  )
  if (directMatch) return directMatch
  
  // Alias match
  const aliasMatch = compoundDatabase.find((c) =>
    c.aliases.some((a) => a.toLowerCase().replace(/\s+/g, "") === normalizedQuery)
  )
  if (aliasMatch) return aliasMatch
  
  // Formula match
  const formulaMatch = compoundDatabase.find(
    (c) => c.formula.toLowerCase().replace(/\s+/g, "") === normalizedQuery
  )
  if (formulaMatch) return formulaMatch
  
  // Condensed formula match
  const condensedMatch = compoundDatabase.find(
    (c) => c.condensed.toLowerCase().replace(/[—\-\s]/g, "") === normalizedQuery.replace(/[—\-\s]/g, "")
  )
  if (condensedMatch) return condensedMatch
  
  // Partial name match (starts with)
  const partialMatch = compoundDatabase.find(
    (c) => c.name.toLowerCase().startsWith(normalizedQuery)
  )
  if (partialMatch) return partialMatch
  
  return null
}

// Get suggestions based on partial input
export function getSuggestions(query: string, limit: number = 6): Compound[] {
  if (!query.trim()) return []
  
  const normalizedQuery = query.toLowerCase().trim()
  
  const matches = compoundDatabase.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(normalizedQuery)
    const aliasMatch = c.aliases.some((a) => a.toLowerCase().includes(normalizedQuery))
    const formulaMatch = c.formula.toLowerCase().includes(normalizedQuery)
    return nameMatch || aliasMatch || formulaMatch
  })
  
  // Sort by relevance (exact matches first, then starts with, then contains)
  matches.sort((a, b) => {
    const aExact = a.name.toLowerCase() === normalizedQuery ? 0 : 1
    const bExact = b.name.toLowerCase() === normalizedQuery ? 0 : 1
    if (aExact !== bExact) return aExact - bExact
    
    const aStarts = a.name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1
    const bStarts = b.name.toLowerCase().startsWith(normalizedQuery) ? 0 : 1
    return aStarts - bStarts
  })
  
  return matches.slice(0, limit)
}
