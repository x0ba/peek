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

function reportSummary(report: any) {
  if (!report || report.deletedAt) return undefined;
  return {
    id: report._id,
    jobId: report.jobId,
    generatedAt: report.generatedAt,
    modelProvider: report.modelProvider,
    modelName: report.modelName,
    analysisConfidence: report.analysisConfidence,
    overallScore: report.overallScore,
    overallLabel: report.report?.qualityAssessment?.overallLabel ?? "good",
    topRisks: (report.report?.risks ?? []).slice(0, 3).map((risk: any) => ({
      title: risk.title,
      severity: risk.severity,
    })),
  };
}

function jobSummary(job: any) {
  if (!job) return undefined;
  return {
    id: job._id,
    sessionId: job.sessionId,
    status: job.status,
    progressMessage: job.progressMessage,
    errorMessage: job.errorMessage,
    retryCount: job.retryCount,
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
    completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : undefined,
    retryable: job.status === "failed",
  };
}

async function latestReport(ctx: any, sessionId: any) {
  const reports = await ctx.db
    .query("analysisReports")
    .withIndex("by_sessionId", (q: any) => q.eq("sessionId", sessionId))
    .order("desc")
    .take(10);
  return reports.find((report: any) => !report.deletedAt);
}

async function latestJob(ctx: any, sessionId: any) {
  const jobs = await ctx.db
    .query("analysisJobs")
    .withIndex("by_sessionId", (q: any) => q.eq("sessionId", sessionId))
    .order("desc")
    .take(1);
  return jobs[0];
}

async function summary(ctx: any, doc: any) {
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
    latestJob: jobSummary(await latestJob(ctx, doc._id)),
    latestReport: reportSummary(await latestReport(ctx, doc._id)),
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
    const referencingSession = await ctx.db
      .query("sessions")
      .withIndex("by_normalizedTraceFileId", (q) => q.eq("normalizedTraceFileId", args.storageId))
      .first();
    if (referencingSession) {
      if (referencingSession.userId !== user._id) throw new Error("Trace file not found.");
      return { deleted: false };
    }
    await ctx.storage.delete(args.storageId);
    return { deleted: true };
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
    return await Promise.all(rows.filter((r) => !r.deletedAt).map((row) => summary(ctx, row)));
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
      ...(await summary(ctx, doc)),
      messagesPreview: doc.normalizedTraceSummary.messagesPreview,
      toolEventsPreview: doc.normalizedTraceSummary.toolEventsPreview,
      artifactsPreview: doc.normalizedTraceSummary.artifactsPreview,
      traceFileAvailable: Boolean(doc.normalizedTraceFileId),
    };
  },
});

async function softDeleteSession(ctx: any, doc: any) {
  const deletedAt = Date.now();
  await ctx.db.patch(doc._id, { deletedAt });
  const reports = await ctx.db
    .query("analysisReports")
    .withIndex("by_sessionId", (q: any) => q.eq("sessionId", doc._id))
    .take(100);
  for (const report of reports) await ctx.db.patch(report._id, { deletedAt });
  if (doc.normalizedTraceFileId) await ctx.storage.delete(doc.normalizedTraceFileId);
}

export const deleteSession = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await ctx.db.get(args.sessionId);
    if (!doc || doc.userId !== user._id) throw new Error("Session not found.");
    await softDeleteSession(ctx, doc);
    return { deleted: true };
  },
});

export const deleteAllWorkspaceData = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId_and_importedAt", (q) => q.eq("userId", user._id))
      .collect();
    let deletedCount = 0;
    for (const doc of sessions) {
      if (doc.deletedAt) continue;
      await softDeleteSession(ctx, doc);
      deletedCount++;
    }
    return { deletedCount };
  },
});
