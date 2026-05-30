/**
 * Future-ready user persistence schema.
 * No payment processing or live backend — types and interfaces only.
 */

export type {
  UserRecord,
  SearchHistoryRecord,
  SavedCompoundRecord,
  SavedReactionRecord,
  BookmarkRecord,
  AchievementRecord,
  SubscriptionRecord,
  LeaderboardEntryRecord,
  FriendConnectionRecord,
} from "../types"

/** Repository interfaces for future Supabase/Prisma implementation */
export interface UserRepository {
  getUser(id: string): Promise<import("../types").UserRecord | null>
  createUser(data: Omit<import("../types").UserRecord, "id" | "createdAt">): Promise<import("../types").UserRecord>
}

export interface SearchHistoryRepository {
  add(entry: Omit<import("../types").SearchHistoryRecord, "id">): Promise<void>
  listByUser(userId: string, limit?: number): Promise<import("../types").SearchHistoryRecord[]>
}

export interface SavedItemsRepository {
  saveCompound(data: Omit<import("../types").SavedCompoundRecord, "id">): Promise<void>
  saveReaction(data: Omit<import("../types").SavedReactionRecord, "id">): Promise<void>
  listCompounds(userId: string): Promise<import("../types").SavedCompoundRecord[]>
}

export interface BookmarkRepository {
  add(data: Omit<import("../types").BookmarkRecord, "id">): Promise<void>
  list(userId: string): Promise<import("../types").BookmarkRecord[]>
  remove(id: string): Promise<void>
}

export interface AchievementRepository {
  unlock(userId: string, achievementKey: string): Promise<void>
  list(userId: string): Promise<import("../types").AchievementRecord[]>
}

export interface LeaderboardRepository {
  getTop(period: "weekly" | "monthly" | "all-time", limit?: number): Promise<import("../types").LeaderboardEntryRecord[]>
}

/** SQL-oriented table names for future migrations */
export const DB_TABLES = {
  users: "users",
  searchHistory: "search_history",
  savedCompounds: "saved_compounds",
  savedReactions: "saved_reactions",
  bookmarks: "bookmarks",
  achievements: "achievements",
  subscriptions: "subscriptions",
  leaderboard: "leaderboard_entries",
  friendConnections: "friend_connections",
} as const
