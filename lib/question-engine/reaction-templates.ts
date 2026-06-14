import { REACTION_RECORDS } from "@/lib/chemistry/reactions"
import { BALANCING_EXERCISES } from "@/lib/reaction-engine/balancer"
import type { ReactionRecord } from "@/lib/chemistry/reaction-types"
import type { Question, QuestionChoice, QuestionTemplate, QuestionTemplateContext } from "./types"

const choiceLabels = ["A", "B", "C", "D"]

const reactionTopics = [
  "Reactions",
  "Reaction Types",
  "Reaction Prediction",
  "Reaction Balancing",
  "Reaction Classification",
  "Redox",
  "Precipitation",
  "Combustion",
  "Acids and Bases",
  "Organic Reactions",
  "Stoichiometry",
]

const reactionSubtopics = [
  "Reaction Type",
  "Reaction Prediction",
  "Missing Product",
  "Balancing",
  "Redox Identification",
  "Precipitation Prediction",
  "Acid/Base Products",
  "Combustion Products",
  "Reaction Classification",
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function pick<T>(items: T[], index: number): T | null {
  if (!items.length) return null
  return items[Math.abs(index) % items.length]
}

function uniqueTexts(values: string[]): string[] {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const key = normalize(value)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(value)
  }
  return output
}

function labeledChoices(correctText: string, wrongTexts: string[], seed: number): {
  choices: QuestionChoice[]
  correctAnswer: string
} | null {
  const wrongs = uniqueTexts(wrongTexts.filter((text) => normalize(text) !== normalize(correctText))).slice(0, 3)
  if (wrongs.length < 3) return null

  const correctIndex = Math.abs(seed) % 4
  const texts = [...wrongs]
  texts.splice(correctIndex, 0, correctText)
  return {
    choices: texts.map((text, index) => ({ label: choiceLabels[index], text })),
    correctAnswer: `${choiceLabels[correctIndex]}. ${correctText}`,
  }
}

function question(input: {
  id: string
  context: QuestionTemplateContext
  record: ReactionRecord
  topic: string
  subtopic: string
  prompt: string
  correctText: string
  wrongTexts: string[]
  explanation: string
  misconceptionNote?: string
}): Question | null {
  const labeled = labeledChoices(input.correctText, input.wrongTexts, input.context.index)
  if (!labeled) return null

  return {
    id: `db-reaction-${input.id}-${input.context.index}`,
    topic: input.topic,
    subtopic: input.subtopic,
    questionType: "Multiple choice",
    difficulty: input.context.difficulty,
    curriculumStyle: input.context.curriculum ?? "Database Generated",
    question: input.prompt,
    choices: labeled.choices,
    correctAnswer: labeled.correctAnswer,
    explanation: input.explanation,
    misconceptionNote: input.misconceptionNote,
    source: "database",
    sourceEntry: { kind: "reaction", id: input.record.id, name: input.record.name },
    visualReactionId: input.record.id,
  }
}

function recordsFor(context: QuestionTemplateContext, predicate: (record: ReactionRecord) => boolean): ReactionRecord[] {
  const topic = normalize(context.topic)
  const subtopic = normalize(context.targetSubtopic ?? "")
  const direct = REACTION_RECORDS.filter(predicate)
  const narrowed = direct.filter((record) => {
    const haystack = normalize(`${record.category} ${record.reactionType} ${record.name}`)
    return (!topic || haystack.includes(topic) || topic.includes(haystack)) || (!subtopic || haystack.includes(subtopic))
  })
  return narrowed.length ? narrowed : direct
}

function buildReactionType(context: QuestionTemplateContext): Question | null {
  const record = pick(recordsFor(context, () => true), context.index * 3 + 1)
  if (!record) return null
  return question({
    id: `type-${record.id}`,
    context,
    record,
    topic: "Reaction Classification",
    subtopic: "Reaction Type",
    prompt: `Which type best classifies this reaction: ${record.balancedEquation}?`,
    correctText: record.reactionType,
    wrongTexts: REACTION_RECORDS.filter((candidate) => candidate.reactionType !== record.reactionType).map(
      (candidate) => candidate.reactionType,
    ),
    explanation: `${record.name} is a ${record.reactionType} reaction. ${record.explanation}`,
    misconceptionNote: "Classify the full reactant-product pattern, not just one familiar compound.",
  })
}

function buildReactionPrediction(context: QuestionTemplateContext): Question | null {
  const record = pick(recordsFor(context, () => true), context.index * 5 + 2)
  if (!record) return null
  return question({
    id: `prediction-${record.id}`,
    context,
    record,
    topic: "Reaction Prediction",
    subtopic: "Reaction Prediction",
    prompt: `Predict the major product set for: ${record.reactants.join(" + ")} -> ?`,
    correctText: record.products.join(" + "),
    wrongTexts: REACTION_RECORDS.filter((candidate) => candidate.id !== record.id).map((candidate) => candidate.products.join(" + ")),
    explanation: `${record.reactants.join(" + ")} produces ${record.products.join(" + ")}. ${record.explanation}`,
    misconceptionNote: "Use the reaction family first, then balance formula units and charges.",
  })
}

function buildMissingProduct(context: QuestionTemplateContext): Question | null {
  const record = pick(recordsFor(context, (candidate) => candidate.products.length >= 2), context.index * 7 + 3)
  if (!record) return null
  const missingIndex = context.index % record.products.length
  const visibleProducts = record.products.map((product, index) => (index === missingIndex ? "?" : product)).join(" + ")
  return question({
    id: `missing-product-${record.id}`,
    context,
    record,
    topic: "Reaction Prediction",
    subtopic: "Missing Product",
    prompt: `What replaces the missing product in ${record.reactants.join(" + ")} -> ${visibleProducts}?`,
    correctText: record.products[missingIndex],
    wrongTexts: REACTION_RECORDS.flatMap((candidate) => candidate.products).filter((product) => product !== record.products[missingIndex]),
    explanation: `The complete product set is ${record.products.join(" + ")}. ${record.explanation}`,
    misconceptionNote: "Missing-product questions usually reward recognizing the reaction pattern before balancing.",
  })
}

function buildBalancing(context: QuestionTemplateContext): Question | null {
  const exercise = pick(BALANCING_EXERCISES, context.index * 11 + 4)
  if (!exercise) return null
  const record = REACTION_RECORDS.find((candidate) => candidate.id === exercise.reactionId)
  if (!record) return null
  return question({
    id: `balancing-${record.id}`,
    context,
    record,
    topic: "Reaction Balancing",
    subtopic: "Balancing",
    prompt: `Which balanced equation matches this skeleton equation: ${exercise.unbalancedEquation}?`,
    correctText: exercise.balancedEquation,
    wrongTexts: BALANCING_EXERCISES.filter((candidate) => candidate.id !== exercise.id).map((candidate) => candidate.balancedEquation),
    explanation: exercise.explanation,
    misconceptionNote: "Balanced coefficients change molecule counts, not subscripts inside formulas.",
  })
}

function buildRedoxIdentification(context: QuestionTemplateContext): Question | null {
  const record = pick(recordsFor(context, (candidate) => candidate.category === "Redox" || candidate.category === "Electrochemistry"), context.index * 13 + 5)
  if (!record) return null
  return question({
    id: `redox-${record.id}`,
    context,
    record,
    topic: "Redox",
    subtopic: "Redox Identification",
    prompt: `Which equation is a redox reaction?`,
    correctText: record.balancedEquation,
    wrongTexts: REACTION_RECORDS.filter((candidate) => candidate.category !== "Redox" && candidate.category !== "Electrochemistry").map(
      (candidate) => candidate.balancedEquation,
    ),
    explanation: `${record.balancedEquation} involves electron transfer. ${record.explanation}`,
    misconceptionNote: "Redox reactions require oxidation and reduction; precipitation alone is not redox.",
  })
}

function buildPrecipitationPrediction(context: QuestionTemplateContext): Question | null {
  const record = pick(recordsFor(context, (candidate) => candidate.category === "Precipitation"), context.index * 17 + 6)
  if (!record) return null
  const precipitate = record.products[0]
  return question({
    id: `precipitation-${record.id}`,
    context,
    record,
    topic: "Precipitation",
    subtopic: "Precipitation Prediction",
    prompt: `What precipitate forms when ${record.reactants.join(" and ")} are mixed?`,
    correctText: precipitate,
    wrongTexts: REACTION_RECORDS.filter((candidate) => candidate.category === "Precipitation").flatMap((candidate) => candidate.products),
    explanation: `${precipitate} is the low-solubility product in ${record.balancedEquation}. ${record.explanation}`,
    misconceptionNote: "Spectator ions remain dissolved; the precipitate is the insoluble product.",
  })
}

function buildAcidBaseProducts(context: QuestionTemplateContext): Question | null {
  const record = pick(recordsFor(context, (candidate) => candidate.category === "Acid-Base" || candidate.reactionType.includes("neutralization")), context.index * 19 + 7)
  if (!record) return null
  return question({
    id: `acid-base-${record.id}`,
    context,
    record,
    topic: "Acids and Bases",
    subtopic: "Acid/Base Products",
    prompt: `What products are expected from this acid/base reaction: ${record.reactants.join(" + ")}?`,
    correctText: record.products.join(" + "),
    wrongTexts: REACTION_RECORDS.filter((candidate) => candidate.id !== record.id).map((candidate) => candidate.products.join(" + ")),
    explanation: `${record.products.join(" + ")} are formed. ${record.explanation}`,
    misconceptionNote: "Neutralization product formulas depend on ion charges, not only on memorized salt names.",
  })
}

function buildCombustionProducts(context: QuestionTemplateContext): Question | null {
  const record = pick(recordsFor(context, (candidate) => candidate.category === "Combustion"), context.index * 23 + 8)
  if (!record) return null
  return question({
    id: `combustion-${record.id}`,
    context,
    record,
    topic: "Combustion",
    subtopic: "Combustion Products",
    prompt: `Complete combustion of ${record.reactants[0]} produces which products?`,
    correctText: "CO2 + H2O",
    wrongTexts: ["CO + H2O", "C + H2", "O2 + H2", "CO2 only", "H2O only"],
    explanation: `Complete combustion of ${record.reactants[0]} follows ${record.balancedEquation}. ${record.explanation}`,
    misconceptionNote: "Incomplete combustion can form CO or soot, but complete combustion forms CO2 and H2O.",
  })
}

function buildReactionClassification(context: QuestionTemplateContext): Question | null {
  const record = pick(recordsFor(context, () => true), context.index * 29 + 9)
  if (!record) return null
  return question({
    id: `classification-${record.id}`,
    context,
    record,
    topic: "Reaction Classification",
    subtopic: "Reaction Classification",
    prompt: `Which reaction category does this equation belong to: ${record.balancedEquation}?`,
    correctText: record.category,
    wrongTexts: REACTION_RECORDS.filter((candidate) => candidate.category !== record.category).map((candidate) => candidate.category),
    explanation: `${record.name} belongs to ${record.category}. ${record.explanation}`,
    misconceptionNote: "Categories are broader than reaction types; for example, neutralization is an acid-base category.",
  })
}

export const REACTION_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "reaction-type-v360",
    name: "Reaction Type",
    description: "Classify balanced reactions by deterministic reaction type.",
    supportedTopics: reactionTopics,
    supportedSubtopics: reactionSubtopics,
    estimatedCombinations: REACTION_RECORDS.length,
    build: buildReactionType,
  },
  {
    id: "reaction-prediction-v360",
    name: "Reaction Prediction",
    description: "Predict product sets from known classroom reactants.",
    supportedTopics: reactionTopics,
    supportedSubtopics: reactionSubtopics,
    estimatedCombinations: REACTION_RECORDS.length,
    build: buildReactionPrediction,
  },
  {
    id: "missing-product-v360",
    name: "Missing Product",
    description: "Fill in one missing product from a known reaction record.",
    supportedTopics: reactionTopics,
    supportedSubtopics: reactionSubtopics,
    estimatedCombinations: REACTION_RECORDS.length * 2,
    build: buildMissingProduct,
  },
  {
    id: "balancing-v360",
    name: "Balancing",
    description: "Select the correctly balanced equation for a skeleton equation.",
    supportedTopics: reactionTopics,
    supportedSubtopics: reactionSubtopics,
    estimatedCombinations: BALANCING_EXERCISES.length,
    build: buildBalancing,
  },
  {
    id: "redox-identification-v360",
    name: "Redox Identification",
    description: "Recognize redox reactions from equation choices.",
    supportedTopics: ["Redox", "Reaction Classification", "Reaction Types", "Electrochemistry"],
    supportedSubtopics: ["Redox Identification"],
    estimatedCombinations: REACTION_RECORDS.filter((record) => record.category === "Redox").length,
    build: buildRedoxIdentification,
  },
  {
    id: "precipitation-prediction-v360",
    name: "Precipitation Prediction",
    description: "Identify insoluble products from double displacement reactions.",
    supportedTopics: ["Precipitation", "Reaction Prediction", "Reaction Types"],
    supportedSubtopics: ["Precipitation Prediction"],
    estimatedCombinations: REACTION_RECORDS.filter((record) => record.category === "Precipitation").length,
    build: buildPrecipitationPrediction,
  },
  {
    id: "acid-base-products-v360",
    name: "Acid/Base Products",
    description: "Predict products for common neutralization and proton-transfer reactions.",
    supportedTopics: ["Acids and Bases", "Reaction Prediction", "Reaction Types"],
    supportedSubtopics: ["Acid/Base Products"],
    estimatedCombinations: REACTION_RECORDS.filter((record) => record.category === "Acid-Base").length,
    build: buildAcidBaseProducts,
  },
  {
    id: "combustion-products-v360",
    name: "Combustion Products",
    description: "Recognize complete combustion products and balanced equations.",
    supportedTopics: ["Combustion", "Reaction Prediction", "Reaction Types"],
    supportedSubtopics: ["Combustion Products"],
    estimatedCombinations: REACTION_RECORDS.filter((record) => record.category === "Combustion").length,
    build: buildCombustionProducts,
  },
  {
    id: "reaction-classification-v360",
    name: "Reaction Classification",
    description: "Identify broad reaction categories from deterministic records.",
    supportedTopics: reactionTopics,
    supportedSubtopics: reactionSubtopics,
    estimatedCombinations: REACTION_RECORDS.length,
    build: buildReactionClassification,
  },
]
