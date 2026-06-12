"use client"

import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "./client"
import {
  DEFAULT_CURRICULUM_ID,
  isCurriculumId,
  type CurriculumId,
} from "@/lib/curriculum/curriculum-registry"

export interface UserProfile {
  userId: string
  xp: number
  dailyGoal: 5 | 10 | 20
  completedSessions: number
  completedExams: number
  completedDiagnostics: number
  lastDiagnosticAt: string | null
  lastDiagnosticAccuracy: number
  previousDiagnosticAccuracy: number | null
  bestDiagnosticAccuracy: number
  selectedCurriculum: CurriculumId
  curriculumStartedAt: string | null
  curriculumUpdatedAt: string | null
  createdAt: string
  updatedAt: string
}

interface UserProfileRow {
  user_id: string
  xp: number
  daily_goal: number
  completed_sessions: number
  completed_exams: number
  completed_diagnostics: number | null
  last_diagnostic_at: string | null
  last_diagnostic_accuracy: number | null
  previous_diagnostic_accuracy: number | null
  best_diagnostic_accuracy: number | null
  selected_curriculum: string | null
  curriculum_started_at: string | null
  curriculum_updated_at: string | null
  created_at: string
  updated_at: string
}

type ProfileFailureReason = "not-configured" | "not-authenticated" | "supabase-error"

export type ProfileResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; reason: ProfileFailureReason; data?: T }

async function getAuthenticatedClient(): Promise<
  ProfileResult<{ supabase: SupabaseClient; user: User }>
> {
  let supabase: SupabaseClient

  try {
    supabase = createClient()
  } catch {
    return {
      ok: false,
      reason: "not-configured",
      error: "Supabase is not configured for study profile data.",
    }
  }

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return {
      ok: false,
      reason: "not-authenticated",
      error: "Sign in to save XP, daily goals, and achievements.",
    }
  }

  return { ok: true, data: { supabase, user: data.user } }
}

function normalizeDailyGoal(value: number): 5 | 10 | 20 {
  return value === 5 || value === 20 ? value : 10
}

function normalizeCurriculum(value: string | null | undefined): CurriculumId {
  return value && isCurriculumId(value) ? value : DEFAULT_CURRICULUM_ID
}

function mapProfileRow(row: UserProfileRow): UserProfile {
  return {
    userId: row.user_id,
    xp: row.xp,
    dailyGoal: normalizeDailyGoal(row.daily_goal),
    completedSessions: row.completed_sessions,
    completedExams: row.completed_exams,
    completedDiagnostics: row.completed_diagnostics ?? 0,
    lastDiagnosticAt: row.last_diagnostic_at ?? null,
    lastDiagnosticAccuracy: row.last_diagnostic_accuracy ?? 0,
    previousDiagnosticAccuracy: row.previous_diagnostic_accuracy ?? null,
    bestDiagnosticAccuracy: row.best_diagnostic_accuracy ?? 0,
    selectedCurriculum: normalizeCurriculum(row.selected_curriculum),
    curriculumStartedAt: row.curriculum_started_at ?? null,
    curriculumUpdatedAt: row.curriculum_updated_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function ensureUserProfile(): Promise<
  ProfileResult<{ supabase: SupabaseClient; user: User; profile: UserProfile }>
> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) {
    return {
      ok: false,
      reason: auth.reason,
      error: auth.error,
    }
  }

  const { supabase, user } = auth.data
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<UserProfileRow>()

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  if (data) {
    return { ok: true, data: { supabase, user, profile: mapProfileRow(data) } }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_profiles")
    .insert({ user_id: user.id })
    .select("*")
    .single<UserProfileRow>()

  if (insertError || !inserted) {
    return {
      ok: false,
      reason: "supabase-error",
      error: insertError?.message ?? "Could not create study profile.",
    }
  }

  return { ok: true, data: { supabase, user, profile: mapProfileRow(inserted) } }
}

export async function getUserProfile(): Promise<ProfileResult<UserProfile>> {
  const result = await ensureUserProfile()
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      error: result.error,
    }
  }
  return { ok: true, data: result.data.profile }
}

export async function updateDailyGoal(goal: 5 | 10 | 20): Promise<ProfileResult<UserProfile>> {
  const result = await ensureUserProfile()
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      error: result.error,
    }
  }

  const { data, error } = await result.data.supabase
    .from("user_profiles")
    .update({
      daily_goal: goal,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", result.data.user.id)
    .select("*")
    .single<UserProfileRow>()

  if (error || !data) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error?.message ?? "Could not update daily goal.",
    }
  }

  return { ok: true, data: mapProfileRow(data) }
}

export async function updateSelectedCurriculum(curriculumId: CurriculumId): Promise<ProfileResult<UserProfile>> {
  const result = await ensureUserProfile()
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      error: result.error,
    }
  }

  const now = new Date().toISOString()
  const { data, error } = await result.data.supabase
    .from("user_profiles")
    .update({
      selected_curriculum: curriculumId,
      curriculum_started_at: result.data.profile.curriculumStartedAt ?? now,
      curriculum_updated_at: now,
      updated_at: now,
    })
    .eq("user_id", result.data.user.id)
    .select("*")
    .single<UserProfileRow>()

  if (error || !data) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error?.message ?? "Could not update selected curriculum.",
    }
  }

  return { ok: true, data: mapProfileRow(data) }
}

export async function applyProfileReward(input: {
  xp?: number
  completedSessions?: number
  completedExams?: number
  completedDiagnostics?: number
  diagnosticAccuracy?: number
  diagnosticCompletedAt?: string
}): Promise<ProfileResult<UserProfile>> {
  const result = await ensureUserProfile()
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason,
      error: result.error,
    }
  }

  const profile = result.data.profile
  const completedDiagnostics = input.completedDiagnostics ?? 0
  const diagnosticAccuracy =
    typeof input.diagnosticAccuracy === "number"
      ? Math.max(0, Math.min(100, Math.round(input.diagnosticAccuracy)))
      : null
  const { data, error } = await result.data.supabase
    .from("user_profiles")
    .update({
      xp: Math.max(0, profile.xp + (input.xp ?? 0)),
      completed_sessions: profile.completedSessions + (input.completedSessions ?? 0),
      completed_exams: profile.completedExams + (input.completedExams ?? 0),
      completed_diagnostics: profile.completedDiagnostics + completedDiagnostics,
      last_diagnostic_at: completedDiagnostics > 0
        ? input.diagnosticCompletedAt ?? new Date().toISOString()
        : profile.lastDiagnosticAt,
      previous_diagnostic_accuracy: diagnosticAccuracy !== null
        ? profile.lastDiagnosticAccuracy
        : profile.previousDiagnosticAccuracy,
      last_diagnostic_accuracy: diagnosticAccuracy ?? profile.lastDiagnosticAccuracy,
      best_diagnostic_accuracy: diagnosticAccuracy !== null
        ? Math.max(profile.bestDiagnosticAccuracy, diagnosticAccuracy)
        : profile.bestDiagnosticAccuracy,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", result.data.user.id)
    .select("*")
    .single<UserProfileRow>()

  if (error || !data) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error?.message ?? "Could not update study profile.",
    }
  }

  return { ok: true, data: mapProfileRow(data) }
}

export function getLevelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / 100)
}
