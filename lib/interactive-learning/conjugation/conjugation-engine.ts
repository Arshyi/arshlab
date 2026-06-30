import { getConjugationMolecule, listConjugationMolecules } from "./examples"
import type {
  AlgorithmStep,
  AromaticityResult,
  ConjugatedSystem,
  ConjugationAnalysis,
  ConjugationAtom,
  ConjugationBond,
  ConjugationMolecule,
  ConjugationPracticeQuestion,
  CurvedArrowAttempt,
  CurvedArrowFeedback,
  ElectronContribution,
  UVVisLesson,
} from "./types"

function hasPOrbital(atom: ConjugationAtom): boolean {
  return atom.hybridization === "sp2" || atom.hybridization === "sp" || Boolean(atom.emptyPOrbital) || Boolean(atom.radical) || (atom.participatingLonePairs ?? 0) > 0
}

function atomById(molecule: ConjugationMolecule) {
  return new Map(molecule.atoms.map((atom) => [atom.id, atom]))
}

function bondConnectsPAtoms(bond: ConjugationBond, atoms: Map<string, ConjugationAtom>): boolean {
  const from = atoms.get(bond.from)
  const to = atoms.get(bond.to)
  if (!from || !to) return false
  if (bond.conjugationBreak) return false
  return hasPOrbital(from) && hasPOrbital(to)
}

function buildAdjacency(molecule: ConjugationMolecule) {
  const atoms = atomById(molecule)
  const adjacency = new Map<string, string[]>()
  const bondLookup = new Map<string, ConjugationBond[]>()

  for (const atom of molecule.atoms) {
    if (hasPOrbital(atom)) adjacency.set(atom.id, [])
  }

  for (const bond of molecule.bonds) {
    if (!bondConnectsPAtoms(bond, atoms)) continue
    adjacency.get(bond.from)?.push(bond.to)
    adjacency.get(bond.to)?.push(bond.from)
    const leftKey = [bond.from, bond.to].sort().join(":")
    const next = bondLookup.get(leftKey) ?? []
    next.push(bond)
    bondLookup.set(leftKey, next)
  }

  return { adjacency, bondLookup }
}

function includedBonds(molecule: ConjugationMolecule, atomIds: string[]) {
  const atomSet = new Set(atomIds)
  return molecule.bonds.filter((bond) => atomSet.has(bond.from) && atomSet.has(bond.to) && !bond.conjugationBreak)
}

function countPiBonds(bonds: ConjugationBond[]) {
  return bonds.filter((bond) => bond.pi).length
}

function countElectronsForAtoms(
  molecule: ConjugationMolecule,
  atomsInSystem: ConjugationAtom[],
  bondsInSystem: ConjugationBond[],
): number {
  const atomIds = new Set(atomsInSystem.map((atom) => atom.id))
  const aromaticAtomIds = new Set((molecule.rings ?? []).flat().filter((atomId) => atomIds.has(atomId)))
  const hasAromaticBond = bondsInSystem.some((bond) => bond.order === "aromatic")

  let electrons = 0
  if (aromaticAtomIds.size > 0 && hasAromaticBond) {
    electrons += aromaticAtomIds.size
    electrons += atomsInSystem
      .filter((atom) => !aromaticAtomIds.has(atom.id))
      .reduce((sum, atom) => sum + (atom.participatingLonePairs ?? 0) * 2 + (atom.radical ? 1 : 0) + (atom.emptyPOrbital ? 0 : 0), 0)
    return electrons
  }

  for (const bond of bondsInSystem) {
    if (bond.order === 2) electrons += 2
    if (bond.order === 3) electrons += 4
  }

  for (const atom of atomsInSystem) {
    electrons += (atom.participatingLonePairs ?? 0) * 2
    if (atom.charge === -1 && hasPOrbital(atom)) electrons += 2
    if (atom.radical) electrons += 1
  }

  return electrons
}

export function detectConjugatedSystems(molecule: ConjugationMolecule): ConjugatedSystem[] {
  const { adjacency } = buildAdjacency(molecule)
  const visited = new Set<string>()
  const systems: ConjugatedSystem[] = []

  for (const atomId of adjacency.keys()) {
    if (visited.has(atomId)) continue
    const stack = [atomId]
    const component: string[] = []
    visited.add(atomId)

    while (stack.length) {
      const current = stack.pop()!
      component.push(current)
      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue
        visited.add(next)
        stack.push(next)
      }
    }

    if (component.length < 2) continue
    const atomMap = atomById(molecule)
    const atomsInSystem = component.map((id) => atomMap.get(id)).filter(Boolean) as ConjugationAtom[]
    const bondsInSystem = includedBonds(molecule, component)
    const piBondCount = countPiBonds(bondsInSystem)
    const participatingLonePairs = atomsInSystem.reduce((sum, atom) => sum + (atom.participatingLonePairs ?? 0), 0)
    const radicals = atomsInSystem.filter((atom) => atom.radical).length
    const emptyPOrbitals = atomsInSystem.filter((atom) => atom.emptyPOrbital).length
    const piElectrons = countElectronsForAtoms(molecule, atomsInSystem, bondsInSystem)

    systems.push({
      id: `system-${systems.length + 1}`,
      atomIds: component,
      bondIds: bondsInSystem.map((bond) => bond.id),
      length: component.length,
      piBondCount,
      participatingLonePairs,
      radicals,
      emptyPOrbitals,
      piElectrons,
      principal: false,
      explanation: `${component.length} atoms form an uninterrupted p-orbital network with ${piElectrons} delocalized electrons.`,
    })
  }

  systems.sort((a, b) => b.length - a.length || b.piElectrons - a.piElectrons)
  return systems.map((system, index) => ({ ...system, principal: index === 0 }))
}

export function countDelocalizedElectrons(molecule: ConjugationMolecule, system?: ConjugatedSystem | null): ElectronContribution[] {
  const principal = system ?? detectConjugatedSystems(molecule)[0]
  if (!principal) return []
  const atomSet = new Set(principal.atomIds)
  const ringAtoms = new Set((molecule.rings ?? []).flat().filter((atomId) => atomSet.has(atomId)))
  const bonds = includedBonds(molecule, principal.atomIds)
  const aromaticMode = Boolean(ringAtoms.size > 0 && bonds.some((bond) => bond.order === "aromatic"))
  const contributions: ElectronContribution[] = []

  if (aromaticMode) {
    contributions.push({
      id: "aromatic-ring-electrons",
      kind: "pi-bond",
      electrons: ringAtoms.size,
      included: true,
      explanation: `${ringAtoms.size} aromatic ring atoms each contribute one p electron to the cyclic pathway.`,
    })
  } else {
    for (const bond of bonds) {
      if (bond.order === 2 || bond.order === 3) {
        contributions.push({
          id: `pi-${bond.id}`,
          kind: "pi-bond",
          bondId: bond.id,
          electrons: bond.order === 3 ? 4 : 2,
          included: true,
          explanation: `${bond.id} contributes ${bond.order === 3 ? "two pi bonds / 4" : "one pi bond / 2"} electrons.`,
        })
      }
    }
  }

  for (const atom of molecule.atoms.filter((candidate) => atomSet.has(candidate.id))) {
    if ((atom.participatingLonePairs ?? 0) > 0 && (!aromaticMode || !ringAtoms.has(atom.id))) {
      contributions.push({
        id: `lp-${atom.id}`,
        kind: "lone-pair",
        atomId: atom.id,
        electrons: (atom.participatingLonePairs ?? 0) * 2,
        included: true,
        explanation: `${atom.label ?? atom.element} has a lone pair in a p orbital, so it participates.`,
      })
    } else if ((atom.lonePairs ?? 0) > 0 && (atom.participatingLonePairs ?? 0) === 0) {
      contributions.push({
        id: `excluded-lp-${atom.id}`,
        kind: "lone-pair",
        atomId: atom.id,
        electrons: 0,
        included: false,
        explanation: `${atom.label ?? atom.element} lone pair is not counted because it is not aligned with the p system.`,
      })
    }

    if (atom.charge === 1) {
      contributions.push({
        id: `positive-${atom.id}`,
        kind: "positive-charge",
        atomId: atom.id,
        electrons: 0,
        included: true,
        explanation: "A positive charge supplies an empty p orbital and contributes 0 electrons.",
      })
    }

    if (atom.charge === -1) {
      contributions.push({
        id: `negative-${atom.id}`,
        kind: "negative-charge",
        atomId: atom.id,
        electrons: 2,
        included: true,
        explanation: "A p-aligned negative charge contributes 2 electrons.",
      })
    }

    if (atom.radical) {
      contributions.push({
        id: `radical-${atom.id}`,
        kind: "radical",
        atomId: atom.id,
        electrons: 1,
        included: true,
        explanation: "A radical in a p orbital contributes 1 electron.",
      })
    }
  }

  return contributions
}

export function evaluateAromaticity(molecule: ConjugationMolecule, system?: ConjugatedSystem | null): AromaticityResult {
  const principal = system ?? detectConjugatedSystems(molecule)[0] ?? null
  const ring = Array.from(new Set((molecule.rings ?? []).flat()))
  const ringSet = new Set(ring)
  const ringBonds = molecule.bonds.filter((bond) => ringSet.has(bond.from) && ringSet.has(bond.to))
  const hasAromaticBond = ringBonds.some((bond) => bond.order === "aromatic")
  const piElectrons = hasAromaticBond
    ? ring.length
    : ringBonds.reduce((sum, bond) => sum + (bond.order === 2 ? 2 : bond.order === 3 ? 4 : 0), 0) +
      molecule.atoms
        .filter((atom) => ringSet.has(atom.id))
        .reduce((sum, atom) => sum + (atom.participatingLonePairs ?? 0) * 2 + (atom.radical ? 1 : 0) + (atom.charge === -1 ? 2 : 0), 0)
  const cyclic = molecule.cyclicConjugation && ring.length > 0
  const continuous = Boolean(principal && ring.every((atomId) => principal.atomIds.includes(atomId)))
  const huckelN = (piElectrons - 2) / 4
  const antiN = piElectrons / 4

  if (cyclic && molecule.planar && continuous && Number.isInteger(huckelN) && huckelN >= 0) {
    return {
      label: "Aromatic",
      piElectrons,
      nValue: huckelN,
      ringAtomIds: ring,
      rule: `4n + 2 = ${piElectrons}; n = ${huckelN}`,
      explanation: "The system is cyclic, planar, continuously conjugated, and follows Huckel's 4n+2 rule.",
    }
  }

  if (cyclic && molecule.planar && continuous && Number.isInteger(antiN) && antiN > 0) {
    return {
      label: "Antiaromatic",
      piElectrons,
      nValue: antiN,
      ringAtomIds: ring,
      rule: `4n = ${piElectrons}; n = ${antiN}`,
      explanation: "The system is cyclic, planar, and continuously conjugated, but has 4n pi electrons.",
    }
  }

  return {
    label: "Non-aromatic",
    piElectrons,
    nValue: null,
    ringAtomIds: ring,
    rule: "Huckel rule not applied",
    explanation: cyclic
      ? "The ring does not satisfy the electron-count requirement for aromaticity."
      : "The principal conjugated system is not a cyclic, planar, uninterrupted ring.",
  }
}

function defaultUvVis(system: ConjugatedSystem | null): UVVisLesson {
  const length = system?.length ?? 1
  const lambdaMaxNm = Math.round(Math.min(650, 175 + length * 16))
  const observedColor = lambdaMaxNm >= 430 ? "visible color possible" : "usually colorless"
  const absorbedWavelength = lambdaMaxNm >= 430 ? "visible/near-visible" : "ultraviolet"
  return {
    lambdaMaxNm,
    absorbedWavelength,
    observedColor,
    explanation: "As conjugation length increases, the HOMO-LUMO gap shrinks and absorption shifts to longer wavelength.",
  }
}

export function buildAlgorithmSteps(molecule: ConjugationMolecule, principal: ConjugatedSystem | null): AlgorithmStep[] {
  const included = new Set<string>()
  const target = new Set(principal?.atomIds ?? [])
  const steps: AlgorithmStep[] = []

  for (const atom of molecule.atoms) {
    const hasP = hasPOrbital(atom)
    if (hasP && target.has(atom.id)) included.add(atom.id)
    steps.push({
      id: `check-${atom.id}`,
      atomId: atom.id,
      title: `Check ${atom.label ?? atom.element} ${atom.id}`,
      check: "hybridization -> p orbital -> adjacent p orbital -> continuous path",
      result: hasP ? "p orbital available" : "no p orbital available",
      includedAtomIds: Array.from(included),
      explanation: hasP
        ? `${atom.id} is ${atom.hybridization} or has p-orbital evidence, so ARSHLAB can include it if it connects to adjacent p orbitals.`
        : `${atom.id} is ${atom.hybridization}; conjugation stops here.`,
    })
  }

  steps.push({
    id: "principal-system",
    title: "Choose principal conjugated pathway",
    check: "largest connected conjugated graph",
    result: principal ? `${principal.length} atoms, ${principal.piElectrons} delocalized electrons` : "no conjugated system",
    includedAtomIds: principal?.atomIds ?? [],
    explanation: "The longest uninterrupted conjugated pathway is normally treated as the principal conjugated system.",
  })

  return steps
}

export function analyzeConjugation(moleculeId: string): ConjugationAnalysis {
  const molecule = getConjugationMolecule(moleculeId)
  const conjugatedSystems = detectConjugatedSystems(molecule)
  const principalSystem = conjugatedSystems.find((system) => system.principal) ?? null
  const electronContributions = countDelocalizedElectrons(molecule, principalSystem)
  const aromaticity = evaluateAromaticity(molecule, principalSystem)
  const breakAtoms = molecule.atoms.filter((atom) => atom.breakReason || !hasPOrbital(atom))
  const algorithmSteps = buildAlgorithmSteps(molecule, principalSystem)
  const uvvis = molecule.uvvis ?? defaultUvVis(principalSystem)

  return {
    molecule,
    conjugatedSystems,
    principalSystem,
    electronContributions,
    aromaticity,
    breakAtoms,
    algorithmSteps,
    uvvis,
  }
}

export function validateCurvedArrow(moleculeId: string, attempt: CurvedArrowAttempt): CurvedArrowFeedback {
  const molecule = getConjugationMolecule(moleculeId)
  const expected = molecule.resonance?.arrows.find((arrow) => arrow.source === attempt.source && arrow.destination === attempt.destination) ?? null

  if (expected) {
    return {
      correct: true,
      expected,
      message: `Correct. ${expected.description}`,
    }
  }

  const first = molecule.resonance?.arrows[0] ?? null
  return {
    correct: false,
    expected: first,
    message: first
      ? `Not quite. Electrons should move from ${first.source} to ${first.destination}: ${first.description}`
      : "This molecule does not have a curved-arrow tutor record yet.",
  }
}

export function buildColorLearning(conjugationLength: number) {
  const lambdaMaxNm = Math.round(Math.min(700, 180 + conjugationLength * 22))
  const gap = Number(Math.max(1.6, 5.2 - conjugationLength * 0.16).toFixed(2))
  const observedColor =
    lambdaMaxNm < 400 ? "colorless"
      : lambdaMaxNm < 470 ? "yellow/orange possible"
        : lambdaMaxNm < 560 ? "red/orange possible"
          : "dark/strongly colored"

  return {
    conjugationLength,
    lambdaMaxNm,
    approximateGapEv: gap,
    observedColor,
    explanation: "Longer conjugation creates closer-spaced pi MOs, raising the HOMO, lowering the LUMO, and shifting absorption to longer wavelength.",
  }
}

export const CONJUGATION_PRACTICE: ConjugationPracticeQuestion[] = [
  {
    id: "benzene-electrons",
    moleculeId: "benzene",
    prompt: "How many delocalized pi electrons are in benzene?",
    choices: ["4", "6", "8", "10"],
    correctAnswer: "6",
    explanation: "Benzene has three pi bonds, so 3 x 2 = 6 delocalized pi electrons.",
    topic: "electron-count",
  },
  {
    id: "broken-conjugation",
    moleculeId: "broken-pentadiene",
    prompt: "Where does conjugation stop in CH2=CH-CH2-CH=CH2?",
    choices: ["At the sp3 CH2 carbon", "At every sigma bond", "At the terminal alkene", "At hydrogen"],
    correctAnswer: "At the sp3 CH2 carbon",
    explanation: "The central sp3 carbon lacks a continuous p orbital, so the two alkenes are isolated.",
    topic: "conjugation-break",
  },
  {
    id: "pyridine-lone-pair",
    moleculeId: "pyridine",
    prompt: "Does the pyridine nitrogen lone pair count in the aromatic sextet?",
    choices: ["Yes, it supplies 2 electrons", "No, it sits in an sp2 orbital", "Yes, it supplies 1 electron", "No, pyridine is not aromatic"],
    correctAnswer: "No, it sits in an sp2 orbital",
    explanation: "Pyridine's nitrogen lone pair points in-plane, while the p orbital contributes one electron to the ring.",
    topic: "lone-pair",
  },
  {
    id: "pyrrole-lone-pair",
    moleculeId: "pyrrole",
    prompt: "Which lone pair participates in pyrrole aromaticity?",
    choices: ["The nitrogen lone pair", "A carbon sigma pair", "No lone pair", "A C-H sigma bond"],
    correctAnswer: "The nitrogen lone pair",
    explanation: "Pyrrole needs the nitrogen lone pair in a p orbital to reach 6 pi electrons.",
    topic: "lone-pair",
  },
  {
    id: "cyclobutadiene-aromaticity",
    moleculeId: "cyclobutadiene",
    prompt: "How is planar cyclobutadiene classified by Huckel's rule?",
    choices: ["Aromatic", "Antiaromatic", "Non-aromatic", "Ionic"],
    correctAnswer: "Antiaromatic",
    explanation: "A cyclic planar conjugated system with 4 pi electrons follows 4n, not 4n+2.",
    topic: "aromaticity",
  },
  {
    id: "principal-path",
    moleculeId: "beta-carotene",
    prompt: "Which path is normally treated as beta-carotene's principal conjugated system?",
    choices: ["The longest uninterrupted polyene chain", "Only one double bond", "Only the sigma framework", "Only terminal methyl groups"],
    correctAnswer: "The longest uninterrupted polyene chain",
    explanation: "The principal conjugated pathway is the longest connected p-orbital network.",
    topic: "principal-path",
  },
]

export function listPracticeQuestions() {
  return CONJUGATION_PRACTICE
}

export function getPracticeQuestion(index: number) {
  return CONJUGATION_PRACTICE[Math.abs(index) % CONJUGATION_PRACTICE.length]
}

export function listRealMoleculeLibrary() {
  return listConjugationMolecules()
}
