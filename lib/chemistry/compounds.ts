// Chemistry Data Layer for ARSHLAB
// Rule-based, hard-coded IB/first-year chemistry engine

import {
  expandOrientationTokens,
  matchesCondensedVariants,
  shouldShowAlternateOrientation,
} from "./formula-normalize"

export interface LonePairInfo {
  atom: string
  count: number
}

export interface SymmetryInfo {
  type: "symmetric" | "asymmetric"
  equivalentEnds: boolean
  explanation: string
}

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
  /** 2D text-art with lone pair notation when toggle is on */
  structureArtWithLonePairs?: string
  lonePairs?: LonePairInfo[]
  symmetry?: SymmetryInfo
  commonReactions: string[]
}

export interface SearchResult {
  compound: Compound
  /** User typed a reversed or alternate condensed orientation */
  alternateOrientation?: boolean
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
    parts[parts.length - 1] = "CH=CH2"
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
    
    const condensed = n === 1 ? "CH4" : `CH3${"—CH2".repeat(n - 2)}—CH3`
    alkanes.push({
      name,
      aliases: [
        name,
        formula,
        n === 1 ? "CH4" : `C${n}H${2 * n + 2}`,
        ...(n === 1 ? ["natural gas"] : []),
        ...(n === 2 ? ["C2H6", "CH3CH3", "CH3-CH3", "H3C-CH3", "H3C—CH3"] : []),
        ...(n === 3 ? ["C3H8", "LPG", "CH3CH2CH3", "CH3-CH2-CH3"] : []),
        ...(n === 4 ? ["C4H10"] : []),
        ...(n === 6 ? ["C6H14"] : []),
        ...(n === 8 ? ["C8H18", "octane", "gasoline component"] : []),
      ],
      formula,
      condensed,
      family: "Alkane",
      functionalGroup: "C—C, C—H (single bonds only)",
      polarity: "Nonpolar",
      hydrogenBonding: false,
      explanation: `${name.charAt(0).toUpperCase() + name.slice(1)} is a saturated hydrocarbon with ${n} carbon atom${n > 1 ? "s" : ""} and only single bonds. Alkanes are unreactive due to strong C—C and C—H bonds.`,
      structureArt: n === 2 ? "CH3—CH3" : generateChainArt(n, "H"),
      symmetry:
        n === 1
          ? {
              type: "symmetric",
              equivalentEnds: true,
              explanation: "Methane is tetrahedral; all four hydrogens are equivalent.",
            }
          : n === 2
            ? {
                type: "symmetric",
                equivalentEnds: true,
                explanation: "Ethane is symmetric because both ends are CH3 groups.",
              }
            : {
                type: "symmetric",
                equivalentEnds: true,
                explanation: `${name.charAt(0).toUpperCase() + name.slice(1)} has equivalent CH3 groups at both ends of the carbon chain.`,
              },
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
      condensed: n === 2 ? "CH2=CH2" : `CH3${"—CH2".repeat(n - 3)}—CH=CH2`,
      family: "Alkene",
      functionalGroup: "C=C (double bond)",
      polarity: "Nonpolar",
      hydrogenBonding: false,
      explanation: `${name.charAt(0).toUpperCase() + name.slice(1)} is an unsaturated hydrocarbon with ${n} carbon atoms and one C=C double bond. The double bond makes alkenes more reactive than alkanes.`,
      structureArt: n === 2 ? "CH2=CH2" : `CH3${"—CH2".repeat(n - 3)}—CH=CH2`,
      symmetry:
        n === 2
          ? {
              type: "symmetric",
              equivalentEnds: true,
              explanation: "Ethene is symmetric; both CH2 groups are equivalent across the double bond.",
            }
          : undefined,
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
      structureArt: n === 2 ? "CH≡CH" : `CH3${"—CH2".repeat(n - 3)}—C≡CH`,
      symmetry:
        n === 2
          ? {
              type: "symmetric",
              equivalentEnds: true,
              explanation: "Ethyne is linear and symmetric; both ends are equivalent.",
            }
          : undefined,
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
        ...(n === 2
          ? [
              "C2H5OH",
              "CH3CH2OH",
              "CH3-CH2-OH",
              "CH3—CH2—OH",
              "H3C-CH2-OH",
              "H3C—CH2—OH",
              "HO-CH2-CH3",
              "HO-CH2—CH3",
              "ethyl alcohol",
              "drinking alcohol",
              "alcohol",
            ]
          : []),
        ...(n === 3 ? ["C3H7OH", "CH3CH2CH2OH", "CH3-CH2-CH2-OH", "1-propanol", "n-propanol", "propyl alcohol"] : []),
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
      structureArtWithLonePairs: n === 1 ? "CH3—OH:" : undefined,
      lonePairs: n === 1 ? [{ atom: "O", count: 2 }] : n === 2 ? [{ atom: "O", count: 2 }] : undefined,
      symmetry:
        n === 1
          ? undefined
          : n === 2
            ? {
                type: "asymmetric",
                equivalentEnds: false,
                explanation: "Ethanol is asymmetric; the CH3 end and the OH end are not equivalent.",
              }
            : n === 3
              ? {
                  type: "asymmetric",
                  equivalentEnds: false,
                  explanation:
                    "Propan-1-ol is asymmetric; the CH3 end and the OH end are not equivalent.",
                }
              : {
                type: "asymmetric",
                equivalentEnds: false,
                explanation: "The hydroxyl group at one end makes the molecule asymmetric.",
              },
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
      structureArt:
        n === 1
          ? "H—C(=O)—OH"
          : n === 2
            ? `      O
      ||
CH3—C—OH`
            : `CH3${"—CH2".repeat(n - 2)}—C(=O)—OH`,
      symmetry:
        n === 2
          ? {
              type: "asymmetric",
              equivalentEnds: false,
              explanation: "Ethanoic acid is asymmetric; the CH3 end and the carboxyl end differ.",
            }
          : undefined,
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
    symmetry: {
      type: "symmetric",
      equivalentEnds: true,
      explanation:
        "Propan-2-ol is more symmetric than propan-1-ol because the OH group is on the central carbon; both CH3 ends are equivalent.",
    },
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
    symmetry: {
      type: "asymmetric",
      equivalentEnds: false,
      explanation: "Butan-2-ol is asymmetric because the two ends of the chain are not equivalent.",
    },
    commonReactions: ["Combustion", "Oxidation (to ketone)", "Dehydration"],
  },
]

// Primary amines
const amines: Compound[] = [
  {
    name: "ammonia",
    aliases: ["ammonia", "NH3", "N H3"],
    formula: "NH3",
    condensed: "NH3",
    family: "Amine",
    functionalGroup: "—NH2 (lone pair on N)",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation:
      "Ammonia is a simple nitrogen compound with a trigonal pyramidal shape. Nitrogen has one lone pair and can accept H⁺, making ammonia a weak base.",
    structureArt: `H—N—H
   |
   H`,
    structureArtWithLonePairs: `   :
H—N—H
   |
   H`,
    lonePairs: [{ atom: "N", count: 1 }],
    symmetry: {
      type: "symmetric",
      equivalentEnds: true,
      explanation:
        "Ammonia is bent but symmetric in atom identity; all three hydrogens are equivalent, though the molecule is polar.",
    },
    commonReactions: ["Acid-base reaction", "Lewis base behavior"],
  },
  {
    name: "methylamine",
    aliases: [
      "methylamine",
      "aminomethane",
      "methanamine",
      "CH3NH2",
      "CH3-NH2",
      "CH3—NH2",
      "NH2-CH3",
      "NH2—CH3",
      "H2N-CH3",
      "H2N—CH3",
      "CH5N",
    ],
    formula: "CH5N",
    condensed: "CH3—NH2",
    family: "Amine",
    functionalGroup: "—NH2",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation:
      "Methylamine is a primary amine. The nitrogen has one lone pair and can form hydrogen bonds.",
    structureArt: "CH3—NH2",
    structureArtWithLonePairs: "CH3—NH2:",
    lonePairs: [{ atom: "N", count: 1 }],
    symmetry: {
      type: "asymmetric",
      equivalentEnds: false,
      explanation: "Methylamine is asymmetric; the CH3 end and the NH2 end are not equivalent.",
    },
    commonReactions: ["Acid-base reaction", "Combustion"],
  },
  {
    name: "ethylamine",
    aliases: [
      "ethylamine",
      "aminoethane",
      "ethanamine",
      "CH3CH2NH2",
      "CH3-CH2-NH2",
      "CH3—CH2—NH2",
      "NH2-CH2-CH3",
      "NH2—CH2—CH3",
      "H2N-CH2-CH3",
      "C2H7N",
    ],
    formula: "C2H7N",
    condensed: "CH3—CH2—NH2",
    family: "Amine",
    functionalGroup: "—NH2",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation:
      "Ethylamine is a primary amine. The nitrogen has one lone pair and can form hydrogen bonds.",
    structureArt: "CH3—CH2—NH2",
    structureArtWithLonePairs: "CH3—CH2—NH2:",
    lonePairs: [{ atom: "N", count: 1 }],
    symmetry: {
      type: "asymmetric",
      equivalentEnds: false,
      explanation: "Ethylamine is asymmetric; the CH3 end and the NH2 end are not equivalent.",
    },
    commonReactions: ["Acid-base reaction", "Combustion"],
  },
  {
    name: "propylamine",
    aliases: [
      "propylamine",
      "1-aminopropane",
      "1-aminopropan",
      "propan-1-amine",
      "CH3CH2CH2NH2",
      "CH3-CH2-CH2-NH2",
      "CH3—CH2—CH2—NH2",
      "NH2-CH2-CH2-CH3",
      "C3H9N",
    ],
    formula: "C3H9N",
    condensed: "CH3—CH2—CH2—NH2",
    family: "Amine",
    functionalGroup: "—NH2",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation:
      "Propylamine is a primary amine with a three-carbon chain. The nitrogen lone pair makes it basic and able to hydrogen bond.",
    structureArt: "CH3—CH2—CH2—NH2",
    structureArtWithLonePairs: "CH3—CH2—CH2—NH2:",
    lonePairs: [{ atom: "N", count: 1 }],
    symmetry: {
      type: "asymmetric",
      equivalentEnds: false,
      explanation: "Propylamine is asymmetric due to the NH2 group at one end only.",
    },
    commonReactions: ["Acid-base reaction", "Combustion"],
  },
  {
    name: "aniline",
    aliases: ["aniline", "phenylamine", "C6H5NH2", "C6H5-NH2", "C6H5—NH2", "aminobenzene"],
    formula: "C6H7N",
    condensed: "C6H5—NH2",
    family: "Amine",
    functionalGroup: "—NH2 on benzene ring",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation:
      "Aniline is an aromatic amine with an NH2 group attached to a benzene ring. The lone pair on nitrogen is delocalized into the ring, making aniline a weaker base than alkylamines.",
    structureArt: `     NH2
      |
    ⌬  (benzene ring)`,
    structureArtWithLonePairs: `    NH2:
      |
    ⌬  (benzene ring)`,
    lonePairs: [{ atom: "N", count: 1 }],
    symmetry: {
      type: "symmetric",
      equivalentEnds: false,
      explanation:
        "Aniline has a symmetric benzene ring, but the NH2 group breaks full molecular symmetry compared to benzene alone.",
    },
    commonReactions: ["Electrophilic substitution", "Acid-base reaction", "Diazotization"],
  },
]

// Halogenoalkanes
const halogenoalkanes: Compound[] = [
  {
    name: "chloromethane",
    aliases: ["chloromethane", "CH3Cl", "CH3-Cl", "methyl chloride"],
    formula: "CH3Cl",
    condensed: "CH3—Cl",
    family: "Halogenoalkane",
    functionalGroup: "—Cl (chloro)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "Chloromethane is a halogenoalkane with a polar C—Cl bond. It undergoes nucleophilic substitution and is used as a refrigerant precursor.",
    structureArt: "CH3—Cl",
    commonReactions: ["Nucleophilic substitution", "Elimination (with strong base)"],
  },
  {
    name: "bromoethane",
    aliases: ["bromoethane", "CH3CH2Br", "CH3-CH2-Br", "ethyl bromide"],
    formula: "C2H5Br",
    condensed: "CH3—CH2—Br",
    family: "Halogenoalkane",
    functionalGroup: "—Br (bromo)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "Bromoethane is a primary halogenoalkane. Bromine is a better leaving group than chlorine, making SN2 reactions faster.",
    structureArt: "CH3—CH2—Br",
    commonReactions: ["Nucleophilic substitution (SN2)", "Elimination"],
  },
  {
    name: "1-chloropropane",
    aliases: ["1-chloropropane", "CH3CH2CH2Cl", "CH3-CH2-CH2-Cl", "n-propyl chloride"],
    formula: "C3H7Cl",
    condensed: "CH3—CH2—CH2—Cl",
    family: "Halogenoalkane",
    functionalGroup: "—Cl (chloro)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "1-Chloropropane is a primary halogenoalkane. Primary halogenoalkanes favor SN2 mechanisms with strong nucleophiles.",
    structureArt: "CH3—CH2—CH2—Cl",
    commonReactions: ["Nucleophilic substitution", "Elimination"],
  },
]

// Carbonyl compounds (aldehydes & ketones)
const carbonylCompounds: Compound[] = [
  {
    name: "ethanal",
    aliases: ["ethanal", "acetaldehyde", "CH3CHO", "CH3-CHO", "CH3—CH=O"],
    formula: "C2H4O",
    condensed: "CH3—CH=O",
    family: "Aldehyde",
    functionalGroup: "—CHO (aldehyde)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "Ethanal is the simplest aldehyde. The carbonyl carbon is electrophilic and undergoes nucleophilic addition. It can be oxidized to ethanoic acid.",
    structureArt: "CH3—CH=O",
    commonReactions: ["Nucleophilic addition", "Oxidation to acid", "Reduction to alcohol"],
  },
  {
    name: "propanone",
    aliases: ["propanone", "acetone", "CH3COCH3", "CH3-CO-CH3", "CH3—C(=O)—CH3"],
    formula: "C3H6O",
    condensed: "CH3—C(=O)—CH3",
    family: "Ketone",
    functionalGroup: "C=O (ketone)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "Propanone (acetone) is the simplest ketone. It is a common solvent and shows a strong C=O peak in IR spectroscopy around 1715 cm⁻¹.",
    structureArt: "CH3—C(=O)—CH3",
    commonReactions: ["Nucleophilic addition", "Reduction to alcohol", "Iodoform test (HL awareness)"],
  },
]

// Ethers & amides
const ethersAndAmides: Compound[] = [
  {
    name: "methoxyethane",
    aliases: ["methoxyethane", "ethyl methyl ether", "CH3OCH2CH3", "CH3-O-CH2-CH3"],
    formula: "C3H8O",
    condensed: "CH3—O—CH2—CH3",
    family: "Ether",
    functionalGroup: "—O— (ether linkage)",
    polarity: "Polar",
    hydrogenBonding: false,
    explanation: "Methoxyethane is an ether with an oxygen bridge between methyl and ethyl groups. Ethers are relatively inert and lack O—H bonds.",
    structureArt: "CH3—O—CH2—CH3",
    commonReactions: ["Combustion"],
  },
  {
    name: "ethanamide",
    aliases: ["ethanamide", "acetamide", "CH3CONH2", "CH3-CO-NH2", "CH3—C(=O)—NH2"],
    formula: "C2H5NO",
    condensed: "CH3—C(=O)—NH2",
    family: "Amide",
    functionalGroup: "—CONH2 (amide)",
    polarity: "Polar",
    hydrogenBonding: true,
    explanation: "Ethanamide is a primary amide. Strong hydrogen bonding between N—H and C=O groups gives amides high boiling points. Amide linkages form peptide bonds in proteins.",
    structureArt: "CH3—C(=O)—NH2",
    structureArtWithLonePairs: "CH3—C(=O)—NH2:",
    lonePairs: [{ atom: "N", count: 1 }],
    commonReactions: ["Hydrolysis to acid + amine", "Dehydration to nitrile (HL awareness)"],
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
    structureArt: `   ⌬
C6H6 benzene ring`,
    symmetry: {
      type: "symmetric",
      equivalentEnds: false,
      explanation: "Benzene is a highly symmetric ring with a plane of symmetry through the molecule.",
    },
    commonReactions: ["Electrophilic substitution", "Nitration", "Halogenation"],
  },
  {
    name: "toluene",
    aliases: ["toluene", "methylbenzene", "C6H5CH3", "C7H8", "PhCH3"],
    formula: "C7H8",
    condensed: "C6H5—CH3",
    family: "Aromatic Hydrocarbon",
    functionalGroup: "C6H5— (phenyl) + methyl",
    polarity: "Nonpolar",
    hydrogenBonding: false,
    explanation: "Toluene is methylbenzene — a benzene ring with a methyl substituent. The methyl group activates the ring toward electrophilic substitution at ortho/para positions.",
    structureArt: `    CH3
     |
    ⌬  (benzene ring)`,
    symmetry: {
      type: "asymmetric",
      equivalentEnds: false,
      explanation: "Toluene has a symmetric ring but the methyl group breaks full equivalence of all ring positions.",
    },
    commonReactions: ["Electrophilic substitution", "Oxidation of side chain (HL awareness)"],
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
  ...halogenoalkanes,
  ...carbonylCompounds,
  ...ethersAndAmides,
  ...esters,
  ...amines,
  ...specialCompounds,
]

/** Pick 2D structure art with optional lone pair notation */
export function getStructureArt(compound: Compound, showLonePairs: boolean): string {
  if (showLonePairs && compound.structureArtWithLonePairs) {
    return compound.structureArtWithLonePairs
  }
  return compound.structureArt
}

// Search function - finds compound by name, alias, formula, or condensed (with normalization)
export function searchCompoundDetailed(query: string): SearchResult | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const normalizedQuery = trimmed.toLowerCase().replace(/\s+/g, "")

  // Direct name match
  const directMatch = compoundDatabase.find(
    (c) => c.name.toLowerCase().replace(/\s+/g, "") === normalizedQuery
  )
  if (directMatch) return { compound: directMatch }

  // Alias match
  const aliasMatch = compoundDatabase.find((c) =>
    c.aliases.some((a) => a.toLowerCase().replace(/\s+/g, "") === normalizedQuery)
  )
  if (aliasMatch) {
    return {
      compound: aliasMatch,
      alternateOrientation: shouldShowAlternateOrientation(trimmed, aliasMatch),
    }
  }

  // Formula match
  const formulaMatch = compoundDatabase.find(
    (c) => c.formula.toLowerCase().replace(/\s+/g, "") === normalizedQuery
  )
  if (formulaMatch) return { compound: formulaMatch }

  // Condensed formula match with normalization
  const condensedMatch = compoundDatabase.find((c) => matchesCondensedVariants(trimmed, c))
  if (condensedMatch) {
    return {
      compound: condensedMatch,
      alternateOrientation: shouldShowAlternateOrientation(trimmed, condensedMatch),
    }
  }

  // Partial name match (starts with)
  const partialMatch = compoundDatabase.find((c) =>
    c.name.toLowerCase().startsWith(normalizedQuery)
  )
  if (partialMatch) return { compound: partialMatch }

  return null
}

export function searchCompound(query: string): Compound | null {
  return searchCompoundDetailed(query)?.compound ?? null
}

// Get suggestions based on partial input
export function getSuggestions(query: string, limit: number = 6): Compound[] {
  if (!query.trim()) return []
  
  const normalizedQuery = query.toLowerCase().trim()
  
  const matches = compoundDatabase.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(normalizedQuery)
    const aliasMatch = c.aliases.some((a) => a.toLowerCase().includes(normalizedQuery))
    const formulaMatch = c.formula.toLowerCase().includes(normalizedQuery)
    const condensedMatch = expandOrientationTokens(c.condensed).includes(
      expandOrientationTokens(normalizedQuery)
    )
    return nameMatch || aliasMatch || formulaMatch || condensedMatch
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

// Master database exports (v1.0 infrastructure)
export { ALL_COMPOUNDS, getCompoundById, getCompoundsByFamily } from "./database/compounds"
export { searchChemistry } from "./database/search/engine"
export { getDatabaseMeta } from "./database/registry"
