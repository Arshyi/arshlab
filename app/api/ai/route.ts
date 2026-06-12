import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSubtopicsForTopic, inferSubtopicForTopic } from "@/lib/learning/subtopic-registry"
import {
  DIAGNOSTIC_COUNTS,
  DIAGNOSTIC_CURRICULA,
  DIAGNOSTIC_TOPICS,
} from "@/lib/learning/diagnostic"

const UNAVAILABLE_MESSAGE = "AI Assistant temporarily unavailable"
const MAX_PROMPT_LENGTH = 1600
const MAX_OUTPUT_TOKENS = 500
const PRACTICE_MAX_OUTPUT_TOKENS = 5000
const EXAM_MAX_OUTPUT_TOKENS = 9000
const DIAGNOSTIC_MAX_OUTPUT_TOKENS = 12000
const guestUsage = new Map<string, { date: string; count: number }>()

const PRACTICE_TOPICS = [
  "Functional group identification",
  "Functional Group Identification",
  "Hybridization",
  "VSEPR geometry",
  "VSEPR Geometry",
  "Periodic trends",
  "Periodic Trends",
  "Thermodynamics",
  "Electron configuration",
  "Electron Configuration",
  "IR spectroscopy peak identification",
  "IR Spectroscopy",
  "Kinetics",
  "Equilibrium",
  "Acids and Bases",
  "Bonding",
  "Stoichiometry",
] as const

const PRACTICE_QUESTION_TYPES = [
  "Multiple choice",
  "Short answer",
  "Explanation prompt",
] as const

const PRACTICE_DIFFICULTIES = [
  "Introductory",
  "Intermediate",
  "Advanced",
] as const

const PRACTICE_CURRICULUM_STYLES = [
  "High School",
  "IB Chemistry",
  "AP Chemistry",
  "A-Level Chemistry",
  "CHEM 121 / First Year Chemistry",
] as const

const PRACTICE_QUESTION_COUNTS = [1, 5, 10, 20] as const
const RECOVERY_QUESTION_COUNT = 10

const EXAM_CURRICULA = [
  "CHEM 121",
  "IB Chemistry Style",
  "AP Chemistry Style",
  "A-Level Chemistry Style",
  "General First-Year Chemistry",
] as const

const EXAM_LENGTHS = [10, 20, 30, 50] as const

const EXAM_QUESTION_TYPES = [
  "Multiple Choice Only",
  "Mixed Exam",
  "Short Answer Only",
] as const

interface AiUsageRow {
  id: string
  request_count: number
}

interface PracticeRequest {
  topic: string
  questionType: string
  difficulty: string
  curriculumStyle: string
  questionCount: number
}

interface PracticeChoice {
  label: string
  text: string
}

interface PracticeQuestion {
  id: string
  topic: string
  subtopic: string
  questionType: string
  difficulty: string
  curriculumStyle: string
  question: string
  choices: PracticeChoice[]
  correctAnswer: string
  explanation: string
  misconceptionNote?: string
}

interface PracticeSet {
  questions: PracticeQuestion[]
}

interface RecoveryPlanItem {
  topic: string
  count: number
  difficulty: string
  weaknesses?: string[]
}

interface RecoveryRequest {
  plan: RecoveryPlanItem[]
}

type ExamQuestionType = "multiple_choice" | "short_answer"

interface ExamRequest {
  curriculum: string
  examLength: number
  difficulty: string
  questionType: string
  targetTopic?: string
}

interface ExamQuestion {
  questionNumber: number
  type: ExamQuestionType
  topic: string
  subtopic: string
  question: string
  choices: string[]
  correctAnswer: string
  explanation: string
}

interface GeneratedExam {
  title: string
  questions: ExamQuestion[]
}

interface DiagnosticRequest {
  questionCount: number
  curriculum: string
}

interface DiagnosticQuestion {
  id: string
  questionNumber: number
  topic: string
  subtopic: string
  difficulty: string
  questionType: "Multiple Choice"
  question: string
  choices: string[]
  correctAnswer: string
  explanation: string
}

interface GeneratedDiagnostic {
  title: string
  curriculum: string
  questions: DiagnosticQuestion[]
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function isAllowedFreeModel(model: string): boolean {
  return model === "openrouter/free" || model.endsWith(":free")
}

function isAllowedValue(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === "string" && allowed.includes(value)
}

function isAllowedQuestionCount(value: unknown): value is number {
  return typeof value === "number" && PRACTICE_QUESTION_COUNTS.includes(value as 1 | 5 | 10 | 20)
}

function isAllowedExamLength(value: unknown): value is number {
  return typeof value === "number" && EXAM_LENGTHS.includes(value as 10 | 20 | 30 | 50)
}

function isAllowedDiagnosticCount(value: unknown): value is number {
  return typeof value === "number" && DIAGNOSTIC_COUNTS.includes(value as 20 | 40 | 60)
}

function unavailable(status = 503) {
  return NextResponse.json(
    { ok: false, unavailable: true, message: UNAVAILABLE_MESSAGE },
    { status },
  )
}

function getIpishKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")?.trim()
  return forwardedFor || realIp || "unknown-guest"
}

function checkGuestLimit(request: NextRequest, limit: number) {
  const key = getIpishKey(request)
  const date = todayKey()
  const current = guestUsage.get(key)

  if (!current || current.date !== date) {
    guestUsage.set(key, { date, count: 1 })
    return { allowed: true, remaining: Math.max(0, limit - 1) }
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  current.count += 1
  guestUsage.set(key, current)
  return { allowed: true, remaining: Math.max(0, limit - current.count) }
}

async function checkUserLimit(userId: string, limit: number) {
  const supabase = await createClient()
  if (!supabase) {
    return { allowed: false, error: "Supabase is not configured for user AI limits." }
  }

  const date = todayKey()
  const { data, error } = await supabase
    .from("ai_usage_limits")
    .select("id, request_count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle<AiUsageRow>()

  if (error) {
    return { allowed: false, error: error.message }
  }

  if (!data) {
    const { error: insertError } = await supabase.from("ai_usage_limits").insert({
      user_id: userId,
      date,
      request_count: 1,
      updated_at: new Date().toISOString(),
    })

    if (insertError) return { allowed: false, error: insertError.message }
    return { allowed: true, remaining: Math.max(0, limit - 1) }
  }

  if (data.request_count >= limit) {
    return { allowed: false, limited: true, remaining: 0 }
  }

  const nextCount = data.request_count + 1
  const { error: updateError } = await supabase
    .from("ai_usage_limits")
    .update({ request_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", data.id)
    .eq("user_id", userId)

  if (updateError) return { allowed: false, error: updateError.message }
  return { allowed: true, remaining: Math.max(0, limit - nextCount) }
}

async function getUserId() {
  const supabase = await createClient()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

function buildSystemPrompt(): string {
  return [
    "You are ARSHLAB's free chemistry assistant alpha.",
    "Help students understand chemistry concepts, ARSHLAB tools, molecules, reactions, hybridization, orbitals, spectroscopy, periodic trends, and small practice questions.",
    "Keep answers concise, educational, and clear.",
    "Do not claim to be official exam-board or university material.",
    "Tell users to verify important answers independently.",
    "Do not ask for sensitive personal information.",
  ].join(" ")
}

function buildPracticeSystemPrompt(): string {
  return [
    "You are ARSHLAB's free chemistry practice generator alpha.",
    "Generate only original educational chemistry practice questions.",
    "Do not copy or imitate known copyrighted exam questions.",
    "Do not claim the question is official exam-board, university, or past-paper material.",
    "Keep chemistry accurate, concise, and student-friendly.",
    "Return only valid JSON with no markdown.",
  ].join(" ")
}

function buildRecoverySystemPrompt(): string {
  return [
    "You are ARSHLAB's free chemistry recovery practice generator alpha.",
    "Generate only original educational chemistry recovery questions.",
    "Do not copy or imitate known copyrighted exam questions.",
    "Do not claim questions are official exam-board, university, or past-paper material.",
    "Respect the requested topic and weak-concept distribution exactly.",
    "Return only valid JSON with no markdown.",
  ].join(" ")
}

function buildExamSystemPrompt(): string {
  return [
    "You are ARSHLAB's free chemistry exam generator alpha.",
    "Generate original chemistry practice exams only.",
    "Do not copy or imitate official exam-board, university, or past-paper questions.",
    "Do not claim the exam is affiliated with or endorsed by any institution.",
    "Keep wording clear and avoid ambiguity.",
    "Return only valid JSON with no markdown.",
  ].join(" ")
}

function buildDiagnosticSystemPrompt(): string {
  return [
    "You are ARSHLAB's free chemistry diagnostic assessment generator alpha.",
    "Generate original diagnostic chemistry assessment questions only.",
    "Do not copy or imitate official exam-board, university, or past-paper questions.",
    "Do not claim the diagnostic is affiliated with or endorsed by any institution.",
    "Use clear wording suitable for placement and study planning.",
    "Return only valid JSON with no markdown.",
  ].join(" ")
}

function parsePracticeRequest(body: unknown): PracticeRequest | null {
  const record = body as Record<string, unknown>
  const topic = record.topic
  const questionType = record.questionType
  const difficulty = record.difficulty
  const curriculumStyle = record.curriculumStyle
  const numericQuestionCount =
    typeof record.questionCount === "string" ? Number(record.questionCount) : record.questionCount
  const questionCount =
    typeof numericQuestionCount === "undefined" ? 1 : isAllowedQuestionCount(numericQuestionCount) ? numericQuestionCount : null

  if (
    !isAllowedValue(topic, PRACTICE_TOPICS) ||
    !isAllowedValue(questionType, PRACTICE_QUESTION_TYPES) ||
    !isAllowedValue(difficulty, PRACTICE_DIFFICULTIES) ||
    !isAllowedValue(curriculumStyle, PRACTICE_CURRICULUM_STYLES) ||
    questionCount === null
  ) {
    return null
  }

  return { topic, questionType, difficulty, curriculumStyle, questionCount }
}

function parseExamRequest(body: unknown): ExamRequest | null {
  const record = body as Record<string, unknown>
  const curriculum = record.curriculum
  const difficulty = record.difficulty
  const questionType = record.questionType
  const numericExamLength =
    typeof record.examLength === "string" ? Number(record.examLength) : record.examLength
  const targetTopic = typeof record.targetTopic === "string" ? record.targetTopic.trim() : ""

  if (
    !isAllowedValue(curriculum, EXAM_CURRICULA) ||
    !isAllowedValue(difficulty, PRACTICE_DIFFICULTIES) ||
    !isAllowedValue(questionType, EXAM_QUESTION_TYPES) ||
    !isAllowedExamLength(numericExamLength)
  ) {
    return null
  }

  return {
    curriculum,
    examLength: numericExamLength,
    difficulty,
    questionType,
    ...(targetTopic ? { targetTopic } : {}),
  }
}

function parseDiagnosticRequest(body: unknown): DiagnosticRequest | null {
  const record = body as Record<string, unknown>
  const curriculum = record.curriculum
  const numericQuestionCount =
    typeof record.questionCount === "string" ? Number(record.questionCount) : record.questionCount

  if (
    !isAllowedValue(curriculum, DIAGNOSTIC_CURRICULA) ||
    !isAllowedDiagnosticCount(numericQuestionCount)
  ) {
    return null
  }

  return {
    curriculum,
    questionCount: numericQuestionCount,
  }
}

function parseRecoveryRequest(body: unknown): RecoveryRequest | null {
  const record = body as Record<string, unknown>
  const rawPlan = Array.isArray(record.plan) ? record.plan : null
  if (!rawPlan || rawPlan.length < 2 || rawPlan.length > 3) return null

  const plan = rawPlan.map((item) => {
    if (!item || typeof item !== "object") return null
    const itemRecord = item as Record<string, unknown>
    const topic = itemRecord.topic
    const difficulty = itemRecord.difficulty
    const count = typeof itemRecord.count === "string" ? Number(itemRecord.count) : itemRecord.count
    const weaknesses = Array.isArray(itemRecord.weaknesses)
      ? itemRecord.weaknesses
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 6)
      : []

    if (
      !isAllowedValue(topic, PRACTICE_TOPICS) ||
      !isAllowedValue(difficulty, PRACTICE_DIFFICULTIES) ||
      !Number.isInteger(count) ||
      typeof count !== "number" ||
      count < 1 ||
      count > RECOVERY_QUESTION_COUNT
    ) {
      return null
    }

    return { topic, difficulty, count, weaknesses }
  })

  if (plan.some((item) => item === null)) return null
  const normalizedPlan = plan as RecoveryPlanItem[]
  const total = normalizedPlan.reduce((sum, item) => sum + item.count, 0)
  if (total !== RECOVERY_QUESTION_COUNT) return null

  return { plan: normalizedPlan }
}

function topicGuidance(topic: string): string {
  switch (topic) {
    case "Functional group identification":
    case "Functional Group Identification":
      return "Seed concepts: alcohols, amines, aldehydes, ketones, carboxylic acids, esters, amides, haloalkanes, and alkenes."
    case "Hybridization":
      return "Seed concepts: sp, sp2, sp3, sp3d, sp3d2; examples CO2, BF3, CH4, NH3, H2O, PCl5, SF6, XeF4."
    case "VSEPR geometry":
    case "VSEPR Geometry":
      return "Seed concepts: linear, trigonal planar, tetrahedral, trigonal pyramidal, bent, trigonal bipyramidal, octahedral, square planar."
    case "Periodic trends":
    case "Periodic Trends":
      return "Seed concepts: atomic radius, electronegativity, first ionization energy, electron affinity; compare across periods and groups."
    case "Thermodynamics":
      return "Seed concepts: enthalpy, entropy, Gibbs free energy, Hess Law, calorimetry, spontaneity, and heat transfer."
    case "Electron configuration":
    case "Electron Configuration":
      return "Seed concepts: noble gas shorthand, orbital filling, Aufbau/Hund/Pauli, and common exceptions such as Cr and Cu when appropriate."
    case "IR spectroscopy peak identification":
    case "IR Spectroscopy":
      return "Seed concepts: broad O-H around 3200-3600 cm^-1, C=O around 1650-1750 cm^-1, N-H around 3300 cm^-1, C-H regions, and fingerprint region concept."
    case "Kinetics":
      return "Seed concepts: rate laws, reaction order, activation energy, mechanisms, and collision theory."
    case "Equilibrium":
      return "Seed concepts: equilibrium constants, reaction quotient, Le Chatelier's principle, and ICE-table reasoning."
    case "Acids and Bases":
      return "Seed concepts: pH, pKa, strong and weak acids/bases, buffers, titrations, and conjugate pairs."
    case "Bonding":
      return "Seed concepts: ionic bonding, covalent bonding, polarity, Lewis structures, sigma bonds, and pi bonds."
    case "Stoichiometry":
      return "Seed concepts: mole calculations, limiting reagents, percent yield, empirical formulas, and balanced equations."
    default:
      return "Use accurate chemistry examples suitable for the selected curriculum style."
  }
}

function diagnosticTopicGuidance(): string {
  return DIAGNOSTIC_TOPICS.map((topic) => {
    const subtopics = getSubtopicsForTopic(topic)
    return `${topic}: ${subtopics.join(", ") || "core chemistry concepts"}`
  }).join("\n")
}

function buildPracticePrompt(request: PracticeRequest): string {
  const subtopics = getSubtopicsForTopic(request.topic)
  return [
    `Generate exactly ${request.questionCount} original ${request.questionType} chemistry practice question${request.questionCount === 1 ? "" : "s"}.`,
    `Topic: ${request.topic}. Difficulty: ${request.difficulty}. Curriculum style: ${request.curriculumStyle}.`,
    topicGuidance(request.topic),
    "Produce original questions only.",
    "Do not copy official exam-board, university, or past-paper questions.",
    "Do not mention being based on past papers.",
    "Avoid ambiguous wording.",
    "Use clean formulas with plain text or Unicode subscripts where possible.",
    "Keep questions suitable for the selected curriculum style and difficulty.",
    "For multiple choice, create exactly four choices labeled A, B, C, D with exactly one answer correct.",
    "Multiple choice distractors should reflect realistic misconceptions.",
    "For short answer, make the correctAnswer an expected student answer and explain the marking logic in the explanation.",
    "For explanation prompts, make the correctAnswer a concise model explanation and include the most important key points in the explanation.",
    `Every question must include a meaningful subtopic. Allowed subtopics for this topic: ${subtopics.join(", ") || "a concise chemistry concept"}.`,
    "Return valid JSON only, with no markdown and no surrounding prose.",
    "Return this exact top-level shape:",
    '{"questions":[{"id":"q1","topic":"...","subtopic":"...","questionType":"...","difficulty":"...","curriculumStyle":"...","question":"...","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correctAnswer":"A","explanation":"...","misconceptionNote":"..."}]}',
    "For non-multiple-choice questions, use an empty choices array and put the expected answer in correctAnswer.",
  ].join("\n")
}

function buildRecoveryPrompt(request: RecoveryRequest): string {
  const distribution = request.plan
    .map((item) => {
      const weaknessText = item.weaknesses?.length
        ? ` focusing on: ${item.weaknesses.join(", ")}`
        : ""
      return `${item.count} question${item.count === 1 ? "" : "s"} on ${item.topic}${weaknessText} at ${item.difficulty} difficulty`
    })
    .join("; ")

  return [
    `Generate exactly ${RECOVERY_QUESTION_COUNT} original multiple choice chemistry recovery questions.`,
    `Distribution: ${distribution}.`,
    "This is an adaptive recovery session based on a student's weak concepts.",
    "Use the requested topic distribution exactly.",
    "When weaknesses are provided, target those subtopics before broader review.",
    "Do not repeat identical questions or the same concept wording.",
    "Return questions in the same order as the distribution: all weakest-topic questions first, then second-weakest if present, then review.",
    "For each question, set topic to the matching requested topic, subtopic to the matching weak concept when possible, and difficulty to the matching requested difficulty.",
    "Create exactly four choices labeled A, B, C, D with exactly one answer correct.",
    "Distractors should target realistic misconceptions for the requested topic and difficulty.",
    "Keep wording original, concise, and educational.",
    "Do not copy official exam-board, university, or past-paper questions.",
    "Do not mention being based on past papers.",
    "Return valid JSON only, with no markdown and no surrounding prose.",
    "Return this exact top-level shape:",
    '{"questions":[{"id":"q1","topic":"...","subtopic":"...","questionType":"Multiple choice","difficulty":"...","curriculumStyle":"Recovery Mode","question":"...","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correctAnswer":"A","explanation":"...","misconceptionNote":"..."}]}',
  ].join("\n")
}

function buildExamPrompt(request: ExamRequest): string {
  const typeRule =
    request.questionType === "Multiple Choice Only"
      ? "Every question must have type multiple_choice."
      : request.questionType === "Short Answer Only"
        ? "Every question must have type short_answer."
        : "Use a useful mix of multiple_choice and short_answer questions."

  const targetRule = request.targetTopic
    ? `This is a recovery exam focused on this topic: ${request.targetTopic}. Keep every question connected to that topic.`
    : "Cover a balanced spread of core chemistry topics suitable for the selected curriculum."

  return [
    `Generate exactly ${request.examLength} original chemistry practice exam questions.`,
    `Curriculum: ${request.curriculum}. Difficulty: ${request.difficulty}. Question type mode: ${request.questionType}.`,
    targetRule,
    typeRule,
    "Questions are AI-generated educational material, not official exam-board or university material.",
    "Do not mention past papers, official exams, or copied source material.",
    "For multiple_choice questions, choices must be exactly four strings and correctAnswer must be A, B, C, D, or the exact correct choice text.",
    "For short_answer questions, choices must be an empty array and correctAnswer must contain the expected answer.",
    "Every question must include questionNumber, type, topic, subtopic, question, choices, correctAnswer, explanation.",
    "Use concise topic and subtopic fields for progress tracking.",
    "Keep explanations concise enough that the whole exam fits in JSON.",
    "Return valid JSON only in this exact shape:",
    '{"title":"Practice Midterm","questions":[{"questionNumber":1,"type":"multiple_choice","topic":"Stoichiometry","subtopic":"Limiting reagent","question":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","explanation":"..."}]}',
  ].join("\n")
}

function buildDiagnosticPrompt(request: DiagnosticRequest): string {
  return [
    `Generate exactly ${request.questionCount} original multiple choice chemistry diagnostic questions.`,
    `Curriculum: ${request.curriculum}. Difficulty mode: Automatic. Question type: Mixed diagnostic multiple choice.`,
    "A single generated diagnostic counts as one AI request, so make this complete in one response.",
    "Sample across these topics and subtopics. Do not ignore any major area when the question count allows broad coverage:",
    diagnosticTopicGuidance(),
    "Use a mix of Introductory, Intermediate, and Advanced difficulties.",
    "Every question must include id, questionNumber, topic, subtopic, difficulty, questionType, question, choices, correctAnswer, and explanation.",
    "Every questionType must be exactly Multiple Choice.",
    "Each choices array must contain exactly four strings labeled A, B, C, D or easily normalizable to A-D.",
    "correctAnswer must be A, B, C, D, or the exact correct choice text.",
    "Explanations should be concise and useful for placement feedback.",
    "Questions are AI-generated educational material, not official exam-board or university material.",
    "Do not mention past papers, official exams, or copied source material.",
    "Return valid JSON only in this exact shape:",
    '{"title":"ARSHLAB Diagnostic Assessment","curriculum":"...","questions":[{"id":"q1","questionNumber":1,"topic":"Periodic Trends","subtopic":"Ionization Energy","difficulty":"Introductory","questionType":"Multiple Choice","question":"...","choices":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"B","explanation":"..."}]}',
  ].join("\n")
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === "string" ? value.trim() : ""
}

function parseGeneratedJson(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? text
  const objectStart = candidate.indexOf("{")
  const arrayStart = candidate.indexOf("[")
  const starts = [objectStart, arrayStart].filter((index) => index >= 0)
  if (starts.length === 0) return null
  const start = Math.min(...starts)
  const end = candidate.lastIndexOf(candidate[start] === "[" ? "]" : "}")
  if (start === -1 || end <= start) return null

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

function normalizeChoices(value: unknown): PracticeChoice[] | null {
  if (!Array.isArray(value) || value.length !== 4) return null
  const expectedLabels = ["A", "B", "C", "D"]
  const choices = value.map((item, index) => {
    if (typeof item === "string") {
      const text = item.trim().replace(/^[A-D][.)]\s*/i, "")
      return text ? { label: expectedLabels[index], text } : null
    }
    if (!item || typeof item !== "object") return null
    const record = item as Record<string, unknown>
    const label = stringField(record, "label").toUpperCase()
    const text = stringField(record, "text")
    if (label !== expectedLabels[index] || !text) return null
    return { label, text }
  })

  if (choices.some((choice) => choice === null)) return null
  return choices as PracticeChoice[]
}

function answerMatchesChoices(correctAnswer: string, choices: PracticeChoice[]): boolean {
  const normalized = correctAnswer.trim().toLowerCase()
  return choices.some((choice) => {
    const label = choice.label.toLowerCase()
    const text = choice.text.trim().toLowerCase()
    return normalized === label || normalized === text || normalized === `${label}. ${text}`
  })
}

function validatePracticeSet(data: unknown, request: PracticeRequest): PracticeSet | null {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  const rawQuestions = Array.isArray(record.questions) ? record.questions : Array.isArray(data) ? data : null
  if (!rawQuestions || rawQuestions.length !== request.questionCount) return null

  const questions = rawQuestions.map((item, index) => {
    if (!item || typeof item !== "object") return null
    const questionRecord = item as Record<string, unknown>
    const questionText = stringField(questionRecord, "question") || stringField(questionRecord, "prompt")
    const correctAnswer =
      stringField(questionRecord, "correctAnswer") ||
      stringField(questionRecord, "answer") ||
      stringField(questionRecord, "correctChoice")
    const explanation = stringField(questionRecord, "explanation")
    const misconceptionNote =
      stringField(questionRecord, "misconceptionNote") ||
      stringField(questionRecord, "misconceptionNotes")
    const subtopic = inferSubtopicForTopic(request.topic, questionText, stringField(questionRecord, "subtopic"))

    if (!questionText || !correctAnswer || !explanation) return null

    const question: PracticeQuestion = {
      id: stringField(questionRecord, "id") || `q${index + 1}`,
      topic: request.topic,
      subtopic,
      questionType: request.questionType,
      difficulty: request.difficulty,
      curriculumStyle: request.curriculumStyle,
      question: questionText,
      choices: [],
      correctAnswer,
      explanation,
    }

    if (misconceptionNote) question.misconceptionNote = misconceptionNote

    if (request.questionType === "Multiple choice") {
      const choices = normalizeChoices(questionRecord.choices)
      if (!choices || !answerMatchesChoices(correctAnswer, choices)) return null
      question.choices = choices
    }

    return question
  })

  if (questions.some((question) => question === null)) return null
  return { questions: questions as PracticeQuestion[] }
}

function validateRecoverySet(data: unknown, request: RecoveryRequest): PracticeSet | null {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  const rawQuestions = Array.isArray(record.questions) ? record.questions : Array.isArray(data) ? data : null
  if (!rawQuestions || rawQuestions.length !== RECOVERY_QUESTION_COUNT) return null

  const slots = request.plan.flatMap((item) =>
    Array.from({ length: item.count }, (_unused, index) => ({
      topic: item.topic,
      difficulty: item.difficulty,
      weakness: item.weaknesses?.[index % Math.max(1, item.weaknesses.length)],
    })),
  )

  const questions = rawQuestions.map((item, index) => {
    if (!item || typeof item !== "object") return null
    const questionRecord = item as Record<string, unknown>
    const questionText = stringField(questionRecord, "question") || stringField(questionRecord, "prompt")
    const correctAnswer =
      stringField(questionRecord, "correctAnswer") ||
      stringField(questionRecord, "answer") ||
      stringField(questionRecord, "correctChoice")
    const explanation = stringField(questionRecord, "explanation")
    const misconceptionNote =
      stringField(questionRecord, "misconceptionNote") ||
      stringField(questionRecord, "misconceptionNotes")
    const slot = slots[index]

    if (!slot || !questionText || !correctAnswer || !explanation) return null

    const choices = normalizeChoices(questionRecord.choices)
    if (!choices || !answerMatchesChoices(correctAnswer, choices)) return null
    const subtopic = inferSubtopicForTopic(
      slot.topic,
      questionText,
      stringField(questionRecord, "subtopic") || slot.weakness,
    )

    const question: PracticeQuestion = {
      id: stringField(questionRecord, "id") || `recovery-q${index + 1}`,
      topic: slot.topic,
      subtopic,
      questionType: "Multiple choice",
      difficulty: slot.difficulty,
      curriculumStyle: "Recovery Mode",
      question: questionText,
      choices,
      correctAnswer,
      explanation,
    }

    if (misconceptionNote) question.misconceptionNote = misconceptionNote
    return question
  })

  if (questions.some((question) => question === null)) return null
  return { questions: questions as PracticeQuestion[] }
}

function normalizeExamChoices(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const choices = value.map((choice) => {
    if (typeof choice === "string") return choice.trim()
    if (choice && typeof choice === "object") {
      const record = choice as Record<string, unknown>
      const label = stringField(record, "label")
      const text = stringField(record, "text")
      return [label, text].filter(Boolean).join(". ").trim()
    }
    return ""
  })

  if (choices.some((choice) => !choice)) return null
  return choices
}

function examAnswerMatchesChoices(correctAnswer: string, choices: string[]): boolean {
  const normalizedAnswer = correctAnswer.trim().toLowerCase()
  return choices.some((choice, index) => {
    const label = String.fromCharCode(65 + index).toLowerCase()
    const normalizedChoice = choice.trim().toLowerCase()
    const withoutLabel = normalizedChoice.replace(/^[a-d][.)]\s*/i, "")
    return (
      normalizedAnswer === label ||
      normalizedAnswer === normalizedChoice ||
      normalizedAnswer === withoutLabel ||
      normalizedAnswer === `${label}. ${withoutLabel}`
    )
  })
}

function validateGeneratedExam(data: unknown, request: ExamRequest): GeneratedExam | null {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  const title = stringField(record, "title") || "Practice Exam"
  const rawQuestions = Array.isArray(record.questions) ? record.questions : null

  if (!rawQuestions || rawQuestions.length !== request.examLength) return null

  const questions = rawQuestions.map((item, index) => {
    if (!item || typeof item !== "object") return null
    const questionRecord = item as Record<string, unknown>
    const rawType = stringField(questionRecord, "type")
    const type: ExamQuestionType =
      rawType === "multiple_choice" || rawType === "short_answer"
        ? rawType
        : request.questionType === "Short Answer Only"
          ? "short_answer"
          : "multiple_choice"

    if (request.questionType === "Multiple Choice Only" && type !== "multiple_choice") return null
    if (request.questionType === "Short Answer Only" && type !== "short_answer") return null

    const question = stringField(questionRecord, "question")
    const correctAnswer = stringField(questionRecord, "correctAnswer") || stringField(questionRecord, "answer")
    const explanation = stringField(questionRecord, "explanation")
    const topic = stringField(questionRecord, "topic") || request.targetTopic || "General chemistry exam"
    const subtopic = inferSubtopicForTopic(topic, question, stringField(questionRecord, "subtopic"))

    if (!question || !correctAnswer || !explanation) return null

    const choices = normalizeExamChoices(questionRecord.choices)
    if (type === "multiple_choice") {
      if (!choices || choices.length !== 4 || !examAnswerMatchesChoices(correctAnswer, choices)) return null
    }

    return {
      questionNumber: index + 1,
      type,
      topic,
      subtopic,
      question,
      choices: type === "multiple_choice" ? choices ?? [] : [],
      correctAnswer,
      explanation,
    }
  })

  if (questions.some((question) => question === null)) return null
  return { title, questions: questions as ExamQuestion[] }
}

function normalizeDiagnosticDifficulty(value: string): string | null {
  return PRACTICE_DIFFICULTIES.find(
    (difficulty) => difficulty.toLowerCase() === value.trim().toLowerCase(),
  ) ?? null
}

function normalizeDiagnosticQuestionType(value: string): "Multiple Choice" | null {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ")
  return normalized === "multiple choice" ? "Multiple Choice" : null
}

function validateGeneratedDiagnostic(data: unknown, request: DiagnosticRequest): GeneratedDiagnostic | null {
  if (!data || typeof data !== "object") return null
  const record = data as Record<string, unknown>
  const title = stringField(record, "title")
  const curriculum = stringField(record, "curriculum") || request.curriculum
  const rawQuestions = Array.isArray(record.questions) ? record.questions : null

  if (!title || !rawQuestions || rawQuestions.length !== request.questionCount) return null

  const questions = rawQuestions.map((item, index) => {
    if (!item || typeof item !== "object") return null
    const questionRecord = item as Record<string, unknown>
    const topic = stringField(questionRecord, "topic")
    const subtopicRaw = stringField(questionRecord, "subtopic")
    const difficulty = normalizeDiagnosticDifficulty(stringField(questionRecord, "difficulty"))
    const questionType = normalizeDiagnosticQuestionType(stringField(questionRecord, "questionType"))
    const question = stringField(questionRecord, "question") || stringField(questionRecord, "prompt")
    const correctAnswer = stringField(questionRecord, "correctAnswer") || stringField(questionRecord, "answer")
    const explanation = stringField(questionRecord, "explanation")

    if (!topic || !subtopicRaw || !difficulty || !questionType || !question || !correctAnswer || !explanation) {
      return null
    }

    const choices = normalizeExamChoices(questionRecord.choices)
    if (!choices || choices.length !== 4 || !examAnswerMatchesChoices(correctAnswer, choices)) return null

    return {
      id: stringField(questionRecord, "id") || `q${index + 1}`,
      questionNumber: index + 1,
      topic,
      subtopic: inferSubtopicForTopic(topic, question, subtopicRaw),
      difficulty,
      questionType,
      question,
      choices,
      correctAnswer,
      explanation,
    }
  })

  if (questions.some((question) => question === null)) return null
  return {
    title,
    curriculum,
    questions: questions as DiagnosticQuestion[],
  }
}

export async function POST(request: NextRequest) {
  if (process.env.ARSHLAB_AI_ENABLED !== "true") {
    return unavailable()
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return unavailable()
  }

  const model = process.env.ARSHLAB_AI_MODEL ?? "openrouter/free"
  const siteUrl = process.env.ARSHLAB_SITE_URL ?? "https://arshlab.vercel.app"
  if (!isAllowedFreeModel(model)) {
    return NextResponse.json(
      { ok: false, message: "Configured AI model is not allowed for ARSHLAB free alpha." },
      { status: 400 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request body." }, { status: 400 })
  }

  const task = typeof (body as { task?: unknown }).task === "string"
    ? (body as { task: string }).task
    : "assistant"
  if (!["assistant", "practice-generator", "exam-generator", "recovery-generator", "diagnostic-generator"].includes(task)) {
    return NextResponse.json({ ok: false, message: "Invalid AI task." }, { status: 400 })
  }

  const practiceRequest = task === "practice-generator" ? parsePracticeRequest(body) : null
  const examRequest = task === "exam-generator" ? parseExamRequest(body) : null
  const recoveryRequest = task === "recovery-generator" ? parseRecoveryRequest(body) : null
  const diagnosticRequest = task === "diagnostic-generator" ? parseDiagnosticRequest(body) : null
  if (task === "practice-generator" && !practiceRequest) {
    return NextResponse.json({ ok: false, message: "Invalid practice generator request." }, { status: 400 })
  }
  if (task === "exam-generator" && !examRequest) {
    return NextResponse.json({ ok: false, message: "Invalid exam generator request." }, { status: 400 })
  }
  if (task === "recovery-generator" && !recoveryRequest) {
    return NextResponse.json({ ok: false, message: "Invalid recovery generator request." }, { status: 400 })
  }
  if (task === "diagnostic-generator" && !diagnosticRequest) {
    return NextResponse.json({ ok: false, message: "Invalid diagnostic generator request." }, { status: 400 })
  }

  const prompt = recoveryRequest
    ? buildRecoveryPrompt(recoveryRequest)
    : examRequest
    ? buildExamPrompt(examRequest)
    : diagnosticRequest
      ? buildDiagnosticPrompt(diagnosticRequest)
      : practiceRequest
        ? buildPracticePrompt(practiceRequest)
        : typeof (body as { prompt?: unknown }).prompt === "string"
          ? (body as { prompt: string }).prompt.trim()
          : ""

  if (!prompt) {
    return NextResponse.json({ ok: false, message: "Enter a chemistry question first." }, { status: 400 })
  }

  if (!practiceRequest && !examRequest && !recoveryRequest && !diagnosticRequest && prompt.length > MAX_PROMPT_LENGTH) {
    return NextResponse.json(
      { ok: false, message: `Prompt is too long. Keep it under ${MAX_PROMPT_LENGTH} characters.` },
      { status: 400 },
    )
  }

  const userId = await getUserId()
  const guestLimit = getNumberEnv("ARSHLAB_AI_DAILY_LIMIT_GUEST", 3)
  const userLimit = getNumberEnv("ARSHLAB_AI_DAILY_LIMIT_USER", 10)
  const limitResult = userId
    ? await checkUserLimit(userId, userLimit)
    : checkGuestLimit(request, guestLimit)

  if (!limitResult.allowed) {
    if ("limited" in limitResult && limitResult.limited) {
      return NextResponse.json(
        { ok: false, limited: true, message: "Daily AI assistant limit reached." },
        { status: 429 },
      )
    }
    return unavailable()
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": siteUrl,
        "X-Title": "ARSHLAB",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: recoveryRequest
              ? buildRecoverySystemPrompt()
              : examRequest
              ? buildExamSystemPrompt()
              : diagnosticRequest
                ? buildDiagnosticSystemPrompt()
                : practiceRequest
                  ? buildPracticeSystemPrompt()
                  : buildSystemPrompt(),
          },
          { role: "user", content: prompt },
        ],
        max_tokens: diagnosticRequest
          ? DIAGNOSTIC_MAX_OUTPUT_TOKENS
          : examRequest
            ? EXAM_MAX_OUTPUT_TOKENS
            : practiceRequest || recoveryRequest
              ? PRACTICE_MAX_OUTPUT_TOKENS
              : MAX_OUTPUT_TOKENS,
        temperature: 0.4,
      }),
    })

    if ([402, 404, 429].includes(response.status) || response.status >= 500) {
      return unavailable(response.status === 429 ? 429 : 503)
    }

    if (!response.ok) {
      return unavailable()
    }

    const data = await response.json()
    const answer =
      typeof data?.choices?.[0]?.message?.content === "string"
        ? data.choices[0].message.content.trim()
        : ""

    if (!answer) return unavailable()

    if (examRequest) {
      const generatedJson = parseGeneratedJson(answer)
      const exam = validateGeneratedExam(generatedJson, examRequest)

      if (!exam) {
        return NextResponse.json(
          {
            ok: false,
            validationFailed: true,
            message: "Generated exam did not pass validation. Try again.",
          },
          { status: 422 },
        )
      }

      return NextResponse.json({
        ok: true,
        exam,
        remaining: limitResult.remaining,
        disclaimer:
          "Questions are AI-generated educational material. Verify important answers independently.",
      })
    }

    if (diagnosticRequest) {
      const generatedJson = parseGeneratedJson(answer)
      const diagnostic = validateGeneratedDiagnostic(generatedJson, diagnosticRequest)

      if (!diagnostic) {
        return NextResponse.json(
          {
            ok: false,
            validationFailed: true,
            message: "Generated diagnostic did not pass validation. Try again.",
          },
          { status: 422 },
        )
      }

      return NextResponse.json({
        ok: true,
        diagnostic,
        remaining: limitResult.remaining,
        disclaimer:
          "Diagnostic questions are AI-generated educational material. Verify important answers independently.",
      })
    }

    if (recoveryRequest) {
      const generatedJson = parseGeneratedJson(answer)
      const practiceSet = validateRecoverySet(generatedJson, recoveryRequest)

      if (!practiceSet) {
        return NextResponse.json(
          {
            ok: false,
            validationFailed: true,
            message: "Generated recovery session did not pass validation. Try again.",
          },
          { status: 422 },
        )
      }

      return NextResponse.json({
        ok: true,
        practiceSet,
        remaining: limitResult.remaining,
        disclaimer:
          "Generated recovery questions are original educational materials and may contain mistakes. Verify important answers independently.",
      })
    }

    if (practiceRequest) {
      const generatedJson = parseGeneratedJson(answer)
      const practiceSet = validatePracticeSet(generatedJson, practiceRequest)

      if (!practiceSet) {
        return NextResponse.json(
          {
            ok: false,
            validationFailed: true,
            message: "Generated practice set did not pass validation. Try again.",
          },
          { status: 422 },
        )
      }

      return NextResponse.json({
        ok: true,
        practiceSet,
        remaining: limitResult.remaining,
        disclaimer:
          "Generated practice questions are original educational materials and may contain mistakes. Verify important answers independently.",
      })
    }

    return NextResponse.json({
      ok: true,
      answer,
      remaining: limitResult.remaining,
      disclaimer: "AI answers may be wrong. Verify important chemistry answers independently.",
    })
  } catch {
    return unavailable()
  }
}
