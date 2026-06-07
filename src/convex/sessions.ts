import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./users";

const source = v.union(
  v.literal("claude-code"),
  v.literal("cursor"),
  v.literal("codex"),
  v.literal("pi"),
  v.literal("manual"),
  v.literal("unknown"),
);
const confidence = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
  v.literal("unknown"),
);
const category = v.union(
  v.literal("api-key"),
  v.literal("token"),
  v.literal("email"),
  v.literal("absolute-path"),
  v.literal("env-secret"),
  v.literal("private-key"),
  v.literal("url-secret"),
  v.literal("other"),
);
const stats = v.object({
  messageCount: v.number(),
  userTurnCount: v.number(),
  assistantTurnCount: v.number(),
  toolCallCount: v.number(),
  errorCount: v.number(),
  filesTouchedCount: v.number(),
  estimatedDurationMs: v.optional(v.number()),
  tokenCountInput: v.optional(v.number()),
  tokenCountOutput: v.optional(v.number()),
  estimatedCostUsd: v.optional(v.number()),
});
const dataCompleteness = v.object({
  confidence,
  hasTimestamps: v.boolean(),
  hasToolEvents: v.boolean(),
  hasDiffs: v.boolean(),
  hasCommandOutputs: v.boolean(),
  hasTestResults: v.boolean(),
  hasModelMetadata: v.boolean(),
  warnings: v.array(v.string()),
});
const redactionMetadata = v.object({
  clientSideApplied: v.boolean(),
  serverSideApplied: v.boolean(),
  categories: v.array(v.object({ category, count: v.number() })),
  notes: v.optional(v.array(v.string())),
});
const message = v.object({
  id: v.string(),
  role: v.union(
    v.literal("user"),
    v.literal("assistant"),
    v.literal("system"),
    v.literal("tool"),
    v.literal("unknown"),
  ),
  content: v.string(),
  timestamp: v.optional(v.string()),
  model: v.optional(v.string()),
  sourceEventId: v.optional(v.string()),
  metadata: v.optional(v.any()),
});
const toolEvent = v.object({
  id: v.string(),
  kind: v.union(
    v.literal("command"),
    v.literal("read"),
    v.literal("edit"),
    v.literal("write"),
    v.literal("search"),
    v.literal("test"),
    v.literal("browser"),
    v.literal("network"),
    v.literal("plan"),
    v.literal("other"),
  ),
  name: v.optional(v.string()),
  inputSummary: v.optional(v.string()),
  outputSummary: v.optional(v.string()),
  rawInputRedacted: v.optional(v.string()),
  rawOutputRedacted: v.optional(v.string()),
  status: v.union(v.literal("success"), v.literal("error"), v.literal("unknown")),
  errorMessage: v.optional(v.string()),
  timestamp: v.optional(v.string()),
  durationMs: v.optional(v.number()),
  relatedMessageId: v.optional(v.string()),
  metadata: v.optional(v.any()),
});
const artifact = v.object({
  id: v.string(),
  kind: v.union(
    v.literal("file-diff"),
    v.literal("file"),
    v.literal("path"),
    v.literal("command-output"),
    v.literal("url"),
    v.literal("other"),
  ),
  path: v.optional(v.string()),
  language: v.optional(v.string()),
  summary: v.optional(v.string()),
  contentRedacted: v.optional(v.string()),
  diffRedacted: v.optional(v.string()),
  metadata: v.optional(v.any()),
});
const normalizedSessionSummary = v.object({
  schemaVersion: v.literal(1),
  source,
  sourceSessionId: v.optional(v.string()),
  sourceMetadata: v.optional(v.any()),
  title: v.string(),
  titleInferred: v.boolean(),
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  importedAt: v.string(),
  messagesPreview: v.array(message),
  toolEventsPreview: v.array(toolEvent),
  artifactsPreview: v.array(artifact),
  stats,
  redactionMetadata,
  dataCompleteness,
});

function summary(doc: any) {
  return {
    id: doc._id,
    source: doc.source,
    sourceSessionId: doc.sourceSessionId,
    title: doc.title,
    titleInferred: doc.titleInferred,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    importedAt: doc.importedAt,
    stats: doc.stats,
    dataCompleteness: doc.dataCompleteness,
    redactionMetadata: doc.redactionMetadata,
  };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const createImportSession = mutation({
  args: {
    session: normalizedSessionSummary,
    redactionReviewed: v.boolean(),
    storageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (!args.redactionReviewed) throw new Error("Review redaction before importing.");
    const user = await requireUser(ctx);
    const id = await ctx.db.insert("sessions", {
      userId: user._id,
      source: args.session.source,
      sourceSessionId: args.session.sourceSessionId,
      title: args.session.title,
      titleInferred: args.session.titleInferred,
      createdAt: args.session.createdAt,
      updatedAt: args.session.updatedAt,
      importedAt: args.session.importedAt,
      normalizedTraceFileId: args.storageId,
      normalizedTraceSummary: {
        messagesPreview: args.session.messagesPreview,
        toolEventsPreview: args.session.toolEventsPreview,
        artifactsPreview: args.session.artifactsPreview,
      },
      stats: args.session.stats,
      dataCompleteness: args.session.dataCompleteness,
      redactionMetadata: { ...args.session.redactionMetadata },
      sourceMetadata: args.session.sourceMetadata,
    });
    return { sessionId: id };
  },
});

export const deleteOrphanedTrace = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const recentSessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId_and_importedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
    const isReferenced = recentSessions.some(
      (session) => session.normalizedTraceFileId === args.storageId,
    );
    if (!isReferenced) await ctx.storage.delete(args.storageId);
    return { deleted: !isReferenced };
  },
});

export const listSessions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_userId_and_importedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 25);
    return rows.filter((r) => !r.deletedAt).map(summary);
  },
});
export const listRecentSessions = listSessions;

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await ctx.db.get(args.sessionId);
    if (!doc || doc.userId !== user._id || doc.deletedAt) return null;
    return {
      ...summary(doc),
      messagesPreview: doc.normalizedTraceSummary.messagesPreview,
      toolEventsPreview: doc.normalizedTraceSummary.toolEventsPreview,
      artifactsPreview: doc.normalizedTraceSummary.artifactsPreview,
      traceFileAvailable: Boolean(doc.normalizedTraceFileId),
    };
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await ctx.db.get(args.sessionId);
    if (!doc || doc.userId !== user._id) throw new Error("Session not found.");
    await ctx.db.patch(args.sessionId, { deletedAt: Date.now() });
    if (doc.normalizedTraceFileId) await ctx.storage.delete(doc.normalizedTraceFileId);
    return { deleted: true };
  },
});
