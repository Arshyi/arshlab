"use client"

import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "./client"

export interface PracticeProgressEntry {
  id: string
  userId: string
  topic: string
  subtopic: string
  difficulty: string
  questionType: string
  correct: boolean
  timestamp: string
}

interface PracticeProgressRow {
  id: string
  user_id: string
  topic: string
  subtopic: string | null
  difficulty: string
  question_type: string | null
  correct: boolean
  timestamp: string
}

export interface ConceptProgressEntry {
  id: string
  userId: string
  topic: string
  subtopic: string
  attempted: number
  correct: number
  mastery: number
  updatedAt: string
}

interface ConceptProgressRow {
  id: string
  user_id: string
  topic: string
  subtopic: string
  attempted: number
  correct: number
  mastery: number
  updated_at: string
}

type ProgressFailureReason = "not-configured" | "not-authenticated" | "supabase-error"

export type ProgressResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; reason: ProgressFailureReason; data?: T }

async function getAuthenticatedClient(): Promise<
  ProgressResult<{ supabase: SupabaseClient; user: User }>
> {
  let supabase: SupabaseClient

  try {
    supabase = createClient()
  } catch {
    return {
      ok: false,
      reason: "not-configured",
      error: "Supabase is not configured for practice progress.",
    }
  }

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return {
      ok: false,
      reason: "not-authenticated",
      error: "Sign in to save practice progress.",
    }
  }

  return { ok: true, data: { supabase, user: data.user } }
}

function mapProgressRow(row: PracticeProgressRow): PracticeProgressEntry {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    subtopic: row.subtopic ?? "General",
    difficulty: row.difficulty,
    questionType: row.question_type ?? "Practice",
    correct: row.correct,
    timestamp: row.timestamp,
  }
}

function mapConceptRow(row: ConceptProgressRow): ConceptProgressEntry {
  return {
    id: row.id,
    userId: row.user_id,
    topic: row.topic,
    subtopic: row.subtopic,
    attempted: row.attempted,
    correct: row.correct,
    mastery: row.mastery,
    updatedAt: row.updated_at,
  }
}

function cleanMetadata(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, 120) : fallback
}

async function updateConceptProgress(input: {
  supabase: SupabaseClient
  userId: string
  topic: string
  subtopic: string
  correct: boolean
}): Promise<ProgressResult<ConceptProgressEntry>> {
  const { data, error } = await input.supabase
    .from("concept_progress")
    .select("*")
    .eq("user_id", input.userId)
    .eq("topic", input.topic)
    .eq("subtopic", input.subtopic)
    .maybeSingle<ConceptProgressRow>()

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  const attempted = (data?.attempted ?? 0) + 1
  const correct = (data?.correct ?? 0) + (input.correct ? 1 : 0)
  const mastery = attempted ? Math.round((correct / attempted) * 100) : 0
  const payload = {
    user_id: input.userId,
    topic: input.topic,
    subtopic: input.subtopic,
    attempted,
    correct,
    mastery,
    updated_at: new Date().toISOString(),
  }

  const query = data
    ? input.supabase.from("concept_progress").update(payload).eq("id", data.id)
    : input.supabase.from("concept_progress").insert(payload)

  const { data: saved, error: saveError } = await query.select("*").single<ConceptProgressRow>()

  if (saveError || !saved) {
    return {
      ok: false,
      reason: "supabase-error",
      error: saveError?.message ?? "Could not update concept progress.",
    }
  }

  return { ok: true, data: mapConceptRow(saved) }
}

export async function addPracticeProgress(input: {
  topic: string
  subtopic?: string
  difficulty: string
  questionType?: string
  correct: boolean
}): Promise<ProgressResult<PracticeProgressEntry>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) {
    return {
      ok: false,
      reason: auth.reason,
      error: auth.error,
    }
  }
  const subtopic = cleanMetadata(input.subtopic, "General")
  const questionType = cleanMetadata(input.questionType, "Practice")

  const { data, error } = await auth.data.supabase
    .from("practice_progress")
    .insert({
      user_id: auth.data.user.id,
      topic: input.topic,
      subtopic,
      difficulty: input.difficulty,
      question_type: questionType,
      correct: input.correct,
    })
    .select("*")
    .single<PracticeProgressRow>()

  if (error || !data) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error?.message ?? "Could not save practice progress.",
    }
  }

  const conceptResult = await updateConceptProgress({
    supabase: auth.data.supabase,
    userId: auth.data.user.id,
    topic: input.topic,
    subtopic,
    correct: input.correct,
  })

  return {
    ok: true,
    data: mapProgressRow(data),
    ...(conceptResult.ok ? {} : { message: `Concept analytics were not updated: ${conceptResult.error}` }),
  }
}

export async function getPracticeProgress(limit = 200): Promise<ProgressResult<PracticeProgressEntry[]>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) {
    return {
      ok: false,
      reason: auth.reason,
      error: auth.error,
    }
  }

  const { data, error } = await auth.data.supabase
    .from("practice_progress")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("timestamp", { ascending: false })
    .limit(limit)
    .returns<PracticeProgressRow[]>()

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  return { ok: true, data: (data ?? []).map(mapProgressRow) }
}

export async function getConceptProgress(limit = 200): Promise<ProgressResult<ConceptProgressEntry[]>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) {
    return {
      ok: false,
      reason: auth.reason,
      error: auth.error,
    }
  }

  const { data, error } = await auth.data.supabase
    .from("concept_progress")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("mastery", { ascending: true })
    .order("attempted", { ascending: false })
    .limit(limit)
    .returns<ConceptProgressRow[]>()

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  return { ok: true, data: (data ?? []).map(mapConceptRow) }
}
