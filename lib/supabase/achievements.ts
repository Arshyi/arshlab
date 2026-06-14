"use client"

import type { SupabaseClient, User } from "@supabase/supabase-js"
import { createClient } from "./client"
import type { AchievementDefinition } from "@/lib/learning/recommendations"

export interface StoredAchievement {
  id: string
  userId: string
  achievementId: string
  label: string
  unlockedAt: string
}

interface StoredAchievementRow {
  id: string
  user_id: string
  achievement_id: string
  label: string
  unlocked_at: string
}

type AchievementFailureReason = "not-configured" | "not-authenticated" | "supabase-error"

export type AchievementResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; reason: AchievementFailureReason; data?: T }

async function getAuthenticatedClient(): Promise<
  AchievementResult<{ supabase: SupabaseClient; user: User }>
> {
  let supabase: SupabaseClient

  try {
    supabase = createClient()
  } catch {
    return {
      ok: false,
      reason: "not-configured",
      error: "Supabase is not configured for achievement unlocks.",
    }
  }

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return {
      ok: false,
      reason: "not-authenticated",
      error: "Sign in to store achievement unlocks.",
    }
  }

  return { ok: true, data: { supabase, user: data.user } }
}

function mapAchievementRow(row: StoredAchievementRow): StoredAchievement {
  return {
    id: row.id,
    userId: row.user_id,
    achievementId: row.achievement_id,
    label: row.label,
    unlockedAt: row.unlocked_at,
  }
}

export async function getStoredAchievements(): Promise<AchievementResult<StoredAchievement[]>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) {
    return {
      ok: false,
      reason: auth.reason,
      error: auth.error,
    }
  }

  const { data, error } = await auth.data.supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("unlocked_at", { ascending: false })
    .returns<StoredAchievementRow[]>()

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  return { ok: true, data: (data ?? []).map(mapAchievementRow) }
}

export async function syncAchievementUnlocks(
  achievements: AchievementDefinition[],
): Promise<AchievementResult<StoredAchievement[]>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) {
    return {
      ok: false,
      reason: auth.reason,
      error: auth.error,
    }
  }

  const unlocked = achievements.filter((achievement) => achievement.unlocked)
  if (unlocked.length === 0) return { ok: true, data: [] }

  const payload = unlocked.map((achievement) => ({
    user_id: auth.data.user.id,
    achievement_id: achievement.id,
    label: achievement.label,
  }))

  const { data, error } = await auth.data.supabase
    .from("user_achievements")
    .upsert(payload, { onConflict: "user_id,achievement_id", ignoreDuplicates: true })
    .select("*")
    .returns<StoredAchievementRow[]>()

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  return { ok: true, data: (data ?? []).map(mapAchievementRow) }
}
