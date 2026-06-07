import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./users";

const statusText = v.union(
  v.literal("queued"),
  v.literal("parsing"),
  v.literal("redacting"),
  v.literal("normalizing"),
  v.literal("analyzing"),
  v.literal("scoring"),
  v.literal("generating-report"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

function jobSummary(job: any) {
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

async function ownedSession(ctx: any, sessionId: any, userId: any) {
  const session = await ctx.db.get(sessionId);
  if (!session || session.userId !== userId || session.deletedAt)
    throw new Error("Session not found.");
  return session;
}

function averageConfidenceTier(confidences: unknown[]) {
  const scores: number[] = confidences
    .map((confidence) =>
      confidence === "high" ? 3 : confidence === "medium" ? 2 : confidence === "low" ? 1 : 0,
    )
    .filter((score) => score > 0);
  if (!scores.length) return "unknown";
  const average = scores.reduce((sum, score) => Number(sum) + Number(score), 0) / scores.length;
  if (average >= 2.5) return "high";
  if (average >= 1.5) return "medium";
  return "low";
}

export const createAnalysisJob = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ownedSession(ctx, args.sessionId, user._id);
    const existingReport = (
      await ctx.db
        .query("analysisReports")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .take(10)
    ).find((report) => !report.deletedAt);
    if (existingReport) {
      const existingJob = await ctx.db.get(existingReport.jobId);
      if (existingJob && existingJob.userId === user._id) return jobSummary(existingJob);
    }
    const existingJob = await ctx.db
      .query("analysisJobs")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "queued"),
          q.eq(q.field("status"), "parsing"),
          q.eq(q.field("status"), "redacting"),
          q.eq(q.field("status"), "normalizing"),
          q.eq(q.field("status"), "analyzing"),
          q.eq(q.field("status"), "scoring"),
          q.eq(q.field("status"), "generating-report"),
          q.eq(q.field("status"), "completed"),
        ),
      )
      .first();
    if (existingJob) return jobSummary(existingJob);
    const now = Date.now();
    const id = await ctx.db.insert("analysisJobs", {
      userId: user._id,
      sessionId: args.sessionId,
      status: "queued",
      progressMessage: "Queued for analysis",
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.analysis.runAnalysisJob, { jobId: id });
    const job = await ctx.db.get(id);
    return jobSummary(job);
  },
});

export const retryAnalysisJob = mutation({
  args: { jobId: v.id("analysisJobs") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== user._id) throw new Error("Job not found.");
    if (job.status !== "failed") throw new Error("Only failed jobs can be retried.");
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: "queued",
      progressMessage: "Queued for retry",
      errorMessage: undefined,
      retryCount: job.retryCount + 1,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.analysis.runAnalysisJob, { jobId: args.jobId });
    return jobSummary((await ctx.db.get(args.jobId))!);
  },
});

export const getAnalysisJob = query({
  args: { jobId: v.id("analysisJobs") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const job = await ctx.db.get(args.jobId);
    return job && job.userId === user._id ? jobSummary(job) : null;
  },
});

export const getLatestReport = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ownedSession(ctx, args.sessionId, user._id);
    const reports = await ctx.db
      .query("analysisReports")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(10);
    return reports.find((r) => !r.deletedAt)?.report ?? null;
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const sessions = (
      await ctx.db
        .query("sessions")
        .withIndex("by_userId_and_importedAt", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(100)
    ).filter((s) => !s.deletedAt);
    const reports = await ctx.db
      .query("analysisReports")
      .withIndex("by_userId_and_generatedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
    const sourceCounts: Record<string, number> = {};
    for (const s of sessions) sourceCounts[s.source] = (sourceCounts[s.source] ?? 0) + 1;
    const scores = reports.filter((r) => !r.deletedAt).map((r) => r.overallScore);
    return {
      totalSessions: sessions.length,
      analyzedSessions: scores.length,
      averageQualityScore: scores.length
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : undefined,
      averageConfidence: averageConfidenceTier(sessions.map((s) => s.dataCompleteness?.confidence)),
      sourceCounts,
      commonRisks: [],
      recentTrend: [],
    };
  },
});

export const runAnalysisJob = internalAction({
  args: { jobId: v.id("analysisJobs") },
  handler: async (ctx, args) => {
    try {
      for (const [status, message] of [
        ["analyzing", "Reviewing trace evidence"],
        ["scoring", "Scoring rubric"],
        ["generating-report", "Generating report"],
      ] as const)
        await ctx.runMutation(internal.analysis.updateJob, {
          jobId: args.jobId,
          status,
          progressMessage: message,
        });
      await ctx.runMutation(internal.analysis.completeJobWithReport, { jobId: args.jobId });
    } catch (error) {
      await ctx.runMutation(internal.analysis.failJob, {
        jobId: args.jobId,
        errorMessage: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  },
});

export const updateJob = internalMutation({
  args: { jobId: v.id("analysisJobs"), status: statusText, progressMessage: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: args.status,
      progressMessage: args.progressMessage,
      updatedAt: Date.now(),
    });
  },
});
export const failJob = internalMutation({
  args: { jobId: v.id("analysisJobs"), errorMessage: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

export const completeJobWithReport = internalMutation({
  args: { jobId: v.id("analysisJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");
    if (job.status === "completed") return;
    const session = await ctx.db.get(job.sessionId);
    if (!session) throw new Error("Session not found");
    const score =
      session.dataCompleteness.confidence === "high"
        ? 4.2
        : session.dataCompleteness.confidence === "medium"
          ? 3.6
          : 2.8;
    const generatedAt = new Date().toISOString();
    const report = {
      schemaVersion: 1,
      sessionId: job.sessionId,
      generatedAt,
      modelProvider: "peek",
      modelName: "deterministic-mvp-reviewer",
      analysisConfidence: session.dataCompleteness.confidence,
      executiveSummary: `Imported ${session.stats.messageCount} messages from ${session.source}. This MVP reviewer generated an evidence-backed baseline report from normalized trace metadata.`,
      initialGoal: {
        summary: session.title,
        inferred: session.titleInferred,
        evidence: [
          {
            kind: "message",
            id: session.normalizedTraceSummary.messagesPreview?.[0]?.id,
            quote: session.normalizedTraceSummary.messagesPreview?.[0]?.content?.slice(0, 180),
            summary: "First user message or inferred title.",
          },
        ],
      },
      outcomeSummary: {
        summary:
          "Review the timeline and artifacts to judge final outcome; automated analysis will become richer when an AI provider is configured.",
        evidence: [
          {
            kind: "stat",
            summary: `${session.stats.toolCallCount} tool events and ${session.stats.filesTouchedCount} files touched.`,
          },
        ],
      },
      qualityAssessment: {
        overallScore: score,
        overallLabel: score >= 4 ? "great" : score >= 3 ? "good" : "fair",
        summary: "Score is based on completeness of imported evidence for the MVP.",
      },
      rubricScores: [
        "goal-alignment",
        "completeness",
        "correctness-confidence",
        "efficiency",
        "tool-use-quality",
        "user-collaboration-quality",
        "risk-level",
      ].map((dimension) => ({
        dimension,
        score,
        rationale:
          "Baseline score derived from data completeness until model analysis is configured.",
        evidence: [{ kind: "stat", summary: `Confidence: ${session.dataCompleteness.confidence}` }],
      })),
      whatWentWell: [
        {
          title: "Trace imported successfully",
          detail: "The session was normalized, redacted, stored, and queued for review.",
          severity: "low",
          evidence: [
            { kind: "stat", summary: `${session.stats.messageCount} messages normalized.` },
          ],
        },
      ],
      whatWentWrong: session.dataCompleteness.warnings.map((warning: string) => ({
        title: warning,
        detail: "Missing trace data can lower review confidence.",
        severity: "medium",
        evidence: [{ kind: "stat", summary: warning }],
      })),
      risks: session.dataCompleteness.warnings.map((warning: string) => ({
        title: warning,
        severity: "medium",
        detail: "Analysis may rely more on transcript inference.",
        mitigation: "Prefer guided file imports with tool traces and diffs when available.",
        evidence: [{ kind: "stat", summary: warning }],
      })),
      improvements: [
        {
          title: "Import richer traces",
          why: "Tool events, command outputs, timestamps, and diffs increase analysis confidence.",
          priority: "high",
        },
      ],
      keyStatsNarrative: `${session.stats.userTurnCount} user turns, ${session.stats.assistantTurnCount} assistant turns, ${session.stats.toolCallCount} tool calls.`,
      condensedTimeline: session.normalizedTraceSummary.messagesPreview
        .slice(0, 6)
        .map((m: any, index: number) => ({
          order: index + 1,
          title: `${m.role} message`,
          detail: (typeof m.content === "string" ? m.content : "").slice(0, 220),
          relatedIds: [m.id],
        })),
    };
    await ctx.db.insert("analysisReports", {
      userId: job.userId,
      sessionId: job.sessionId,
      jobId: args.jobId,
      generatedAt,
      modelProvider: report.modelProvider,
      modelName: report.modelName,
      analysisConfidence: report.analysisConfidence,
      report,
      overallScore: score,
    });
    await ctx.db.patch(args.jobId, {
      status: "completed",
      progressMessage: "Analysis completed",
      updatedAt: Date.now(),
      completedAt: Date.now(),
    });
  },
});
