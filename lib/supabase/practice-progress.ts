"use client"

import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "./client"

export interface PracticeProgressEntry {
  id: string
  userId: string
  topic: string
  difficulty: string
  correct: boolean
  timestamp: string
}

interface PracticeProgressRow {
  id: string
  user_id: string
  topic: string
  difficulty: string
  correct: boolean
  timestamp: string
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
    difficulty: row.difficulty,
    correct: row.correct,
    timestamp: row.timestamp,
  }
}

export async function addPracticeProgress(input: {
  topic: string
  difficulty: string
  correct: boolean
}): Promise<ProgressResult<PracticeProgressEntry>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) return auth

  const { data, error } = await auth.data.supabase
    .from("practice_progress")
    .insert({
      user_id: auth.data.user.id,
      topic: input.topic,
      difficulty: input.difficulty,
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

  return { ok: true, data: mapProgressRow(data) }
}

export async function getPracticeProgress(limit = 200): Promise<ProgressResult<PracticeProgressEntry[]>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) return auth

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
