// IB Chemistry HL — 9 major functional groups

export interface FunctionalGroup {
  id: string
  name: string
  structures: string[]
  representativeClass: string
  generalFormula: string
  color: string
  polarity: "Nonpolar" | "Polar" | "Mixed"
  hydrogenBonding: boolean
  acidityBasicity?: string
  properties: string[]
  characteristicReactions: string[]
  iupacNamingRules: string[]
  irAbsorptionRanges: { range: string; description: string }[]
  msFragmentationNotes: string[]
  nmrHints: string[]
  exampleCompoundNames: string[]
  structureArtExamples: string[]
  explanation: string
  searchKeywords: string[]
}

export const functionalGroups: FunctionalGroup[] = [
  {
    id: "halogeno",
    name: "Halogeno Group",
    structures: ["—F", "—Cl", "—Br", "—I"],
    representativeClass: "Halogenoalkanes",
    generalFormula: "R—X",
    color: "emerald",
    polarity: "Polar",
    hydrogenBonding: false,
    properties: [
      "Polar C—X bonds (dipole toward halogen)",
      "Nucleophilic substitution (SN1/SN2)",
      "Boiling point increases with halogen size",
      "Iodine is best leaving group; fluorine is poorest",
    ],
    characteristicReactions: ["Nucleophilic substitution", "Elimination (with base)", "Combustion"],
    iupacNamingRules: [
      "Name as haloalkane: fluoro-, chloro-, bromo-, iodo- prefix",
      "Number the carbon chain to give the halogen the lowest locant",
      "Example: CH3CH2Cl → chloroethane",
    ],
    irAbsorptionRanges: [
      { range: "500–800 cm⁻¹", description: "C—X stretch (halogen fingerprint region)" },
    ],
    msFragmentationNotes: [
      "M+ peak often weak for larger halogens",
      "Loss of X• to form carbocation fragments",
      "Isotope patterns for Cl (3:1) and Br (1:1) help identification",
    ],
    nmrHints: [
      "Protons on carbon adjacent to halogen are deshielded (δ ~3–4 ppm)",
      "Splitting follows (n+1) rule with neighboring protons",
    ],
    exampleCompoundNames: ["chloromethane", "bromoethane", "1-chloropropane"],
    structureArtExamples: ["CH3—Cl", "CH3—CH2—Br"],
    explanation:
      "Halogenoalkanes contain a carbon-halogen bond. The C—X bond is polar, making the carbon electrophilic and susceptible to nucleophilic attack.",
    searchKeywords: ["halogeno", "halo", "halogen", "chloro", "bromo", "fluoro", "iodo", "halogenoalkane"],
  },
  {
    id: "hydroxyl",
    name: "Hydroxyl Group",
    structures: ["—OH"],
    representativeClass: "Alcohols",
    generalFormula: "R—OH",
    color: "blue",
    polarity: "Polar",
    hydrogenBonding: true,
    acidityBasicity: "Very weakly acidic (pKa ~16)",
    properties: [
      "Strong hydrogen bonding → high boiling points",
      "Oxidation to aldehydes/ketones/acids",
      "Esterification with carboxylic acids",
    ],
    characteristicReactions: ["Oxidation", "Esterification", "Dehydration", "Combustion"],
    iupacNamingRules: [
      "Suffix -ol for the highest priority —OH on the main chain",
      "Number to give —OH the lowest locant",
      "Example: CH3CH2OH → ethan-1-ol (ethanol)",
    ],
    irAbsorptionRanges: [
      { range: "3200–3600 cm⁻¹", description: "Broad O—H stretch (hydrogen bonded)" },
      { range: "1050–1150 cm⁻¹", description: "C—O stretch" },
    ],
    msFragmentationNotes: [
      "M+ often visible for small alcohols",
      "α-cleavage can give [M−18] after loss of H2O",
      "Common fragments: loss of alkyl from oxygen",
    ],
    nmrHints: [
      "OH proton: broad singlet, δ ~1–5.5 ppm (exchange broadens)",
      "Protons on C adjacent to OH: δ ~3.3–4.0 ppm",
    ],
    exampleCompoundNames: ["methanol", "ethanol", "propan-1-ol", "propan-2-ol"],
    structureArtExamples: ["CH3—OH", "CH3—CH2—OH"],
    explanation:
      "The hydroxyl group makes alcohols polar and capable of hydrogen bonding, explaining their relatively high boiling points compared to alkanes.",
    searchKeywords: ["alcohol", "hydroxyl", "primary alcohol", "secondary alcohol", "tertiary alcohol", "ol"],
  },
  {
    id: "carbonyl",
    name: "Carbonyl Group",
    structures: [">C=O"],
    representativeClass: "Aldehydes & Ketones",
    generalFormula: "R—C(=O)—R′",
    color: "violet",
    polarity: "Polar",
    hydrogenBonding: false,
    properties: [
      "Polar C=O bond (δ+ on carbon)",
      "Nucleophilic addition at carbonyl carbon",
      "Key target in spectroscopy (strong IR peak ~1700 cm⁻¹)",
    ],
    characteristicReactions: ["Nucleophilic addition", "Reduction", "Oxidation (aldehydes only)", "Condensation"],
    iupacNamingRules: [
      "Aldehydes: suffix -al (e.g. ethanal)",
      "Ketones: suffix -one with locant (e.g. propanone)",
      "Carbonyl carbon is always C-1 in aldehydes",
    ],
    irAbsorptionRanges: [
      { range: "1680–1750 cm⁻¹", description: "Strong, sharp C=O stretch" },
    ],
    msFragmentationNotes: [
      "α-cleavage common adjacent to carbonyl",
      "McLafferty rearrangement for longer chains (HL awareness)",
      "Aldehydes may show M+−1 from α-hydrogen loss",
    ],
    nmrHints: [
      "Aldehyde H: distinctive singlet ~9–10 ppm",
      "Ketone: no aldehyde proton; alkyl protons δ ~2–2.5 ppm near C=O",
    ],
    exampleCompoundNames: ["ethanal", "propanone"],
    structureArtExamples: ["CH3—CH=O", "CH3—C(=O)—CH3"],
    explanation:
      "The carbonyl group is highly polar. Aldehydes have a hydrogen on the carbonyl carbon; ketones have two alkyl groups instead.",
    searchKeywords: ["carbonyl", "aldehyde", "ketone", "anal", "one"],
  },
  {
    id: "carboxyl",
    name: "Carboxyl Group",
    structures: ["—COOH"],
    representativeClass: "Carboxylic Acids",
    generalFormula: "R—COOH",
    color: "amber",
    polarity: "Polar",
    hydrogenBonding: true,
    acidityBasicity: "Weak acids (pKa ~4–5)",
    properties: [
      "Dimerize via hydrogen bonding in non-polar solvents",
      "Esterification with alcohols",
      "Form salts with bases",
    ],
    characteristicReactions: ["Esterification", "Neutralization", "Reduction to alcohol"],
    iupacNamingRules: [
      "Suffix -oic acid",
      "Carboxyl carbon is always C-1",
      "Example: CH3COOH → ethanoic acid",
    ],
    irAbsorptionRanges: [
      { range: "2500–3300 cm⁻¹", description: "Very broad O—H stretch (dimer)" },
      { range: "1700–1725 cm⁻¹", description: "C=O stretch" },
      { range: "1210–1320 cm⁻¹", description: "C—O stretch" },
    ],
    msFragmentationNotes: [
      "M+ often weak due to hydrogen bonding",
      "[M−17] loss of OH common",
      "α-cleavage gives stable acylium fragments",
    ],
    nmrHints: [
      "COOH proton: very broad, δ ~10–13 ppm",
      "Protons on α-carbon: δ ~2–2.5 ppm",
    ],
    exampleCompoundNames: ["methanoic acid", "ethanoic acid"],
    structureArtExamples: ["H—C(=O)—OH", "CH3—C(=O)—OH"],
    explanation:
      "Carboxylic acids contain both a carbonyl and a hydroxyl on the same carbon, making them acidic and strongly hydrogen bonding.",
    searchKeywords: ["carboxylic", "carboxyl", "oic acid", "acid"],
  },
  {
    id: "alkoxy",
    name: "Alkoxy Group",
    structures: ["—O—"],
    representativeClass: "Ethers",
    generalFormula: "R—O—R′",
    color: "cyan",
    polarity: "Mixed",
    hydrogenBonding: false,
    properties: [
      "Relatively inert (no O—H to react)",
      "Weak polarity from C—O—C bending",
      "Common solvents (e.g. diethyl ether)",
    ],
    characteristicReactions: ["Combustion", "Cleavage under extreme conditions (HL awareness)"],
    iupacNamingRules: [
      "Name as alkoxy substituent on alkane chain",
      "Example: CH3OCH2CH3 → methoxyethane",
      "Alternatively: ethyl methyl ether (common name)",
    ],
    irAbsorptionRanges: [
      { range: "1050–1150 cm⁻¹", description: "C—O—C asymmetric stretch" },
      { range: "No broad O—H", description: "Distinguishes ethers from alcohols" },
    ],
    msFragmentationNotes: [
      "α-cleavage at ether linkage common",
      "M+ may be weak for branched ethers",
    ],
    nmrHints: [
      "No OH signal",
      "Protons on carbons adjacent to oxygen: δ ~3.3–3.7 ppm",
    ],
    exampleCompoundNames: ["methoxyethane"],
    structureArtExamples: ["CH3—O—CH2—CH3"],
    explanation:
      "Ethers have an oxygen bridge between two alkyl groups. They lack O—H bonds, so they cannot hydrogen bond with each other like alcohols.",
    searchKeywords: ["ether", "alkoxy", "methoxy"],
  },
  {
    id: "amino",
    name: "Amino Group",
    structures: ["—NH2"],
    representativeClass: "Amines",
    generalFormula: "R—NH2",
    color: "rose",
    polarity: "Polar",
    hydrogenBonding: true,
    acidityBasicity: "Weak bases (accept H⁺ to form ammonium salts)",
    properties: [
      "Lone pair on nitrogen → Lewis base",
      "Hydrogen bonding (primary/secondary amines)",
      "Proton acceptance forms —NH3+",
    ],
    characteristicReactions: ["Acid-base reaction", "Nucleophilic substitution", "Condensation"],
    iupacNamingRules: [
      "Suffix -amine for primary amines",
      "Substituents on N use N- prefix (secondary/tertiary)",
      "Example: CH3NH2 → methylamine (aminomethane)",
    ],
    irAbsorptionRanges: [
      { range: "3300–3500 cm⁻¹", description: "N—H stretch (1° amine: two peaks; 2°: one peak)" },
    ],
    msFragmentationNotes: [
      "α-cleavage common",
      "M+ visible for many amines",
      "Loss of alkyl from nitrogen gives key fragments",
    ],
    nmrHints: [
      "NH2 protons: broad, δ ~1–3 ppm (exchange broadens)",
      "Protons on C adjacent to N: δ ~2.2–2.8 ppm",
    ],
    exampleCompoundNames: ["methylamine", "ethylamine", "aniline"],
    structureArtExamples: ["CH3—NH2", "CH3—NH2:"],
    explanation:
      "Amines are organic bases. The nitrogen lone pair can accept a proton, and primary amines can form hydrogen bonds.",
    searchKeywords: ["amine", "amino", "amin"],
  },
  {
    id: "amido",
    name: "Amido Group",
    structures: ["—CONH2"],
    representativeClass: "Amides",
    generalFormula: "R—C(=O)—NH2",
    color: "indigo",
    polarity: "Polar",
    hydrogenBonding: true,
    acidityBasicity: "Very weakly basic (resonance stabilizes C—N bond)",
    properties: [
      "Strong hydrogen bonding (N—H and C=O)",
      "Peptide linkages in proteins",
      "Much less reactive than amines",
    ],
    characteristicReactions: ["Hydrolysis (acid/base)", "Dehydration to nitriles (HL awareness)"],
    iupacNamingRules: [
      "Drop -e from alkane name, add -amide",
      "Example: CH3CONH2 → ethanamide",
      "Substituents on N: N-methyl, N,N-dimethyl, etc.",
    ],
    irAbsorptionRanges: [
      { range: "3100–3500 cm⁻¹", description: "N—H stretch (primary amide: two peaks)" },
      { range: "1630–1680 cm⁻¹", description: "C=O stretch (amide I band)" },
    ],
    msFragmentationNotes: [
      "M+ often visible for simple amides",
      "Loss of alkyl from carbonyl or cleavage at amide bond",
    ],
    nmrHints: [
      "NH2 protons: broad, δ ~5–7 ppm",
      "Protons on α-carbon: δ ~2–2.5 ppm",
    ],
    exampleCompoundNames: ["ethanamide"],
    structureArtExamples: ["CH3—C(=O)—NH2"],
    explanation:
      "Amides link a carbonyl to nitrogen. Resonance between the lone pair on N and the C=O makes the C—N bond partially double, reducing basicity.",
    searchKeywords: ["amide", "amido"],
  },
  {
    id: "ester",
    name: "Ester Group",
    structures: ["—COO—"],
    representativeClass: "Esters",
    generalFormula: "R—C(=O)—O—R′",
    color: "orange",
    polarity: "Polar",
    hydrogenBonding: false,
    properties: [
      "Characteristic fruity smells",
      "Products of condensation (alcohol + acid)",
      "Hydrolysis back to acid + alcohol",
    ],
    characteristicReactions: ["Hydrolysis", "Transesterification", "Condensation (reverse)"],
    iupacNamingRules: [
      "Name as alkyl alkanoate",
      "Example: CH3COOCH3 → methyl ethanoate",
      "Alkyl from alcohol first, then acid name",
    ],
    irAbsorptionRanges: [
      { range: "1730–1750 cm⁻¹", description: "C=O stretch (no broad O—H)" },
      { range: "1150–1250 cm⁻¹", description: "C—O stretch (ester linkage)" },
    ],
    msFragmentationNotes: [
      "McLafferty-type cleavages possible",
      "[M−OR] acylium ion common",
      "Distinct from carboxylic acids (no broad O—H in IR)",
    ],
    nmrHints: [
      "OCH3 singlet ~3.7 ppm (methyl ester)",
      "OCH2 signals ~4.0–4.2 ppm",
      "No COOH proton",
    ],
    exampleCompoundNames: ["methyl ethanoate", "ethyl ethanoate"],
    structureArtExamples: ["CH3—C(=O)—O—CH3", "CH3—C(=O)—O—CH2—CH3"],
    explanation:
      "Esters form when a carboxylic acid reacts with an alcohol. They are polar but cannot hydrogen bond as effectively as acids or alcohols.",
    searchKeywords: ["ester", "ethanoate", "oate"],
  },
  {
    id: "phenyl",
    name: "Phenyl Group",
    structures: ["C6H5—", "⌬"],
    representativeClass: "Arenes",
    generalFormula: "C6H5—R",
    color: "fuchsia",
    polarity: "Mixed",
    hydrogenBonding: false,
    properties: [
      "Delocalized π system (aromaticity)",
      "Electrophilic substitution (not addition)",
      "Ring stability from resonance",
    ],
    characteristicReactions: ["Electrophilic substitution", "Nitration", "Halogenation", "Friedel-Crafts (HL awareness)"],
    iupacNamingRules: [
      "Benzene as parent; substituent gets locant",
      "Example: C6H5CH3 → methylbenzene (toluene)",
      "Phenyl group = C6H5— when benzene is substituent",
    ],
    irAbsorptionRanges: [
      { range: "1600 & 1500 cm⁻¹", description: "Aromatic C=C ring stretches" },
      { range: "3000–3100 cm⁻¹", description: "sp² C—H stretch (aromatic)" },
    ],
    msFragmentationNotes: [
      "Phenyl cation (m/z 77) common fragment",
      "Tropylium ion (m/z 91) from alkylbenzenes",
    ],
    nmrHints: [
      "Aromatic protons: δ ~6.5–8.5 ppm",
      "Substitution pattern affects splitting (HL awareness)",
    ],
    exampleCompoundNames: ["benzene", "phenol", "toluene", "aniline"],
    structureArtExamples: ["⌬", "C6H5—"],
    explanation:
      "Arenes contain a benzene ring with delocalized electrons. The ring undergoes substitution rather than addition to preserve aromaticity.",
    searchKeywords: ["phenyl", "arene", "aromatic", "benzene", "phenol"],
  },
]

export function getFunctionalGroupById(id: string): FunctionalGroup | undefined {
  return functionalGroups.find((g) => g.id === id)
}

export function searchFunctionalGroups(query: string): FunctionalGroup[] {
  const q = query.toLowerCase().trim()
  if (!q) return functionalGroups
  return functionalGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.representativeClass.toLowerCase().includes(q) ||
      g.searchKeywords.some((k) => k.includes(q) || q.includes(k))
  )
}
