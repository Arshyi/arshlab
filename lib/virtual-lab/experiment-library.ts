import type { LabChemical, LabObservation, SpectralPeak, VirtualLabExperiment } from "./experiment-types"
import { buildSafetyProfile } from "./safety-engine"
import { buildUvVisibleBand } from "./spectroscopy-engine"

const sampleChemicals: Record<string, LabChemical> = {
  acetone: { id: "acetone", name: "Acetone", formula: "C3H6O", role: "sample", hazards: ["flammable", "irritant"] },
  ethanol: { id: "ethanol", name: "Ethanol", formula: "C2H6O", role: "reactant", hazards: ["flammable"] },
  "acetic-acid": { id: "acetic-acid", name: "Acetic acid", formula: "C2H4O2", role: "reactant", hazards: ["corrosive", "irritant"] },
  benzene: { id: "benzene", name: "Benzene", formula: "C6H6", role: "sample", hazards: ["flammable", "toxic"] },
  phenol: { id: "phenol", name: "Phenol", formula: "C6H6O", role: "sample", hazards: ["corrosive", "toxic"] },
  aniline: { id: "aniline", name: "Aniline", formula: "C6H7N", role: "sample", hazards: ["toxic"] },
  cyclohexane: { id: "cyclohexane", name: "Cyclohexane", formula: "C6H12", role: "sample", hazards: ["flammable"] },
  cyclohexene: { id: "cyclohexene", name: "Cyclohexene", formula: "C6H10", role: "sample", hazards: ["flammable", "irritant"] },
  ethene: { id: "ethene", name: "Ethene", formula: "C2H4", role: "reactant", hazards: ["flammable"] },
  ethyne: { id: "ethyne", name: "Ethyne", formula: "C2H2", role: "reactant", hazards: ["flammable"] },
  aspirin: { id: "aspirin", name: "Acetylsalicylic acid", formula: "C9H8O4", role: "product", hazards: ["irritant"] },
  caffeine: { id: "caffeine", name: "Caffeine", formula: "C8H10N4O2", role: "sample", hazards: ["irritant"] },
  glucose: { id: "glucose", name: "Glucose", formula: "C6H12O6", role: "sample", hazards: [] },
  water: { id: "water", name: "Water", formula: "H2O", role: "solvent", hazards: [] },
  ammonia: { id: "ammonia", name: "Ammonia", formula: "NH3", role: "reagent", hazards: ["corrosive", "irritant"] },
  "sulfuric-acid": { id: "sulfuric-acid", name: "Sulfuric acid", formula: "H2SO4", role: "reagent", hazards: ["corrosive", "oxidizer"] },
  "ethyl-acetate": { id: "ethyl-acetate", name: "Ethyl acetate", formula: "C4H8O2", role: "product", hazards: ["flammable"] },
  bromine: { id: "bromine", name: "Bromine solution", formula: "Br2", role: "reagent", hazards: ["corrosive", "toxic"] },
}

function peak(id: string, technique: SpectralPeak["technique"], position: string, assignment: string, linked: string[] = []): SpectralPeak {
  return {
    id,
    technique,
    position,
    intensity: /O-H|C=O|carbonyl/i.test(assignment) ? "strong" : "moderate",
    assignment,
    explanation: `${assignment} appears at ${position} in this deterministic educational spectrum.`,
    linkedAtoms: linked,
    linkedBonds: linked,
  }
}

function observations(items: Array<[string, LabObservation["afterAction"], number, string, LabObservation["kind"]]>): LabObservation[] {
  return items.map(([id, afterAction, timeMinutes, text, kind]) => ({ id, afterAction, timeMinutes, text, kind }))
}

export const VIRTUAL_LAB_EXPERIMENTS: VirtualLabExperiment[] = [
  {
    id: "esterification-ethyl-acetate",
    title: "Fischer Esterification: Ethyl Ethanoate",
    category: "Organic Chemistry",
    compoundId: "ethyl-ethanoate",
    difficulty: "Intermediate",
    estimatedMinutes: 55,
    concepts: ["esterification", "reflux", "equilibrium", "purification", "IR carbonyl analysis"],
    prerequisites: ["Alcohols", "Carboxylic acids", "Acid catalysis"],
    chemicals: [sampleChemicals.ethanol, sampleChemicals["acetic-acid"], sampleChemicals["sulfuric-acid"], sampleChemicals["ethyl-acetate"]],
    equipmentIds: ["round-bottom-flask", "condenser", "heating-mantle", "separatory-funnel", "rotary-evaporator", "ir-spectrometer"],
    techniques: ["reflux", "extraction", "drying", "evaporation", "ir-analysis"],
    steps: [
      { id: "weigh-acid", action: "weigh", title: "Measure reactants", instruction: "Measure ethanol and acetic acid into a round-bottom flask.", why: "Stoichiometric measurement controls theoretical yield.", equipmentIds: ["balance", "round-bottom-flask"], chemicalIds: ["ethanol", "acetic-acid"], measurementIds: ["mass-acid", "volume-ethanol"] },
      { id: "add-catalyst", action: "add-reagent", title: "Add acid catalyst", instruction: "Add a small amount of sulfuric acid.", why: "Acid catalysis activates the carbonyl and speeds ester formation.", equipmentIds: ["pipette"], chemicalIds: ["sulfuric-acid"] },
      { id: "reflux", action: "heat", title: "Heat under reflux", instruction: "Heat gently with condenser water flowing.", why: "Reflux allows heating without losing volatile reagents.", equipmentIds: ["heating-mantle", "condenser"], chemicalIds: [] },
      { id: "cool", action: "cool", title: "Cool the mixture", instruction: "Cool before transfer to the separatory funnel.", why: "Cooling reduces vapor pressure and improves safe handling.", equipmentIds: ["ice-bath"], chemicalIds: [] },
      { id: "extract", action: "extract", title: "Extract organic layer", instruction: "Separate the ester-rich organic layer.", why: "Liquid-liquid extraction removes water-soluble acid residues.", equipmentIds: ["separatory-funnel"], chemicalIds: [] },
      { id: "purify", action: "purify", title: "Remove solvent", instruction: "Dry the organic layer and remove solvent.", why: "Purification improves product purity before analysis.", equipmentIds: ["rotary-evaporator"], chemicalIds: [] },
      { id: "analyze", action: "analyze-ir", title: "Analyze by IR", instruction: "Record IR spectrum of the product.", why: "A strong ester carbonyl confirms product formation.", equipmentIds: ["ir-spectrometer"], chemicalIds: ["ethyl-acetate"] },
    ],
    observations: observations([
      ["ester-warm", "heat", 12, "The mixture becomes warm and homogeneous under reflux.", "temperature"],
      ["ester-layers", "extract", 38, "Two layers separate clearly in the separatory funnel.", "phase"],
      ["ester-smell", "purify", 48, "A fruity ester odor is noted in the product fraction.", "instrument"],
      ["ester-ir", "analyze-ir", 55, "IR shows a strong sharp ester C=O absorption.", "instrument"],
    ]),
    measurements: [
      { id: "mass-acid", label: "Acetic acid mass", value: 3.0, unit: "g", uncertainty: 0.01, explanation: "Used to estimate theoretical yield." },
      { id: "volume-ethanol", label: "Ethanol volume", value: 4.0, unit: "mL", uncertainty: 0.05, explanation: "Ethanol is used in slight excess." },
      { id: "product-mass", label: "Product mass", value: 3.2, unit: "g", uncertainty: 0.01, explanation: "Used for percent yield." },
    ],
    spectra: [
      peak("ester-c=o", "IR", "1740 cm^-1", "ester C=O stretch", ["carbonyl"]),
      peak("ester-c-o", "IR", "1050-1300 cm^-1", "ester C-O stretch", ["ester-o"]),
      peak("ester-nmr", "1H NMR", "4.1 ppm quartet", "O-CH2 protons", ["ethyl-ch2"]),
      peak("ester-ms", "Mass Spec", "m/z 88", "molecular ion", ["molecular-ion"]),
    ],
    safety: buildSafetyProfile([sampleChemicals.ethanol, sampleChemicals["acetic-acid"], sampleChemicals["sulfuric-acid"]]),
    assessment: [
      { id: "ester-predict", type: "prediction", prompt: "Which product forms from ethanol and acetic acid?", choices: ["Ethyl ethanoate", "Acetone", "Benzene", "Glucose"], answer: "Ethyl ethanoate", explanation: "An alcohol plus carboxylic acid forms an ester under acid catalysis." },
      { id: "ester-ir", type: "spectroscopy", prompt: "Which IR signal supports ester formation?", choices: ["1740 cm^-1 C=O", "3300 cm^-1 broad O-H only", "2250 cm^-1 C≡N", "No absorption"], answer: "1740 cm^-1 C=O", explanation: "Esters have strong carbonyl absorptions near 1740 cm^-1." },
    ],
    expectedProduct: "Ethyl ethanoate",
    yieldPercent: 68,
    purityPercent: 86,
  },
  {
    id: "cyclohexene-bromine-test",
    title: "Alkene Test: Cyclohexene and Bromine",
    category: "Organic Chemistry",
    compoundId: "cyclohexene",
    difficulty: "Introductory",
    estimatedMinutes: 20,
    concepts: ["alkenes", "addition", "qualitative observation", "color change"],
    prerequisites: ["Alkenes", "Functional group tests"],
    chemicals: [sampleChemicals.cyclohexene, sampleChemicals.bromine],
    equipmentIds: ["test-tube", "pipette", "uv-lamp"],
    techniques: ["qualitative-test", "observation"],
    steps: [
      { id: "add-sample", action: "add-solvent", title: "Add cyclohexene", instruction: "Place a small amount of cyclohexene in a test tube.", why: "Small-scale testing minimizes hazards.", equipmentIds: ["test-tube"], chemicalIds: ["cyclohexene"] },
      { id: "add-bromine", action: "add-reagent", title: "Add bromine solution", instruction: "Add bromine solution dropwise.", why: "Bromine tests unsaturation through electrophilic addition.", equipmentIds: ["pipette"], chemicalIds: ["bromine"] },
      { id: "mix-test", action: "mix", title: "Mix gently", instruction: "Swirl and observe color.", why: "Mixing brings reagent into contact with the alkene.", equipmentIds: ["test-tube"], chemicalIds: [] },
    ],
    observations: observations([
      ["bromine-orange", "add-reagent", 2, "Orange bromine color appears initially.", "color"],
      ["bromine-fade", "mix", 4, "The orange color fades as bromine adds across the double bond.", "color"],
    ]),
    measurements: [
      { id: "bromine-drops", label: "Bromine drops", value: 5, unit: "drops", uncertainty: 1, explanation: "Qualitative tests use approximate reagent amounts." },
    ],
    spectra: [
      peak("alkene-ir", "IR", "1640 cm^-1", "C=C stretch", ["alkene"]),
      buildUvVisibleBand(2),
    ],
    safety: buildSafetyProfile([sampleChemicals.cyclohexene, sampleChemicals.bromine]),
    assessment: [
      { id: "alkene-observation", type: "observation", prompt: "What observation indicates an alkene?", choices: ["Bromine decolorizes", "Crystals melt", "pH becomes 14", "Gas is always formed"], answer: "Bromine decolorizes", explanation: "Alkenes consume bromine by addition, fading the orange/brown color." },
    ],
    expectedProduct: "1,2-dibromocyclohexane",
    yieldPercent: 74,
    purityPercent: 80,
  },
  {
    id: "aspirin-recrystallization",
    title: "Aspirin Recrystallization and Melting Point",
    category: "Laboratory Techniques",
    compoundId: "aspirin",
    difficulty: "Intermediate",
    estimatedMinutes: 45,
    concepts: ["recrystallization", "melting point", "purity", "vacuum filtration"],
    prerequisites: ["Solubility", "Filtration"],
    chemicals: [sampleChemicals.aspirin, sampleChemicals.ethanol, sampleChemicals.water],
    equipmentIds: ["erlenmeyer-flask", "hot-plate", "ice-bath", "vacuum-filtration", "filter-paper", "watch-glass", "thermometer"],
    techniques: ["recrystallization", "vacuum-filtration", "melting-point"],
    steps: [
      { id: "dissolve", action: "heat", title: "Dissolve crude aspirin", instruction: "Warm crude aspirin in minimal hot solvent.", why: "A good recrystallization solvent dissolves product hot but not cold.", equipmentIds: ["erlenmeyer-flask", "hot-plate"], chemicalIds: ["aspirin", "ethanol"] },
      { id: "cool-crystals", action: "cool", title: "Cool slowly", instruction: "Allow solution to cool, then place in an ice bath.", why: "Slow cooling promotes purer crystal growth.", equipmentIds: ["ice-bath"], chemicalIds: [] },
      { id: "vacuum-filter", action: "filter", title: "Collect crystals", instruction: "Use vacuum filtration to collect aspirin crystals.", why: "Vacuum filtration separates solid product from mother liquor.", equipmentIds: ["vacuum-filtration", "filter-paper"], chemicalIds: [] },
      { id: "dry", action: "wait", title: "Dry crystals", instruction: "Let crystals dry on a watch glass.", why: "Residual solvent lowers apparent purity.", equipmentIds: ["watch-glass"], chemicalIds: [] },
      { id: "melting", action: "record-temperature", title: "Measure melting point", instruction: "Record melting range.", why: "Sharp melting near literature value indicates purity.", equipmentIds: ["thermometer"], chemicalIds: ["aspirin"], measurementIds: ["mp-aspirin"] },
    ],
    observations: observations([
      ["aspirin-dissolve", "heat", 8, "Crude aspirin dissolves in hot solvent.", "phase"],
      ["aspirin-crystals", "cool", 24, "White crystals appear as the solution cools.", "crystal"],
      ["aspirin-dry", "wait", 38, "Crystals become dry and free-flowing.", "crystal"],
    ]),
    measurements: [
      { id: "mp-aspirin", label: "Melting point", value: 135, unit: "C", uncertainty: 1, explanation: "Pure aspirin melts around 135-136 C." },
    ],
    spectra: [
      peak("aspirin-acid-c=o", "IR", "1690 cm^-1", "carboxylic acid C=O", ["acid-carbonyl"]),
      peak("aspirin-ester-c=o", "IR", "1750 cm^-1", "ester C=O", ["ester-carbonyl"]),
      peak("aspirin-aromatic", "1H NMR", "7.1-8.2 ppm", "aromatic protons", ["aromatic"]),
    ],
    safety: buildSafetyProfile([sampleChemicals.aspirin, sampleChemicals.ethanol]),
    assessment: [
      { id: "recryst-solvent", type: "prediction", prompt: "Why use minimal hot solvent?", choices: ["Maximize crystal recovery", "Destroy impurities", "Increase pH", "Prevent all crystallization"], answer: "Maximize crystal recovery", explanation: "Too much solvent keeps product dissolved during cooling." },
    ],
    expectedProduct: "Purified aspirin",
    yieldPercent: 72,
    purityPercent: 94,
  },
  {
    id: "caffeine-spectroscopy",
    title: "Caffeine Spectroscopy Identification",
    category: "Spectroscopy",
    compoundId: "caffeine",
    difficulty: "Advanced",
    estimatedMinutes: 35,
    concepts: ["IR", "1H NMR", "13C NMR", "mass spectrometry", "heterocycles"],
    prerequisites: ["Functional groups", "Spectroscopy basics"],
    chemicals: [sampleChemicals.caffeine],
    equipmentIds: ["ir-spectrometer", "nmr-spectrometer", "mass-spectrometer"],
    techniques: ["ir-analysis", "nmr-analysis", "mass-spectrometry"],
    steps: [
      { id: "prep-sample", action: "weigh", title: "Prepare caffeine sample", instruction: "Weigh a small dry caffeine sample.", why: "Dry samples improve spectral quality.", equipmentIds: ["balance"], chemicalIds: ["caffeine"], measurementIds: ["mass-caffeine"] },
      { id: "ir", action: "analyze-ir", title: "Collect IR spectrum", instruction: "Acquire IR spectrum.", why: "IR detects carbonyl and heteroatom functional groups.", equipmentIds: ["ir-spectrometer"], chemicalIds: ["caffeine"] },
      { id: "nmr", action: "analyze-nmr", title: "Collect NMR spectrum", instruction: "Acquire proton and carbon NMR spectra.", why: "NMR distinguishes methyl and ring environments.", equipmentIds: ["nmr-spectrometer"], chemicalIds: ["caffeine"] },
      { id: "ms", action: "analyze-ms", title: "Collect mass spectrum", instruction: "Record molecular ion.", why: "Mass spectrometry confirms molecular mass.", equipmentIds: ["mass-spectrometer"], chemicalIds: ["caffeine"] },
    ],
    observations: observations([
      ["caffeine-ir", "analyze-ir", 12, "IR shows two strong carbonyl-like bands.", "instrument"],
      ["caffeine-nmr", "analyze-nmr", 22, "NMR shows methyl singlets from N-methyl groups.", "instrument"],
      ["caffeine-ms", "analyze-ms", 32, "Mass spectrum shows a molecular ion near m/z 194.", "instrument"],
    ]),
    measurements: [
      { id: "mass-caffeine", label: "Caffeine sample", value: 25, unit: "mg", uncertainty: 1, explanation: "Small amount is sufficient for simulated spectra." },
    ],
    spectra: [
      peak("caf-c=o-1", "IR", "1700 cm^-1", "amide-like carbonyl", ["carbonyl-1"]),
      peak("caf-c=o-2", "IR", "1650 cm^-1", "conjugated carbonyl", ["carbonyl-2"]),
      peak("caf-methyl", "1H NMR", "3.3-4.0 ppm singlets", "N-methyl protons", ["n-methyl"]),
      peak("caf-c13", "13C NMR", "150-155 ppm", "carbonyl/heteroaromatic carbons", ["ring"]),
      peak("caf-ms", "Mass Spec", "m/z 194", "molecular ion", ["molecular-ion"]),
    ],
    safety: buildSafetyProfile([sampleChemicals.caffeine]),
    assessment: [
      { id: "caf-ms", type: "spectroscopy", prompt: "Which signal supports caffeine's molecular mass?", choices: ["m/z 194", "1740 cm^-1", "7 ppm", "pH 7"], answer: "m/z 194", explanation: "Mass spectrometry reports molecular ion and fragment m/z values." },
    ],
    expectedProduct: "Identified caffeine",
    yieldPercent: 100,
    purityPercent: 90,
  },
  {
    id: "acid-base-ph-ammonia",
    title: "Ammonia Solution pH and Indicator Observation",
    category: "General Chemistry",
    compoundId: "ammonia",
    difficulty: "Introductory",
    estimatedMinutes: 18,
    concepts: ["bases", "pH meter", "indicator color", "aqueous equilibrium"],
    prerequisites: ["Acids and bases"],
    chemicals: [sampleChemicals.ammonia, sampleChemicals.water],
    equipmentIds: ["beaker", "ph-meter", "pipette"],
    techniques: ["ph-measurement", "observation"],
    steps: [
      { id: "add-water", action: "add-solvent", title: "Prepare solution", instruction: "Add water to a beaker.", why: "Water is the solvent for the weak-base equilibrium.", equipmentIds: ["beaker"], chemicalIds: ["water"] },
      { id: "add-ammonia", action: "add-reagent", title: "Add ammonia", instruction: "Add dilute ammonia solution.", why: "Ammonia accepts protons from water and raises pH.", equipmentIds: ["pipette"], chemicalIds: ["ammonia"] },
      { id: "measure-ph", action: "measure-ph", title: "Measure pH", instruction: "Use calibrated pH meter.", why: "pH quantifies basicity.", equipmentIds: ["ph-meter"], chemicalIds: ["ammonia"], measurementIds: ["ph-ammonia"] },
    ],
    observations: observations([
      ["ammonia-odor", "add-reagent", 2, "A sharp ammonia odor is noted in the simulated hood.", "safety"],
      ["ammonia-ph", "measure-ph", 6, "pH meter stabilizes in the basic range.", "instrument"],
    ]),
    measurements: [
      { id: "ph-ammonia", label: "pH", value: 11.2, unit: "pH", uncertainty: 0.1, explanation: "Dilute ammonia is weakly basic." },
    ],
    spectra: [],
    safety: buildSafetyProfile([sampleChemicals.ammonia]),
    assessment: [
      { id: "ammonia-base", type: "prediction", prompt: "Why is ammonia basic?", choices: ["Nitrogen lone pair accepts H+", "It contains carbonyl", "It is aromatic", "It has no electrons"], answer: "Nitrogen lone pair accepts H+", explanation: "Ammonia acts as a Bronsted-Lowry base by accepting a proton." },
    ],
    expectedProduct: "Basic ammonia solution",
    yieldPercent: 100,
    purityPercent: 100,
  },
]

const coveredCompounds = [
  "acetone",
  "ethanol",
  "acetic-acid",
  "benzene",
  "phenol",
  "aniline",
  "cyclohexane",
  "cyclohexene",
  "ethene",
  "ethyne",
  "aspirin",
  "caffeine",
  "glucose",
  "water",
  "ammonia",
]

export function listVirtualLabExperiments(): VirtualLabExperiment[] {
  return VIRTUAL_LAB_EXPERIMENTS
}

export function getVirtualLabExperiment(id: string): VirtualLabExperiment | undefined {
  return VIRTUAL_LAB_EXPERIMENTS.find((experiment) => experiment.id === id)
}

export function experimentsForCompound(compoundId: string): VirtualLabExperiment[] {
  return VIRTUAL_LAB_EXPERIMENTS.filter((experiment) =>
    experiment.compoundId === compoundId ||
    experiment.chemicals.some((chemical) => chemical.id === compoundId),
  )
}

export function virtualLabCoveredCompounds(): string[] {
  return coveredCompounds
}

export function virtualLabMetrics() {
  return {
    experiments: VIRTUAL_LAB_EXPERIMENTS.length,
    coveredCompounds: coveredCompounds.length,
    spectra: VIRTUAL_LAB_EXPERIMENTS.reduce((sum, experiment) => sum + experiment.spectra.length, 0),
    assessments: VIRTUAL_LAB_EXPERIMENTS.reduce((sum, experiment) => sum + experiment.assessment.length, 0),
  }
}
