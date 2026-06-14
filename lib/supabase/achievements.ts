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
  createdAt: string
  updatedAt: string
}

interface StoredAchievementRow {
  id: string
  user_id: string
  achievement_id: string
  label: string
  unlocked_at: string
  created_at?: string | null
  updated_at?: string | null
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
    createdAt: row.created_at ?? row.unlocked_at,
    updatedAt: row.updated_at ?? row.unlocked_at,
  }
}

function cleanAchievementValue(value: string, fallback: string, maxLength: number): string {
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maxLength)
  return cleaned || fallback
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
    achievement_id: cleanAchievementValue(achievement.id, "achievement", 120),
    label: cleanAchievementValue(achievement.label, "Achievement", 160),
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
