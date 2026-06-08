import type {
  AgentSource,
  AnalysisJobSummary,
  AnalysisReport,
  AnalysisReportSummary,
  Confidence,
  DataCompleteness,
  NormalizedMessage,
  SessionSummary,
} from "$lib/contracts/api";

export const sourceLabels: Record<AgentSource, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  codex: "Codex",
  pi: "Pi",
  manual: "Manual",
  unknown: "Unknown",
};

export const sourceColors: Record<AgentSource, string> = {
  "claude-code": "var(--signal-accent)",
  cursor: "oklch(0.72 0.16 262)",
  codex: "var(--signal-success)",
  pi: "var(--signal-warning)",
  manual: "oklch(0.72 0.13 324)",
  unknown: "var(--signal-muted)",
};

const activeStatuses = new Set([
  "queued",
  "parsing",
  "redacting",
  "normalizing",
  "analyzing",
  "scoring",
  "generating-report",
]);

export function analysisState(session: {
  latestJob?: AnalysisJobSummary;
  latestReport?: AnalysisReportSummary;
}) {
  if (session.latestReport) return "completed";
  if (session.latestJob?.status === "failed") return "failed";
  if (session.latestJob && activeStatuses.has(session.latestJob.status)) return "active";
  return "unanalyzed";
}

export function statusLabel(state: string) {
  return state === "completed"
    ? "Ready"
    : state === "active"
      ? "Active"
      : state === "failed"
        ? "Errored"
        : "Pending";
}

export function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function formatScore(score?: number) {
  return typeof score === "number" ? score.toFixed(1) : "—";
}

export function formatConfidence(confidence?: Confidence) {
  return confidence ? confidence[0].toUpperCase() + confidence.slice(1) : "Unknown";
}

export function sessionGoal(
  session: Pick<SessionSummary, "title"> & {
    messagesPreview?: NormalizedMessage[];
    latestReport?: AnalysisReportSummary;
  },
  report?: AnalysisReport | null,
) {
  return (
    report?.initialGoal?.summary ??
    session.messagesPreview?.find((message) => message.role === "user")?.content?.slice(0, 140) ??
    session.title ??
    "No goal detected"
  );
}

export function completenessItems(data?: DataCompleteness) {
  return [
    ["Timestamps", Boolean(data?.hasTimestamps)],
    ["Tool events", Boolean(data?.hasToolEvents)],
    ["File changes", Boolean(data?.hasDiffs)],
    ["Command output", Boolean(data?.hasCommandOutputs)],
    ["Model metadata", Boolean(data?.hasModelMetadata)],
  ] as const;
}

export function sourceMix(sourceCounts: Partial<Record<AgentSource, number>>) {
  const entries = (Object.entries(sourceCounts) as [AgentSource, number][]).filter(
    ([, count]) => count > 0,
  );
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  return entries.map(([source, count]) => ({
    source,
    label: sourceLabels[source],
    color: sourceColors[source],
    count,
    percent: total ? Math.round((count / total) * 100) : 0,
  }));
}
