import type { ElementRecord, ExamBoard } from "../types"
import { ELEMENT_NAMES, PROPERTY_OVERRIDES, inferCategory, inferGroup } from "./element-seeds"
import { buildElectronConfiguration, getPeriodFromZ } from "./electron-config"
import { buildOrbitalBoxDiagram } from "./orbital-diagram"
import { getEducationalTrendDefaults } from "./trends"
import {
  getElementProfileSeed,
  getDefaultNuclearInfo,
  inferDefaultCommonIons,
  getOctetRuleDefaults,
  inferDefaultExampleCompounds,
  inferDefaultNaturalForm,
  inferDefaultNotes,
  inferDefaultOxidationStates,
  inferDefaultStateAtRoomTemperature,
} from "./element-profiles"

const ALL_BOARDS: ExamBoard[] = [
  "high-school",
  "ib-sl",
  "ib-hl",
  "ap",
  "a-level",
  "university-intro",
]

function buildElement(z: number): ElementRecord {
  const base = ELEMENT_NAMES[z]
  if (!base) throw new Error(`Unknown element Z=${z}`)

  const group = inferGroup(z)
  const period = getPeriodFromZ(z)
  const config = buildElectronConfiguration(z)
  const override = PROPERTY_OVERRIDES[z] ?? {}
  const profileSeed = getElementProfileSeed(z)
  const category = override.category ?? inferCategory(z, group)
  const octet = getOctetRuleDefaults(z, category)
  const trendDefaults = getEducationalTrendDefaults(z, group, period, category)

  const isMetal =
    category === "alkali-metal" ||
    category === "alkaline-earth-metal" ||
    category === "transition-metal" ||
    category === "lanthanide" ||
    category === "actinide" ||
    category === "post-transition-metal"

  const isNonmetal =
    category === "nonmetal" || category === "halogen" || category === "noble-gas"
  const isMetalloid = category === "metalloid"

  return {
    id: `element-${base.symbol.toLowerCase()}`,
    kind: "element",
    name: base.name,
    symbol: base.symbol,
    atomicNumber: z,
    atomicMass: base.mass,
    period,
    group,
    block: config.block,
    electronConfiguration: config.full,
    shorthandConfiguration: config.shorthand,
    orbitalDiagram: buildOrbitalBoxDiagram(z),
    valenceElectrons: config.valenceElectrons,
    electronegativity:
      profileSeed.electronegativity ??
      override.electronegativity ??
      trendDefaults.electronegativity,
    atomicRadiusPm:
      profileSeed.atomicRadiusPm ?? override.atomicRadiusPm ?? trendDefaults.atomicRadiusPm,
    ionicRadiusPm: null,
    ionizationEnergyKjMol:
      profileSeed.ionizationEnergyKjMol ??
      override.ionizationEnergyKjMol ??
      trendDefaults.ionizationEnergyKjMol,
    electronAffinityKjMol:
      profileSeed.electronAffinityKjMol ?? trendDefaults.electronAffinityKjMol,
    meltingPointC: profileSeed.meltingPointC ?? override.meltingPointC ?? null,
    boilingPointC: profileSeed.boilingPointC ?? override.boilingPointC ?? null,
    densityGcm3: profileSeed.densityGcm3 ?? null,
    stateAtRoomTemperature: inferDefaultStateAtRoomTemperature(z),
    oxidationStates:
      profileSeed.oxidationStates ??
      override.oxidationStates ??
      inferDefaultOxidationStates(z, group, category),
    commonIons:
      profileSeed.commonIons ??
      override.commonIons ??
      inferDefaultCommonIons(base.symbol, group, category),
    naturalForm: inferDefaultNaturalForm(z, category),
    octetRuleCategory: octet.category,
    octetRuleExamples: octet.examples,
    exampleCompounds: inferDefaultExampleCompounds(z, base.symbol, category),
    notes: inferDefaultNotes(z, base.symbol, category),
    nuclear: {
      ...getDefaultNuclearInfo(z, base.symbol, base.mass),
      ...profileSeed.nuclear,
    },
    transitionMetalColors: profileSeed.transitionMetalColors ?? [],
    category,
    isMetal,
    isNonmetal,
    isMetalloid,
    aliases: [base.symbol, base.name, String(z)],
    formula: base.symbol,
    tags: [category, config.block + "-block", `period-${period}`, ...(group ? [`group-${group}`] : [])],
    examBoards: ALL_BOARDS,
    topics: ["periodic-table", "atomic-structure"],
    subtopics: ["electron-configuration", "periodic-trends", "octet-rule"],
  }
}

export const ALL_ELEMENTS: ElementRecord[] = Array.from({ length: 118 }, (_, i) =>
  buildElement(i + 1),
)

export function getElementBySymbol(symbol: string): ElementRecord | undefined {
  return ALL_ELEMENTS.find((e) => e.symbol.toLowerCase() === symbol.toLowerCase())
}

export function getElementByZ(z: number): ElementRecord | undefined {
  return ALL_ELEMENTS.find((e) => e.atomicNumber === z)
}

/** Standard periodic table grid positions [row, col] for display (1-indexed cols) */
export function getElementGridPosition(z: number): { row: number; col: number } | null {
  if (z >= 57 && z <= 71) return { row: 8, col: z - 57 + 3 }
  if (z >= 89 && z <= 103) return { row: 9, col: z - 89 + 3 }

  const group = inferGroup(z)
  const period = getPeriodFromZ(z)
  if (!group) return null

  if (group === 1 || group === 2) return { row: period, col: group }
  if (group >= 13) return { row: period, col: group }
  if (group >= 3 && group <= 12) return { row: period, col: group }
  return { row: period, col: group }
}

export { ELEMENT_NAMES, inferGroup, getPeriodFromZ }
export { TRANSITION_METAL_COLOR_DISCLAIMER } from "./element-profiles"
export * from "./trends"
export * from "./pokedex"
export { getElectronConfigurationException, TEACHING_CONFIGURATION_EXCEPTIONS } from "./electron-config"
