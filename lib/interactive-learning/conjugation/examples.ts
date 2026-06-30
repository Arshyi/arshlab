import type {
  ConjugationAtom,
  ConjugationBond,
  ConjugationMolecule,
  ResonanceLesson,
  UVVisLesson,
} from "./types"

function atom(
  id: string,
  x: number,
  y: number,
  options: Partial<ConjugationAtom> = {},
): ConjugationAtom {
  return {
    id,
    element: options.element ?? "C",
    x,
    y,
    hybridization: options.hybridization ?? "sp2",
    charge: options.charge,
    radical: options.radical,
    lonePairs: options.lonePairs ?? (options.element && options.element !== "C" ? 1 : 0),
    participatingLonePairs: options.participatingLonePairs ?? 0,
    emptyPOrbital: options.emptyPOrbital,
    breakReason: options.breakReason,
    label: options.label,
  }
}

function bond(id: string, from: string, to: string, order: ConjugationBond["order"]): ConjugationBond {
  return {
    id,
    from,
    to,
    order,
    sigma: true,
    pi: order === 2 || order === 3 || order === "aromatic",
  }
}

function chainAtoms(count: number, breakIndexes: number[] = []): ConjugationAtom[] {
  return Array.from({ length: count }, (_, index) => {
    const id = `c${index + 1}`
    const broken = breakIndexes.includes(index + 1)
    return atom(id, 70 + index * 70, index % 2 === 0 ? 120 : 80, {
      hybridization: broken ? "sp3" : "sp2",
      breakReason: broken ? "sp3 carbon interrupts continuous p orbital overlap." : undefined,
    })
  })
}

function chainBonds(count: number, doublePairs: number[]): ConjugationBond[] {
  return Array.from({ length: count - 1 }, (_, index) => {
    const left = index + 1
    return bond(`b${left}-${left + 1}`, `c${left}`, `c${left + 1}`, doublePairs.includes(left) ? 2 : 1)
  })
}

function ringAtoms(count: number, radius = 92, centerX = 210, centerY = 140, hetero: Record<number, Partial<ConjugationAtom>> = {}) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (-90 + (360 / count) * index) * Math.PI / 180
    const position = index + 1
    return atom(`r${position}`, centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, hetero[position] ?? {})
  })
}

function ringBonds(count: number, aromatic = true): ConjugationBond[] {
  return Array.from({ length: count }, (_, index) => {
    const left = index + 1
    const right = left === count ? 1 : left + 1
    const doubleBond = count % 2 === 0 ? left % 2 === 1 : left % 2 === 0
    const order = aromatic ? "aromatic" : doubleBond ? 2 : 1
    return bond(`rb${left}-${right}`, `r${left}`, `r${right}`, order)
  })
}

const benzeneResonance: ResonanceLesson = {
  forms: [
    { id: "kekule-a", title: "Kekule form A", description: "Alternating pi bonds in one arrangement.", movedElectrons: ["pi bond 1 shifts", "pi bond 2 shifts", "pi bond 3 shifts"] },
    { id: "kekule-b", title: "Kekule form B", description: "Alternating pi bonds shifted around the ring.", movedElectrons: ["all pi electrons move one bond over"] },
    { id: "hybrid", title: "Resonance hybrid", description: "All six C-C bonds share pi character.", movedElectrons: ["electrons delocalized around the ring"] },
  ],
  arrows: [
    { id: "benzene-arrow-1", source: "rb1-2", destination: "rb2-3", description: "Move pi electrons to the adjacent bond without moving atoms." },
    { id: "benzene-arrow-2", source: "rb3-4", destination: "rb4-5", description: "Continue the cyclic pi-electron shift." },
  ],
  hybridDescription: "The resonance hybrid has equalized C-C bonds and six delocalized pi electrons.",
}

function simpleResonance(title: string): ResonanceLesson {
  return {
    forms: [
      { id: "form-a", title: `${title} form A`, description: "One valid electron placement.", movedElectrons: ["pi electrons move", "charge or lone pair shifts"] },
      { id: "form-b", title: `${title} form B`, description: "A second valid electron placement.", movedElectrons: ["same atoms, different electron placement"] },
      { id: "hybrid", title: "Resonance hybrid", description: "Real structure is an electron-delocalized hybrid.", movedElectrons: ["electrons delocalized"] },
    ],
    arrows: [
      { id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-arrow`, source: "lp1", destination: "pi1", description: "Move an electron pair from a lone pair or pi bond into the adjacent p system." },
    ],
    hybridDescription: "Resonance moves electrons, not atoms.",
  }
}

function uv(lambdaMaxNm: number, observedColor: string, explanation: string): UVVisLesson {
  const absorbedWavelength =
    lambdaMaxNm < 400 ? "ultraviolet"
      : lambdaMaxNm < 500 ? "blue/violet"
        : lambdaMaxNm < 580 ? "green/yellow"
          : "orange/red"
  return { lambdaMaxNm, absorbedWavelength, observedColor, explanation }
}

function molecule(record: ConjugationMolecule): ConjugationMolecule {
  return record
}

export const CONJUGATION_MOLECULES: ConjugationMolecule[] = [
  molecule({
    id: "butadiene",
    name: "1,3-Butadiene",
    formula: "CH2=CH-CH=CH2",
    category: "acyclic",
    atoms: chainAtoms(4),
    bonds: chainBonds(4, [1, 3]),
    planar: true,
    cyclicConjugation: false,
    notes: "Two pi bonds separated by one sigma bond form a continuous p orbital pathway.",
    uvvis: uv(217, "colorless", "A short conjugated diene absorbs in the ultraviolet."),
  }),
  molecule({
    id: "broken-pentadiene",
    name: "Broken pentadiene",
    formula: "CH2=CH-CH2-CH=CH2",
    category: "acyclic",
    atoms: chainAtoms(5, [3]),
    bonds: chainBonds(5, [1, 4]),
    planar: true,
    cyclicConjugation: false,
    notes: "The central sp3 carbon breaks conjugation between the two alkenes.",
    uvvis: uv(180, "colorless", "Isolated alkenes have larger gaps than conjugated dienes."),
  }),
  molecule({
    id: "benzene",
    name: "Benzene",
    formula: "C6H6",
    category: "aromatic",
    atoms: ringAtoms(6),
    bonds: ringBonds(6, true),
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"]],
    planar: true,
    cyclicConjugation: true,
    notes: "Six sp2 carbons provide a cyclic, continuous, planar pi system.",
    resonance: benzeneResonance,
    uvvis: uv(254, "colorless", "Benzene absorbs UV light because its pi gap is still relatively large."),
  }),
  molecule({
    id: "cyclobutadiene",
    name: "Cyclobutadiene",
    formula: "C4H4",
    category: "aromatic",
    atoms: ringAtoms(4, 78),
    bonds: ringBonds(4, false),
    rings: [["r1", "r2", "r3", "r4"]],
    planar: true,
    cyclicConjugation: true,
    notes: "Four pi electrons in a planar cyclic system produce antiaromatic instability.",
    uvvis: uv(320, "unstable / not isolated here", "A small antiaromatic ring is highly destabilized."),
  }),
  molecule({
    id: "pyridine",
    name: "Pyridine",
    formula: "C5H5N",
    category: "heteroaromatic",
    atoms: ringAtoms(6, 92, 210, 140, { 1: { element: "N", lonePairs: 1, participatingLonePairs: 0, label: "N" } }),
    bonds: ringBonds(6, true),
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"]],
    planar: true,
    cyclicConjugation: true,
    notes: "The nitrogen lone pair sits in an sp2 orbital and is not part of the aromatic sextet.",
    uvvis: uv(251, "colorless", "Pyridine has an aromatic pi system similar to benzene with heteroatom perturbation."),
  }),
  molecule({
    id: "pyrrole",
    name: "Pyrrole",
    formula: "C4H5N",
    category: "heteroaromatic",
    atoms: ringAtoms(5, 84, 210, 140, { 1: { element: "N", lonePairs: 1, participatingLonePairs: 1, label: "NH" } }),
    bonds: ringBonds(5, false),
    rings: [["r1", "r2", "r3", "r4", "r5"]],
    planar: true,
    cyclicConjugation: true,
    notes: "The nitrogen lone pair occupies a p orbital and contributes two electrons.",
    uvvis: uv(210, "colorless", "Pyrrole remains aromatic because the N lone pair completes six pi electrons."),
  }),
  molecule({
    id: "furan",
    name: "Furan",
    formula: "C4H4O",
    category: "heteroaromatic",
    atoms: ringAtoms(5, 84, 210, 140, { 1: { element: "O", lonePairs: 2, participatingLonePairs: 1, label: "O" } }),
    bonds: ringBonds(5, false),
    rings: [["r1", "r2", "r3", "r4", "r5"]],
    planar: true,
    cyclicConjugation: true,
    notes: "One oxygen lone pair joins the aromatic pi system; the other stays in plane.",
    uvvis: uv(207, "colorless", "One heteroatom lone pair contributes to the aromatic sextet."),
  }),
  molecule({
    id: "thiophene",
    name: "Thiophene",
    formula: "C4H4S",
    category: "heteroaromatic",
    atoms: ringAtoms(5, 84, 210, 140, { 1: { element: "S", lonePairs: 2, participatingLonePairs: 1, label: "S" } }),
    bonds: ringBonds(5, false),
    rings: [["r1", "r2", "r3", "r4", "r5"]],
    planar: true,
    cyclicConjugation: true,
    notes: "One sulfur lone pair contributes to aromaticity.",
    uvvis: uv(230, "colorless", "Sulfur-containing aromatic rings absorb in the UV."),
  }),
  molecule({
    id: "imidazole",
    name: "Imidazole",
    formula: "C3H4N2",
    category: "heteroaromatic",
    atoms: ringAtoms(5, 84, 210, 140, {
      1: { element: "N", lonePairs: 1, participatingLonePairs: 1, label: "NH" },
      3: { element: "N", lonePairs: 1, participatingLonePairs: 0, label: "N" },
    }),
    bonds: ringBonds(5, false),
    rings: [["r1", "r2", "r3", "r4", "r5"]],
    planar: true,
    cyclicConjugation: true,
    notes: "One nitrogen is pyrrole-like and contributes; the other is pyridine-like and does not.",
    uvvis: uv(215, "colorless", "Imidazole demonstrates two different nitrogen lone-pair roles."),
  }),
  molecule({
    id: "naphthalene",
    name: "Naphthalene",
    formula: "C10H8",
    category: "aromatic",
    atoms: chainAtoms(10),
    bonds: [...chainBonds(10, [1, 3, 5, 7, 9]), bond("ring-close", "c10", "c1", "aromatic"), bond("fused", "c5", "c10", "aromatic")],
    rings: [["c1", "c2", "c3", "c4", "c5", "c10"], ["c5", "c6", "c7", "c8", "c9", "c10"]],
    planar: true,
    cyclicConjugation: true,
    notes: "Two fused benzene-like rings share a delocalized aromatic pi system.",
    uvvis: uv(286, "colorless", "Fused rings narrow the HOMO-LUMO gap compared with benzene."),
  }),
  molecule({
    id: "anthracene",
    name: "Anthracene",
    formula: "C14H10",
    category: "aromatic",
    atoms: chainAtoms(14),
    bonds: [...chainBonds(14, [1, 3, 5, 7, 9, 11, 13]), bond("ring-close", "c14", "c1", "aromatic"), bond("fused-a", "c5", "c10", "aromatic"), bond("fused-b", "c9", "c14", "aromatic")],
    rings: [["c1", "c2", "c3", "c4", "c5", "c14"], ["c5", "c6", "c7", "c8", "c9", "c10"], ["c9", "c10", "c11", "c12", "c13", "c14"]],
    planar: true,
    cyclicConjugation: true,
    notes: "Three fused rings create a longer conjugated aromatic system.",
    uvvis: uv(375, "pale fluorescence", "More fused rings further shrink the pi gap."),
  }),
  molecule({
    id: "phenanthrene",
    name: "Phenanthrene",
    formula: "C14H10",
    category: "aromatic",
    atoms: chainAtoms(14),
    bonds: [...chainBonds(14, [1, 3, 5, 7, 9, 11, 13]), bond("angular-close", "c12", "c1", "aromatic"), bond("angular-fused-a", "c5", "c10", "aromatic")],
    rings: [["c1", "c2", "c3", "c4", "c5", "c12"], ["c5", "c6", "c7", "c8", "c9", "c10"], ["c10", "c11", "c12", "c13", "c14", "c1"]],
    planar: true,
    cyclicConjugation: true,
    notes: "An angular fused aromatic system with extended delocalization.",
    uvvis: uv(340, "colorless / fluorescent", "Angular fusion changes orbital spacing relative to anthracene."),
  }),
  molecule({
    id: "retinal",
    name: "Retinal",
    formula: "C20H28O",
    category: "polyene",
    atoms: [...chainAtoms(12), atom("o1", 910, 120, { element: "O", lonePairs: 2 })],
    bonds: [...chainBonds(12, [1, 3, 5, 7, 9, 11]), bond("aldehyde", "c12", "o1", 2)],
    planar: true,
    cyclicConjugation: false,
    notes: "A long polyene chain conjugated to an aldehyde gives visible-light absorption.",
    uvvis: uv(380, "yellow/orange in protein environments", "Retinal's extended pi system moves absorption toward visible light."),
  }),
  molecule({
    id: "beta-carotene",
    name: "Beta-carotene",
    formula: "C40H56",
    category: "polyene",
    atoms: chainAtoms(18),
    bonds: chainBonds(18, [1, 3, 5, 7, 9, 11, 13, 15, 17]),
    planar: true,
    cyclicConjugation: false,
    notes: "A very long polyene pathway strongly narrows the HOMO-LUMO gap.",
    uvvis: uv(452, "orange", "Beta-carotene absorbs blue light, so it appears orange."),
  }),
  molecule({
    id: "lycopene",
    name: "Lycopene",
    formula: "C40H56",
    category: "polyene",
    atoms: chainAtoms(20),
    bonds: chainBonds(20, [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]),
    planar: true,
    cyclicConjugation: false,
    notes: "Lycopene has one of the longest simple polyene paths in this teaching set.",
    uvvis: uv(472, "red", "Even longer conjugation absorbs longer wavelength light."),
  }),
  molecule({
    id: "chlorophyll",
    name: "Chlorophyll",
    formula: "C55H72MgN4O5",
    category: "aromatic",
    atoms: ringAtoms(16, 110, 210, 150, { 1: { element: "N" }, 5: { element: "N" }, 9: { element: "N" }, 13: { element: "N" } }),
    bonds: ringBonds(16, true),
    rings: [["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10", "r11", "r12", "r13", "r14", "r15", "r16"]],
    planar: true,
    cyclicConjugation: true,
    notes: "Simplified porphyrin-like macrocycle used for UV-Vis teaching.",
    uvvis: uv(430, "green", "Chlorophyll absorbs strongly in blue and red regions, leaving green light reflected/transmitted."),
  }),
  molecule({
    id: "acetophenone",
    name: "Acetophenone",
    formula: "C8H8O",
    category: "carbonyl",
    atoms: [...ringAtoms(6), atom("co", 210, 265), atom("o", 210, 325, { element: "O", lonePairs: 2 })],
    bonds: [...ringBonds(6, true), bond("aryl-carbonyl", "r4", "co", 1), bond("carbonyl", "co", "o", 2)],
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"]],
    planar: true,
    cyclicConjugation: true,
    notes: "The carbonyl pi system is conjugated with the aromatic ring.",
    resonance: simpleResonance("Acetophenone"),
    uvvis: uv(244, "colorless", "Aryl carbonyl conjugation changes the UV absorption pattern."),
  }),
  molecule({
    id: "phenol",
    name: "Phenol",
    formula: "C6H6O",
    category: "aromatic",
    atoms: [...ringAtoms(6), atom("o", 210, 25, { element: "O", lonePairs: 2, participatingLonePairs: 1, label: "OH" })],
    bonds: [...ringBonds(6, true), bond("phenol-co", "r1", "o", 1)],
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"]],
    planar: true,
    cyclicConjugation: true,
    notes: "One oxygen lone pair can donate into the aromatic pi system.",
    resonance: simpleResonance("Phenoxide"),
    uvvis: uv(270, "colorless", "Oxygen lone-pair donation perturbs benzene's pi system."),
  }),
  molecule({
    id: "aniline",
    name: "Aniline",
    formula: "C6H7N",
    category: "aromatic",
    atoms: [...ringAtoms(6), atom("n", 210, 25, { element: "N", lonePairs: 1, participatingLonePairs: 1, label: "NH2" })],
    bonds: [...ringBonds(6, true), bond("aniline-cn", "r1", "n", 1)],
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"]],
    planar: true,
    cyclicConjugation: true,
    notes: "The nitrogen lone pair donates into the aromatic ring.",
    resonance: simpleResonance("Aniline"),
    uvvis: uv(280, "colorless / pale", "Amino donation raises the HOMO and changes the gap."),
  }),
  molecule({
    id: "nitrobenzene",
    name: "Nitrobenzene",
    formula: "C6H5NO2",
    category: "aromatic",
    atoms: [...ringAtoms(6), atom("n", 210, 25, { element: "N", charge: 1, emptyPOrbital: true, label: "NO2" }), atom("o1", 175, -25, { element: "O", charge: -1, lonePairs: 3 }), atom("o2", 245, -25, { element: "O", lonePairs: 2 })],
    bonds: [...ringBonds(6, true), bond("aryl-nitro", "r1", "n", 1), bond("nitro-o1", "n", "o1", 1), bond("nitro-o2", "n", "o2", 2)],
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"]],
    planar: true,
    cyclicConjugation: true,
    notes: "The nitro group withdraws electron density through conjugation.",
    resonance: simpleResonance("Nitrobenzene"),
    uvvis: uv(260, "pale yellow", "Charge-separated nitro resonance shifts absorption."),
  }),
  molecule({
    id: "styrene",
    name: "Styrene",
    formula: "C8H8",
    category: "aromatic",
    atoms: [...ringAtoms(6), atom("v1", 275, 245), atom("v2", 345, 285)],
    bonds: [...ringBonds(6, true), bond("styrene-ring", "r4", "v1", 1), bond("styrene-alkene", "v1", "v2", 2)],
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"]],
    planar: true,
    cyclicConjugation: true,
    notes: "The vinyl pi bond is conjugated with the benzene ring.",
    uvvis: uv(248, "colorless", "Extending benzene by one alkene shifts UV absorption."),
  }),
  molecule({
    id: "polyacetylene",
    name: "Polyacetylene fragment",
    formula: "(C2H2)n",
    category: "material",
    atoms: chainAtoms(12),
    bonds: chainBonds(12, [1, 3, 5, 7, 9, 11]),
    planar: true,
    cyclicConjugation: false,
    notes: "Alternating single and double bonds create an extended conductive pi system.",
    uvvis: uv(620, "dark / conductive polymer", "Long-range conjugation can lead to small gaps and conductivity."),
  }),
  molecule({
    id: "graphene-fragment",
    name: "Graphene fragment",
    formula: "C24H12",
    category: "material",
    atoms: ringAtoms(18, 118),
    bonds: ringBonds(18, true),
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"], ["r7", "r8", "r9", "r10", "r11", "r12"], ["r13", "r14", "r15", "r16", "r17", "r18"]],
    planar: true,
    cyclicConjugation: true,
    notes: "A simplified graphene teaching fragment with extended delocalization.",
    uvvis: uv(650, "black/gray", "Extended two-dimensional delocalization creates very small electronic gaps."),
  }),
  molecule({
    id: "carbonate",
    name: "Carbonate",
    formula: "CO3^2-",
    category: "resonance",
    atoms: [atom("c", 210, 145), atom("o1", 210, 45, { element: "O", charge: -1, lonePairs: 3 }), atom("o2", 120, 205, { element: "O", charge: -1, lonePairs: 3 }), atom("o3", 300, 205, { element: "O", lonePairs: 2 })],
    bonds: [bond("co1", "c", "o1", 1), bond("co2", "c", "o2", 1), bond("co3", "c", "o3", 2)],
    planar: true,
    cyclicConjugation: false,
    notes: "Three equivalent resonance contributors delocalize charge over oxygen atoms.",
    resonance: simpleResonance("Carbonate"),
    uvvis: uv(190, "colorless", "Carbonate resonance is not a visible chromophore."),
  }),
  molecule({
    id: "allyl-cation",
    name: "Allyl cation",
    formula: "C3H5+",
    category: "resonance",
    atoms: [atom("c1", 90, 130), atom("c2", 190, 90), atom("c3", 290, 130, { charge: 1, emptyPOrbital: true })],
    bonds: [bond("c1-c2", "c1", "c2", 2), bond("c2-c3", "c2", "c3", 1)],
    planar: true,
    cyclicConjugation: false,
    notes: "The empty p orbital on the cation participates in conjugation but contributes zero electrons.",
    resonance: simpleResonance("Allyl cation"),
    uvvis: uv(210, "colorless", "The allyl cation is stabilized by delocalization over three atoms."),
  }),
  molecule({
    id: "allyl-radical",
    name: "Allyl radical",
    formula: "C3H5.",
    category: "resonance",
    atoms: [atom("c1", 90, 130), atom("c2", 190, 90), atom("c3", 290, 130, { radical: true })],
    bonds: [bond("c1-c2", "c1", "c2", 2), bond("c2-c3", "c2", "c3", 1)],
    planar: true,
    cyclicConjugation: false,
    notes: "The radical electron is delocalized across the allyl system.",
    resonance: simpleResonance("Allyl radical"),
    uvvis: uv(220, "colorless radical", "A radical contributes one electron to the conjugated system."),
  }),
  molecule({
    id: "amide",
    name: "Amide",
    formula: "RCONH2",
    category: "carbonyl",
    atoms: [atom("c", 180, 150), atom("o", 180, 60, { element: "O", lonePairs: 2 }), atom("n", 285, 150, { element: "N", lonePairs: 1, participatingLonePairs: 1, label: "NH2" })],
    bonds: [bond("c-o", "c", "o", 2), bond("c-n", "c", "n", 1)],
    planar: true,
    cyclicConjugation: false,
    notes: "The nitrogen lone pair delocalizes into the carbonyl, restricting rotation.",
    resonance: simpleResonance("Amide"),
    uvvis: uv(205, "colorless", "Amide resonance strongly stabilizes the C-N bond."),
  }),
  molecule({
    id: "ozone",
    name: "Ozone",
    formula: "O3",
    category: "resonance",
    atoms: [atom("o1", 110, 150, { element: "O", lonePairs: 3, charge: -1 }), atom("o2", 210, 95, { element: "O", charge: 1, lonePairs: 1 }), atom("o3", 310, 150, { element: "O", lonePairs: 2 })],
    bonds: [bond("o1-o2", "o1", "o2", 1), bond("o2-o3", "o2", "o3", 2)],
    planar: true,
    cyclicConjugation: false,
    notes: "Ozone has two major resonance forms with delocalized bonding.",
    resonance: simpleResonance("Ozone"),
    uvvis: uv(255, "pale blue gas", "Ozone absorbs UV strongly."),
  }),
  molecule({
    id: "acetanilide",
    name: "Acetanilide",
    formula: "C8H9NO",
    category: "carbonyl",
    atoms: [...ringAtoms(6), atom("n", 210, 25, { element: "N", lonePairs: 1, participatingLonePairs: 1, label: "NH" }), atom("co", 210, -45), atom("o", 210, -105, { element: "O", lonePairs: 2 })],
    bonds: [...ringBonds(6, true), bond("aryl-n", "r1", "n", 1), bond("n-co", "n", "co", 1), bond("co-o", "co", "o", 2)],
    rings: [["r1", "r2", "r3", "r4", "r5", "r6"]],
    planar: true,
    cyclicConjugation: true,
    notes: "The amide and aromatic pi systems communicate through the nitrogen.",
    resonance: simpleResonance("Acetanilide"),
    uvvis: uv(240, "colorless", "Aromatic amide conjugation changes UV absorption."),
  }),
]

export function listConjugationMolecules() {
  return CONJUGATION_MOLECULES
}

export function getConjugationMolecule(id: string | null | undefined) {
  return CONJUGATION_MOLECULES.find((molecule) => molecule.id === id) ?? CONJUGATION_MOLECULES[2]
}
