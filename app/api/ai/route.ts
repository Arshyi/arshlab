import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const UNAVAILABLE_MESSAGE = "AI Assistant temporarily unavailable"
const MAX_PROMPT_LENGTH = 1600
const MAX_OUTPUT_TOKENS = 500
const guestUsage = new Map<string, { date: string; count: number }>()

interface AiUsageRow {
  id: string
  request_count: number
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

  const prompt = typeof (body as { prompt?: unknown }).prompt === "string"
    ? (body as { prompt: string }).prompt.trim()
    : ""

  if (!prompt) {
    return NextResponse.json({ ok: false, message: "Enter a chemistry question first." }, { status: 400 })
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
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
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: prompt },
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
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
