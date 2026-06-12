import { ALL_ELEMENTS } from "@/lib/chemistry/database/periodic-table"
import {
  CHEMISTRY_KNOWLEDGE_CORE_META,
  COMMON_IONS,
  KNOWLEDGE_COMPOUNDS,
  KNOWLEDGE_FUNCTIONAL_GROUPS,
  REACTION_TEMPLATES_KNOWLEDGE,
} from "@/lib/chemistry/registry"
import type { Compound, FunctionalGroup, Ion, ReactionTemplate } from "@/lib/chemistry/types"
import type { ElementRecord } from "@/lib/chemistry/database/types"
import type { Question, QuestionChoice, QuestionTemplate, QuestionTemplateContext } from "./types"

const choiceLabels = ["A", "B", "C", "D"]

const groupAliases: Record<string, string[]> = {
  Alcohol: ["alcohol", "hydroxyl", "ol"],
  Aldehyde: ["aldehyde", "terminal carbonyl", "cho"],
  Ketone: ["ketone", "carbonyl"],
  Ester: ["ester", "alkanoate"],
  Ether: ["ether"],
  "Carboxylic Acid": ["carboxylic acid", "carboxyl", "cooh"],
  Amine: ["amine", "amino"],
  Amide: ["amide"],
  Alkene: ["alkene"],
  Alkyne: ["alkyne"],
  Haloalkane: ["haloalkane", "halogeno", "halogenoalkane", "alkyl halide"],
}

const classificationGroups = [
  "Alcohol",
  "Ketone",
  "Carboxylic Acid",
  "Ester",
  "Amine",
  "Aldehyde",
  "Haloalkane",
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function cleanSubtopic(value?: string): string {
  return value && value !== "all" ? value : ""
}

function pick<T>(items: T[], index: number): T | null {
  if (!items.length) return null
  return items[Math.abs(index) % items.length]
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  const output: T[] = []
  for (const item of items) {
    const value = key(item)
    if (!seen.has(value)) {
      seen.add(value)
      output.push(item)
    }
  }
  return output
}

function labeledChoices(correctText: string, wrongTexts: string[], seed: number): {
  choices: QuestionChoice[]
  correctAnswer: string
} | null {
  const wrongs = uniqueBy(
    wrongTexts.filter((text) => normalize(text) !== normalize(correctText)),
    normalize,
  ).slice(0, 3)
  if (wrongs.length < 3) return null

  const correctIndex = Math.abs(seed) % 4
  const texts = [...wrongs]
  texts.splice(correctIndex, 0, correctText)
  const choices = texts.map((text, index) => ({ label: choiceLabels[index], text }))
  return {
    choices,
    correctAnswer: `${choiceLabels[correctIndex]}. ${correctText}`,
  }
}

function hasGroup(compound: Compound, groupName: string): boolean {
  const aliases = groupAliases[groupName] ?? [groupName]
  const haystack = normalize(
    [compound.category, compound.functionalGroups.join(" "), compound.name, compound.description ?? ""].join(" "),
  )
  return aliases.some((alias) => haystack.includes(normalize(alias)))
}

function compoundsForGroup(groupName: string): Compound[] {
  return KNOWLEDGE_COMPOUNDS.filter((compound) => hasGroup(compound, groupName))
}

function groupFromContext(context: QuestionTemplateContext): string {
  const requested = cleanSubtopic(context.targetSubtopic)
  const fromSubtopic = classificationGroups.find((group) => normalize(requested).includes(normalize(group)))
  if (fromSubtopic) return fromSubtopic

  const functionalGroup = KNOWLEDGE_FUNCTIONAL_GROUPS.find((group) =>
    normalize(requested).includes(normalize(group.name)),
  )
  if (functionalGroup) return functionalGroup.name

  return classificationGroups[context.index % classificationGroups.length]
}

function getFunctionalGroupRecord(groupName: string): FunctionalGroup | null {
  return (
    KNOWLEDGE_FUNCTIONAL_GROUPS.find(
      (group) => normalize(group.name) === normalize(groupName) || normalize(groupName).includes(normalize(group.name)),
    ) ?? null
  )
}

function similarCompounds(compound: Compound): Compound[] {
  const sameGroup = KNOWLEDGE_COMPOUNDS.filter(
    (item) =>
      item.id !== compound.id &&
      (item.category === compound.category ||
        item.functionalGroups.some((group) => compound.functionalGroups.includes(group))),
  )
  const byMass = [...KNOWLEDGE_COMPOUNDS]
    .filter((item) => item.id !== compound.id)
    .sort((a, b) => Math.abs(a.molarMass - compound.molarMass) - Math.abs(b.molarMass - compound.molarMass))

  return uniqueBy([...sameGroup, ...byMass], (item) => item.id)
}

function buildCompoundQuestion(input: {
  id: string
  context: QuestionTemplateContext
  topic: string
  subtopic: string
  question: string
  correctText: string
  wrongTexts: string[]
  explanation: string
  sourceEntry: { kind: string; id: string; name: string }
  misconceptionNote?: string
}): Question | null {
  const labeled = labeledChoices(input.correctText, input.wrongTexts, input.context.index)
  if (!labeled) return null
  return {
    id: `db-${input.id}-${input.context.index}`,
    topic: input.topic,
    subtopic: input.subtopic,
    questionType: "Multiple choice",
    difficulty: input.context.difficulty,
    curriculumStyle: input.context.curriculum ?? "Database Generated",
    question: input.question,
    choices: labeled.choices,
    correctAnswer: labeled.correctAnswer,
    explanation: input.explanation,
    misconceptionNote: input.misconceptionNote,
    source: "database",
    sourceEntry: input.sourceEntry,
  }
}

function buildFunctionalGroupQuestion(context: QuestionTemplateContext): Question | null {
  const groupName = groupFromContext(context)
  const candidates = compoundsForGroup(groupName)
  const correct = pick(candidates, context.index)
  const group = getFunctionalGroupRecord(groupName)
  if (!correct || !group) return null

  const wrongTexts = KNOWLEDGE_COMPOUNDS.filter((compound) => !hasGroup(compound, groupName)).map((compound) => compound.name)
  return buildCompoundQuestion({
    id: `functional-group-${group.id}-${correct.id}`,
    context,
    topic: "Functional Group Identification",
    subtopic: `${group.name}s`.replace("Acids", "Acids"),
    question: `Which compound contains a(n) ${group.name.toLowerCase()} functional group?`,
    correctText: correct.name,
    wrongTexts,
    explanation: `${correct.name} contains ${group.identifier}, which is the identifying pattern for the ${group.name.toLowerCase()} functional group.`,
    sourceEntry: { kind: "compound", id: correct.id, name: correct.name },
    misconceptionNote: "Look for the structural pattern, not just the molecular formula.",
  })
}

function buildCompoundFormulaQuestion(context: QuestionTemplateContext): Question | null {
  const compounds = KNOWLEDGE_COMPOUNDS.filter((compound) => compound.formula && compound.molarMass > 0)
  const correct = pick(compounds, context.index * 3 + 1)
  if (!correct) return null

  return buildCompoundQuestion({
    id: `formula-${correct.id}`,
    context,
    topic: context.topic || "Stoichiometry",
    subtopic: "Mole Calculations",
    question: `What is the molecular formula of ${correct.name}?`,
    correctText: correct.formula,
    wrongTexts: similarCompounds(correct).map((compound) => compound.formula),
    explanation: `${correct.name} is represented by the formula ${correct.formula}. Formula recognition supports molar mass and stoichiometry work.`,
    sourceEntry: { kind: "compound", id: correct.id, name: correct.name },
    misconceptionNote: "Similar names can have different atom counts, especially within homologous organic series.",
  })
}

function buildMolarMassQuestion(context: QuestionTemplateContext): Question | null {
  const compounds = KNOWLEDGE_COMPOUNDS.filter((compound) => compound.molarMass > 20)
  const correct = pick(compounds, context.index * 5 + 2)
  if (!correct) return null

  const value = Math.round(correct.molarMass)
  return buildCompoundQuestion({
    id: `molar-mass-${correct.id}`,
    context,
    topic: "Stoichiometry",
    subtopic: "Mole Calculations",
    question: `Which compound has a molar mass closest to ${value} g/mol?`,
    correctText: correct.name,
    wrongTexts: similarCompounds(correct)
      .filter((compound) => Math.abs(compound.molarMass - correct.molarMass) > 4)
      .map((compound) => compound.name),
    explanation: `${correct.name} has an approximate molar mass of ${correct.molarMass.toFixed(1)} g/mol, so it is closest to ${value} g/mol.`,
    sourceEntry: { kind: "compound", id: correct.id, name: correct.name },
    misconceptionNote: "Use the whole formula, not only the heaviest atom, when comparing molar masses.",
  })
}

function buildIonChargeQuestion(context: QuestionTemplateContext): Question | null {
  const ion = pick(COMMON_IONS, context.index * 7 + 3)
  if (!ion) return null
  const chargeOptions = uniqueBy(
    [ion.charge, "+1", "+2", "+3", "-1", "-2", "-3"].filter((charge) => charge !== ion.charge),
    normalize,
  )

  return buildCompoundQuestion({
    id: `ion-charge-${ion.id}`,
    context,
    topic: context.topic || "Acids and Bases",
    subtopic: "Ionic Bonding",
    question: `What is the charge of ${ion.name} (${ion.formula})?`,
    correctText: ion.charge,
    wrongTexts: chargeOptions,
    explanation: `${ion.name} is commonly written as ${ion.formula}, so its charge is ${ion.charge}.`,
    sourceEntry: { kind: "ion", id: ion.id, name: ion.name },
    misconceptionNote: "Polyatomic ion charges belong to the whole ion, not to one atom inside the ion.",
  })
}

function buildReactionTypeQuestion(context: QuestionTemplateContext): Question | null {
  const reaction = pick(REACTION_TEMPLATES_KNOWLEDGE, context.index * 2 + 1)
  if (!reaction) return null
  const correctText = reaction.examples?.[0] ?? reaction.generalForm

  return buildCompoundQuestion({
    id: `reaction-type-${reaction.id}`,
    context,
    topic: context.topic || "Reactions",
    subtopic: reaction.type,
    question: `Which reaction is classified as ${reaction.type}?`,
    correctText,
    wrongTexts: REACTION_TEMPLATES_KNOWLEDGE.filter((template) => template.id !== reaction.id).map(
      (template) => template.examples?.[0] ?? template.generalForm,
    ),
    explanation: `${correctText} matches the ${reaction.type} pattern: ${reaction.generalForm}. ${reaction.description}`,
    sourceEntry: { kind: "reaction-template", id: reaction.id, name: reaction.type },
    misconceptionNote: "Classify reactions by the pattern of reactants and products, not just by one formula.",
  })
}

function buildCompoundClassificationQuestion(context: QuestionTemplateContext): Question | null {
  const groupName = groupFromContext(context)
  const candidates = compoundsForGroup(groupName)
  const correct = pick(candidates, context.index * 3 + 2)
  if (!correct) return null

  return buildCompoundQuestion({
    id: `classification-${groupName}-${correct.id}`,
    context,
    topic: "Functional Group Identification",
    subtopic: `${groupName}s`,
    question: `Which compound is a ${groupName.toLowerCase()}?`,
    correctText: correct.name,
    wrongTexts: KNOWLEDGE_COMPOUNDS.filter((compound) => !hasGroup(compound, groupName)).map((compound) => compound.name),
    explanation: `${correct.name} is classified as a ${groupName.toLowerCase()} because its record includes the matching functional group/category.`,
    sourceEntry: { kind: "compound", id: correct.id, name: correct.name },
    misconceptionNote: "Classification depends on the functional group present in the structure.",
  })
}

function pickTrendPair(context: QuestionTemplateContext, property: keyof ElementRecord): [ElementRecord, ElementRecord] | null {
  const elements = ALL_ELEMENTS.filter((element) => typeof element[property] === "number")
  const first = pick(elements, context.index * 5 + 4)
  if (!first) return null
  const second =
    elements.find(
      (element) =>
        element.id !== first.id &&
        element.period === first.period &&
        typeof element[property] === "number" &&
        Math.abs((element[property] as number) - (first[property] as number)) > 5,
    ) ??
    elements.find(
      (element) =>
        element.id !== first.id &&
        typeof element[property] === "number" &&
        Math.abs((element[property] as number) - (first[property] as number)) > 5,
    )
  return second ? [first, second] : null
}

function buildPeriodicTrendQuestion(context: QuestionTemplateContext): Question | null {
  const trendTemplates = [
    {
      id: "atomic-radius",
      property: "atomicRadiusPm" as const,
      subtopic: "Atomic Radius",
      prompt: "Which element has the larger atomic radius?",
      choose: (a: ElementRecord, b: ElementRecord) => ((a.atomicRadiusPm ?? 0) > (b.atomicRadiusPm ?? 0) ? a : b),
      unit: "pm",
      explanation: "Atomic radius generally increases down a group and toward the lower left because added shells and shielding make atoms larger.",
    },
    {
      id: "ionization-energy",
      property: "ionizationEnergyKjMol" as const,
      subtopic: "Ionization Energy",
      prompt: "Which element has the higher first ionization energy?",
      choose: (a: ElementRecord, b: ElementRecord) =>
        (a.ionizationEnergyKjMol ?? 0) > (b.ionizationEnergyKjMol ?? 0) ? a : b,
      unit: "kJ/mol",
      explanation: "Ionization energy generally increases toward the upper right as effective nuclear attraction increases.",
    },
    {
      id: "electronegativity",
      property: "electronegativity" as const,
      subtopic: "Effective Nuclear Charge",
      prompt: "Which element is more electronegative?",
      choose: (a: ElementRecord, b: ElementRecord) => ((a.electronegativity ?? 0) > (b.electronegativity ?? 0) ? a : b),
      unit: "Pauling units",
      explanation: "Electronegativity generally increases toward the upper right as atoms attract bonding electrons more strongly.",
    },
    {
      id: "electron-affinity",
      property: "electronAffinityKjMol" as const,
      subtopic: "Electron Affinity",
      prompt: "Which element has the larger listed electron affinity value?",
      choose: (a: ElementRecord, b: ElementRecord) =>
        (a.electronAffinityKjMol ?? 0) > (b.electronAffinityKjMol ?? 0) ? a : b,
      unit: "kJ/mol",
      explanation: "Electron affinity values often become larger toward the upper right, with known exceptions.",
    },
  ]
  const requested = cleanSubtopic(context.targetSubtopic)
  const trend =
    trendTemplates.find((template) => normalize(requested).includes(normalize(template.subtopic))) ??
    trendTemplates[context.index % trendTemplates.length]
  const pair = pickTrendPair(context, trend.property)
  if (!pair) return null
  const [a, b] = pair
  const correct = trend.choose(a, b)
  const values = `${a.symbol}: ${String(a[trend.property])} ${trend.unit}; ${b.symbol}: ${String(b[trend.property])} ${trend.unit}`

  return buildCompoundQuestion({
    id: `periodic-${trend.id}-${a.symbol}-${b.symbol}`,
    context,
    topic: "Periodic Trends",
    subtopic: trend.subtopic,
    question: `${trend.prompt} Compare ${a.symbol} and ${b.symbol}.`,
    correctText: `${correct.symbol} (${correct.name})`,
    wrongTexts: [`${correct.id === a.id ? b.symbol : a.symbol} (${correct.id === a.id ? b.name : a.name})`, "They are always equal", "Cannot be compared from periodic data"],
    explanation: `${trend.explanation} Database values used: ${values}.`,
    sourceEntry: { kind: "element", id: correct.id, name: correct.name },
    misconceptionNote: "Trend rules are guides; compare actual listed data when it is available.",
  })
}

export const DATABASE_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "functional-group-compound",
    name: "Functional Group Compound",
    description: "Ask which compound contains a named functional group.",
    supportedTopics: ["Functional Group Identification", "IR Spectroscopy"],
    supportedSubtopics: ["Alcohols", "Aldehydes", "Ketones", "Carboxylic Acids", "Esters", "Amides", "Amines", "Haloalkanes"],
    estimatedCombinations: KNOWLEDGE_FUNCTIONAL_GROUPS.length * 12,
    build: buildFunctionalGroupQuestion,
  },
  {
    id: "compound-formula",
    name: "Compound Formula",
    description: "Ask for the molecular formula of a known compound.",
    supportedTopics: ["Stoichiometry", "Functional Group Identification", "IR Spectroscopy"],
    estimatedCombinations: KNOWLEDGE_COMPOUNDS.length,
    build: buildCompoundFormulaQuestion,
  },
  {
    id: "molar-mass",
    name: "Molar Mass",
    description: "Ask which compound is closest to a target molar mass.",
    supportedTopics: ["Stoichiometry"],
    supportedSubtopics: ["Mole Calculations"],
    estimatedCombinations: KNOWLEDGE_COMPOUNDS.length,
    build: buildMolarMassQuestion,
  },
  {
    id: "ion-charge",
    name: "Ion Charge",
    description: "Ask for the charge of a common ion.",
    supportedTopics: ["Acids and Bases", "Bonding", "Stoichiometry"],
    supportedSubtopics: ["Ionic Bonding", "pH", "Strong and Weak Acids"],
    estimatedCombinations: COMMON_IONS.length,
    build: buildIonChargeQuestion,
  },
  {
    id: "reaction-type",
    name: "Reaction Type",
    description: "Ask which reaction pattern belongs to a named reaction type.",
    supportedTopics: ["Acids and Bases", "Functional Group Identification", "Bonding", "Equilibrium"],
    estimatedCombinations: REACTION_TEMPLATES_KNOWLEDGE.length,
    build: buildReactionTypeQuestion,
  },
  {
    id: "compound-classification",
    name: "Compound Classification",
    description: "Ask which compound belongs to a functional class.",
    supportedTopics: ["Functional Group Identification", "IR Spectroscopy"],
    supportedSubtopics: ["Alcohols", "Ketones", "Carboxylic Acids", "Esters", "Amines", "Aldehydes", "Haloalkanes"],
    estimatedCombinations: classificationGroups.length * 12,
    build: buildCompoundClassificationQuestion,
  },
  {
    id: "periodic-trends",
    name: "Periodic Trends",
    description: "Ask data-backed trend comparisons from the periodic table dataset.",
    supportedTopics: ["Periodic Trends"],
    supportedSubtopics: ["Atomic Radius", "Ionization Energy", "Electron Affinity", "Effective Nuclear Charge", "Shielding"],
    estimatedCombinations: ALL_ELEMENTS.length * 4,
    build: buildPeriodicTrendQuestion,
  },
]

export function getQuestionEngineTemplateCoverage(): number {
  const requestedTemplateFamilies = 7
  return Math.round((DATABASE_QUESTION_TEMPLATES.length / requestedTemplateFamilies) * 100)
}

export function getQuestionEngineDatabaseCounts() {
  return {
    compounds: CHEMISTRY_KNOWLEDGE_CORE_META.counts.compounds,
    ions: CHEMISTRY_KNOWLEDGE_CORE_META.counts.ions,
    functionalGroups: CHEMISTRY_KNOWLEDGE_CORE_META.counts.functionalGroups,
    reactions: CHEMISTRY_KNOWLEDGE_CORE_META.counts.reactionTemplates,
  }
}
