import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UNAVAILABLE_MESSAGE = "AI Assistant temporarily unavailable"
const MAX_PROMPT_LENGTH = 1600
const MAX_OUTPUT_TOKENS = 500
const PRACTICE_MAX_OUTPUT_TOKENS = 1800
const guestUsage = new Map<string, { date: string; count: number }>()

const PRACTICE_TOPICS = [
  "Functional group identification",
  "Hybridization",
  "VSEPR geometry",
  "Periodic trends",
  "Electron configuration",
  "IR spectroscopy peak identification",
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

const PRACTICE_QUESTION_COUNTS = [1, 3, 5] as const

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
  questionType: string
  difficulty: string
  curriculumStyle: string
  prompt: string
  choices?: PracticeChoice[]
  correctAnswer: string
  explanation: string
  misconceptionNote?: string
}

interface PracticeSet {
  questions: PracticeQuestion[]
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
  return typeof value === "number" && PRACTICE_QUESTION_COUNTS.includes(value as 1 | 3 | 5)
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

function parsePracticeRequest(body: unknown): PracticeRequest | null {
  const record = body as Record<string, unknown>
  const topic = record.topic
  const questionType = record.questionType
  const difficulty = record.difficulty
  const curriculumStyle = record.curriculumStyle
  const numericQuestionCount =
    typeof record.questionCount === "string" ? Number(record.questionCount) : record.questionCount
  const questionCount = isAllowedQuestionCount(numericQuestionCount) ? numericQuestionCount : 1

  if (
    !isAllowedValue(topic, PRACTICE_TOPICS) ||
    !isAllowedValue(questionType, PRACTICE_QUESTION_TYPES) ||
    !isAllowedValue(difficulty, PRACTICE_DIFFICULTIES) ||
    !isAllowedValue(curriculumStyle, PRACTICE_CURRICULUM_STYLES)
  ) {
    return null
  }

  return { topic, questionType, difficulty, curriculumStyle, questionCount }
}

function topicGuidance(topic: string): string {
  switch (topic) {
    case "Functional group identification":
      return "Seed concepts: alcohols, amines, aldehydes, ketones, carboxylic acids, esters, amides, haloalkanes, and alkenes."
    case "Hybridization":
      return "Seed concepts: sp, sp2, sp3, sp3d, sp3d2; examples CO2, BF3, CH4, NH3, H2O, PCl5, SF6, XeF4."
    case "VSEPR geometry":
      return "Seed concepts: linear, trigonal planar, tetrahedral, trigonal pyramidal, bent, trigonal bipyramidal, octahedral, square planar."
    case "Periodic trends":
      return "Seed concepts: atomic radius, electronegativity, first ionization energy, electron affinity; compare across periods and groups."
    case "Electron configuration":
      return "Seed concepts: noble gas shorthand, orbital filling, Aufbau/Hund/Pauli, and common exceptions such as Cr and Cu when appropriate."
    case "IR spectroscopy peak identification":
      return "Seed concepts: broad O-H around 3200-3600 cm^-1, C=O around 1650-1750 cm^-1, N-H around 3300 cm^-1, C-H regions, and fingerprint region concept."
    default:
      return "Use accurate chemistry examples suitable for the selected curriculum style."
  }
}

function buildPracticePrompt(request: PracticeRequest): string {
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
    "Return valid JSON only, with no markdown and no surrounding prose.",
    "Return this exact top-level shape:",
    '{"questions":[{"id":"q1","topic":"...","questionType":"...","difficulty":"...","curriculumStyle":"...","prompt":"...","choices":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correctAnswer":"A","explanation":"...","misconceptionNote":"..."}]}',
    "For non-multiple-choice questions, use an empty choices array and put the expected answer in correctAnswer.",
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
    const prompt = stringField(questionRecord, "prompt") || stringField(questionRecord, "question")
    const correctAnswer =
      stringField(questionRecord, "correctAnswer") ||
      stringField(questionRecord, "answer") ||
      stringField(questionRecord, "correctChoice")
    const explanation = stringField(questionRecord, "explanation")
    const misconceptionNote =
      stringField(questionRecord, "misconceptionNote") ||
      stringField(questionRecord, "misconceptionNotes")

    if (!prompt || !correctAnswer || !explanation) return null

    const question: PracticeQuestion = {
      id: stringField(questionRecord, "id") || `q${index + 1}`,
      topic: request.topic,
      questionType: request.questionType,
      difficulty: request.difficulty,
      curriculumStyle: request.curriculumStyle,
      prompt,
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
  const practiceRequest = task === "practice-generator" ? parsePracticeRequest(body) : null
  if (task === "practice-generator" && !practiceRequest) {
    return NextResponse.json({ ok: false, message: "Invalid practice generator request." }, { status: 400 })
  }

  const prompt = practiceRequest
    ? buildPracticePrompt(practiceRequest)
    : typeof (body as { prompt?: unknown }).prompt === "string"
      ? (body as { prompt: string }).prompt.trim()
      : ""

  if (!prompt) {
    return NextResponse.json({ ok: false, message: "Enter a chemistry question first." }, { status: 400 })
  }

  if (!practiceRequest && prompt.length > MAX_PROMPT_LENGTH) {
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
          { role: "system", content: practiceRequest ? buildPracticeSystemPrompt() : buildSystemPrompt() },
          { role: "user", content: prompt },
        ],
        max_tokens: practiceRequest ? PRACTICE_MAX_OUTPUT_TOKENS : MAX_OUTPUT_TOKENS,
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
