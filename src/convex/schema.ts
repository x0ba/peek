import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    userId: v.id("users"),
    source: v.union(
      v.literal("claude-code"),
      v.literal("cursor"),
      v.literal("codex"),
      v.literal("pi"),
      v.literal("manual"),
      v.literal("unknown"),
    ),
    sourceSessionId: v.optional(v.string()),
    title: v.string(),
    titleInferred: v.boolean(),
    createdAt: v.optional(v.string()),
    updatedAt: v.optional(v.string()),
    importedAt: v.string(),
    normalizedTraceFileId: v.optional(v.id("_storage")),
    normalizedTraceSummary: v.any(),
    stats: v.any(),
    dataCompleteness: v.any(),
    redactionMetadata: v.any(),
    sourceMetadata: v.optional(v.any()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_userId_and_importedAt", ["userId", "importedAt"])
    .index("by_userId_and_source", ["userId", "source"]),
  analysisJobs: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    status: v.string(),
    progressMessage: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userId_and_createdAt", ["userId", "createdAt"])
    .index("by_sessionId", ["sessionId"])
    .index("by_status", ["status"]),
  analysisReports: defineTable({
    userId: v.id("users"),
    sessionId: v.id("sessions"),
    jobId: v.id("analysisJobs"),
    generatedAt: v.string(),
    modelProvider: v.string(),
    modelName: v.string(),
    analysisConfidence: v.string(),
    report: v.any(),
    overallScore: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_userId_and_generatedAt", ["userId", "generatedAt"])
    .index("by_sessionId", ["sessionId"]),

  // Authenticated app users, mapped 1:1 to a Clerk identity.
  // Created lazily on first authenticated load (see users.ensureUser).
  users: defineTable({
    // Canonical, globally-unique identity key: `${issuer}|${subject}`.
    tokenIdentifier: v.string(),
    // Clerk user id (identity.subject) — surfaced to the client contract.
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_clerk_user", ["clerkUserId"]),
});
