"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, Bot, CheckCircle2, FlaskConical, GraduationCap, Send, ShieldCheck } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"

const GUEST_USAGE_KEY = "arshlab-ai-guest-usage"
const GUEST_LIMIT = 3
const MAX_PROMPT_LENGTH = 1600
const quickPrompts = [
  "Why is BF3 trigonal planar?",
  "Explain SN1 vs SN2.",
  "Why is NH3 sp3 but trigonal pyramidal?",
  "What does a broad IR peak around 3300 cm-1 mean?",
  "Generate 3 stoichiometry practice questions.",
]

interface GuestUsage {
  date: string
  count: number
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function readGuestUsage(): GuestUsage {
  if (typeof window === "undefined") return { date: todayKey(), count: 0 }
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_USAGE_KEY) ?? "null") as GuestUsage | null
    if (!parsed || parsed.date !== todayKey()) return { date: todayKey(), count: 0 }
    return parsed
  } catch {
    return { date: todayKey(), count: 0 }
  }
}

function writeGuestUsage(usage: GuestUsage) {
  try {
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage))
  } catch {
    // Local gate is best-effort; the server still applies a conservative guest gate.
  }
}

export function AiAssistantClient() {
  const [prompt, setPrompt] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [guestUsage, setGuestUsage] = useState<GuestUsage>({ date: todayKey(), count: 0 })

  useEffect(() => {
    setGuestUsage(readGuestUsage())

    if (!isSupabaseConfigured()) return
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [])

  const guestRemaining = useMemo(
    () => Math.max(0, GUEST_LIMIT - guestUsage.count),
    [guestUsage.count],
  )
  const promptTooLong = prompt.length > MAX_PROMPT_LENGTH

  async function askAssistant(nextPrompt?: string) {
    const value = (nextPrompt ?? prompt).trim()
    if (!value || loading) return

    if (!isLoggedIn && guestRemaining <= 0) {
      setError("Daily guest AI assistant limit reached. Sign in for a higher limit.")
      return
    }

    if (value.length > MAX_PROMPT_LENGTH) {
      setError(`Prompt is too long. Keep it under ${MAX_PROMPT_LENGTH} characters.`)
      return
    }

    setPrompt(value)
    setLoading(true)
    setError(null)
    setAnswer("")

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok) {
        setError(data.message || "AI Assistant temporarily unavailable")
        setLoading(false)
        return
      }

      setAnswer(data.answer)
      setRemaining(typeof data.remaining === "number" ? data.remaining : null)

      if (!isLoggedIn) {
        const nextUsage = { date: todayKey(), count: guestUsage.count + 1 }
        setGuestUsage(nextUsage)
        writeGuestUsage(nextUsage)
      }
    } catch {
      setError("AI Assistant temporarily unavailable")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">AI Chemistry Assistant</h1>
              <p className="text-muted-foreground">Free-model-only alpha with hard zero-cost guardrails</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Ask short chemistry questions, get help using ARSHLAB tools, or generate small practice prompts.
            Conversations are not saved in this alpha.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FlaskConical className="h-5 w-5" />
                    Ask A Chemistry Question
                  </CardTitle>
                  <Badge variant="secondary">
                    {isLoggedIn
                      ? remaining === null
                        ? "Signed in"
                        : `${remaining} account requests left`
                      : `${guestRemaining} guest requests left today`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(event) => {
                    setPrompt(event.target.value)
                    setError(null)
                  }}
                  placeholder="Example: Why is NH3 sp3 but trigonal pyramidal?"
                  className="min-h-36 rounded-xl text-base"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className={promptTooLong ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                    {prompt.length}/{MAX_PROMPT_LENGTH} characters
                  </p>
                  <Button
                    onClick={() => askAssistant()}
                    disabled={loading || promptTooLong || !prompt.trim() || (!isLoggedIn && guestRemaining <= 0)}
                    className="h-11 rounded-xl"
                  >
                    <Send className="h-4 w-4" />
                    {loading ? "Thinking..." : "Ask Assistant"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.includes("temporarily unavailable") ? "AI Assistant temporarily unavailable" : "Request stopped"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {answer && (
              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle2 className="h-5 w-5" />
                    Assistant Response
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{answer}</div>
                  <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                    AI answers may be wrong. Verify important chemistry answers independently.
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {quickPrompts.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => askAssistant(item)}
                  disabled={loading || (!isLoggedIn && guestRemaining <= 0)}
                  className="rounded-2xl border border-border bg-card/80 p-4 text-left text-sm transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.main>

          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Zero-Cost Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Only OpenRouter models explicitly configured as free are allowed.</p>
                <p>The browser never sends a model ID and never sees the OpenRouter API key.</p>
                <p>If no free model is available, ARSHLAB stops and shows an unavailable message.</p>
                <p>No paid fallback, subscriptions, file uploads, image analysis, or saved AI chat history.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-dashed">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    Use this for concept explanations, ARSHLAB tool help, small practice questions, and chemistry
                    reasoning. It is an educational approximation, not official exam-board material.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}
