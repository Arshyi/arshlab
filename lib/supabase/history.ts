"use client"

import type { SupabaseClient, User } from "@supabase/supabase-js"
import {
  clearAllGuestHistory,
  getGuestHistory,
  getMoleculeSummary,
  getReactionSummary,
  type GuestHistoryEntry,
} from "@/lib/guest-history"
import { createClient } from "./client"

export type UserHistoryType = "molecule" | "reaction"

export interface UserHistoryEntry {
  id: string
  userId: string
  type: UserHistoryType
  query: string
  resultTitle: string | null
  resultSummary: string | null
  formula: string | null
  family: string | null
  reactionType: string | null
  predictedProducts: string[]
  metadata: Record<string, unknown>
  createdAt: string
}

interface UserSearchHistoryRow {
  id: string
  user_id: string
  type: UserHistoryType
  query: string
  result_title: string | null
  result_summary: string | null
  formula: string | null
  family: string | null
  reaction_type: string | null
  predicted_products: string[] | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type HistoryFailureReason = "not-configured" | "not-authenticated" | "supabase-error"

export type HistoryResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; reason: HistoryFailureReason; data?: T }

export interface AddUserMoleculeHistoryInput {
  query: string
  resolvedName: string
  formula: string
  family: string
  resultSummary?: string
  metadata?: Record<string, unknown>
}

export interface AddUserReactionHistoryInput {
  query: string
  reactionType: string
  predictedProducts: string[]
  resultSummary?: string
  metadata?: Record<string, unknown>
}

export interface SyncGuestHistoryResult {
  total: number
  synced: number
  skipped: number
}

async function getAuthenticatedClient(): Promise<
  HistoryResult<{ supabase: SupabaseClient; user: User }>
> {
  let supabase: SupabaseClient

  try {
    supabase = createClient()
  } catch {
    return {
      ok: false,
      reason: "not-configured",
      error: "Supabase is not configured for saved account history.",
    }
  }

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return {
      ok: false,
      reason: "not-authenticated",
      error: "Sign in to save history permanently.",
    }
  }

  return { ok: true, data: { supabase, user: data.user } }
}

function mapHistoryRow(row: UserSearchHistoryRow): UserHistoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    query: row.query,
    resultTitle: row.result_title,
    resultSummary: row.result_summary,
    formula: row.formula,
    family: row.family,
    reactionType: row.reaction_type,
    predictedProducts: row.predicted_products ?? [],
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }
}

function rowSignature(row: Pick<UserSearchHistoryRow, "type" | "query" | "result_title" | "formula" | "reaction_type" | "predicted_products">): string {
  return [
    row.type,
    row.query.trim().toLowerCase(),
    row.result_title?.trim().toLowerCase() ?? "",
    row.formula?.trim().toLowerCase() ?? "",
    row.reaction_type?.trim().toLowerCase() ?? "",
    (row.predicted_products ?? []).join("|").toLowerCase(),
  ].join("::")
}

function guestSignature(entry: GuestHistoryEntry): string {
  if (entry.type === "molecule") {
    return rowSignature({
      type: "molecule",
      query: entry.query,
      result_title: entry.resolvedName,
      formula: entry.formula,
      reaction_type: null,
      predicted_products: [],
    })
  }

  return rowSignature({
    type: "reaction",
    query: entry.query,
    result_title: entry.reactionType,
    formula: null,
    reaction_type: entry.reactionType,
    predicted_products: entry.predictedProducts,
  })
}

function guestEntryToInsert(entry: GuestHistoryEntry, userId: string) {
  if (entry.type === "molecule") {
    return {
      user_id: userId,
      type: "molecule" as const,
      query: entry.query,
      result_title: entry.resolvedName,
      result_summary: getMoleculeSummary(entry),
      formula: entry.formula,
      family: entry.family,
      reaction_type: null,
      predicted_products: [],
      metadata: { source: "guest-sync" },
      created_at: entry.timestamp,
    }
  }

  return {
    user_id: userId,
    type: "reaction" as const,
    query: entry.query,
    result_title: entry.reactionType,
    result_summary: getReactionSummary(entry),
    formula: null,
    family: null,
    reaction_type: entry.reactionType,
    predicted_products: entry.predictedProducts,
    metadata: { source: "guest-sync" },
    created_at: entry.timestamp,
  }
}

export async function addUserMoleculeHistory(
  entry: AddUserMoleculeHistoryInput,
): Promise<HistoryResult<UserHistoryEntry>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) return auth

  const payload = {
    user_id: auth.data.user.id,
    type: "molecule" as const,
    query: entry.query.trim(),
    result_title: entry.resolvedName,
    result_summary: entry.resultSummary ?? `${entry.resolvedName} (${entry.formula}) - ${entry.family}`,
    formula: entry.formula,
    family: entry.family,
    reaction_type: null,
    predicted_products: [],
    metadata: entry.metadata ?? {},
  }

  const { data, error } = await auth.data.supabase
    .from("user_search_history")
    .insert(payload)
    .select("*")
    .single<UserSearchHistoryRow>()

  if (error || !data) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error?.message ?? "Could not save molecule history.",
    }
  }

  return { ok: true, data: mapHistoryRow(data) }
}

export async function addUserReactionHistory(
  entry: AddUserReactionHistoryInput,
): Promise<HistoryResult<UserHistoryEntry>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) return auth

  const payload = {
    user_id: auth.data.user.id,
    type: "reaction" as const,
    query: entry.query.trim(),
    result_title: entry.reactionType,
    result_summary:
      entry.resultSummary ??
      `${entry.reactionType}: ${
        entry.predictedProducts.length ? entry.predictedProducts.join(", ") : "No products identified"
      }`,
    formula: null,
    family: null,
    reaction_type: entry.reactionType,
    predicted_products: entry.predictedProducts,
    metadata: entry.metadata ?? {},
  }

  const { data, error } = await auth.data.supabase
    .from("user_search_history")
    .insert(payload)
    .select("*")
    .single<UserSearchHistoryRow>()

  if (error || !data) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error?.message ?? "Could not save reaction history.",
    }
  }

  return { ok: true, data: mapHistoryRow(data) }
}

export async function getUserHistory(): Promise<HistoryResult<UserHistoryEntry[]>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) return auth

  const { data, error } = await auth.data.supabase
    .from("user_search_history")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<UserSearchHistoryRow[]>()

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  return { ok: true, data: (data ?? []).map(mapHistoryRow) }
}

export async function getUserHistoryByType(
  type: UserHistoryType,
): Promise<HistoryResult<UserHistoryEntry[]>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) return auth

  const { data, error } = await auth.data.supabase
    .from("user_search_history")
    .select("*")
    .eq("user_id", auth.data.user.id)
    .eq("type", type)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<UserSearchHistoryRow[]>()

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  return { ok: true, data: (data ?? []).map(mapHistoryRow) }
}

async function clearUserHistory(type?: UserHistoryType): Promise<HistoryResult<{ deleted: boolean }>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) return auth

  let query = auth.data.supabase
    .from("user_search_history")
    .delete()
    .eq("user_id", auth.data.user.id)

  if (type) query = query.eq("type", type)

  const { error } = await query

  if (error) {
    return {
      ok: false,
      reason: "supabase-error",
      error: error.message,
    }
  }

  return { ok: true, data: { deleted: true } }
}

export function clearUserMoleculeHistory() {
  return clearUserHistory("molecule")
}

export function clearUserReactionHistory() {
  return clearUserHistory("reaction")
}

export function clearAllUserHistory() {
  return clearUserHistory()
}

export async function syncGuestHistoryToUser(): Promise<HistoryResult<SyncGuestHistoryResult>> {
  const auth = await getAuthenticatedClient()
  if (!auth.ok) return auth

  const guestEntries = getGuestHistory()
  if (guestEntries.length === 0) {
    return { ok: true, data: { total: 0, synced: 0, skipped: 0 }, message: "No guest history to sync." }
  }

  const { data: existingRows, error: existingError } = await auth.data.supabase
    .from("user_search_history")
    .select("type, query, result_title, formula, reaction_type, predicted_products")
    .eq("user_id", auth.data.user.id)
    .returns<
      Pick<
        UserSearchHistoryRow,
        "type" | "query" | "result_title" | "formula" | "reaction_type" | "predicted_products"
      >[]
    >()

  if (existingError) {
    return {
      ok: false,
      reason: "supabase-error",
      error: existingError.message,
    }
  }

  const existingSignatures = new Set((existingRows ?? []).map(rowSignature))
  const rowsToInsert = guestEntries
    .filter((entry) => !existingSignatures.has(guestSignature(entry)))
    .map((entry) => guestEntryToInsert(entry, auth.data.user.id))

  if (rowsToInsert.length === 0) {
    clearAllGuestHistory()
    return {
      ok: true,
      data: { total: guestEntries.length, synced: 0, skipped: guestEntries.length },
      message: "Guest history was already saved to this account.",
    }
  }

  const { error: insertError } = await auth.data.supabase
    .from("user_search_history")
    .insert(rowsToInsert)

  if (insertError) {
    return {
      ok: false,
      reason: "supabase-error",
      error: insertError.message,
    }
  }

  clearAllGuestHistory()

  return {
    ok: true,
    data: {
      total: guestEntries.length,
      synced: rowsToInsert.length,
      skipped: guestEntries.length - rowsToInsert.length,
    },
  }
}
