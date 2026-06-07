export const CONTRACT_VERSION = 1;

export type AgentSource = "claude-code" | "cursor" | "codex" | "pi" | "manual" | "unknown";
export type MessageRole = "user" | "assistant" | "system" | "tool" | "unknown";
export type Confidence = "high" | "medium" | "low" | "unknown";
export type AnalysisJobStatus =
  | "queued"
  | "parsing"
  | "redacting"
  | "normalizing"
  | "analyzing"
  | "scoring"
  | "generating-report"
  | "completed"
  | "failed"
  | "cancelled";

export type ToolEventKind =
  | "command"
  | "read"
  | "edit"
  | "write"
  | "search"
  | "test"
  | "browser"
  | "network"
  | "plan"
  | "other";

export type RedactionCategory =
  | "api-key"
  | "token"
  | "email"
  | "absolute-path"
  | "env-secret"
  | "private-key"
  | "url-secret"
  | "other";

export type NormalizedSession = {
  schemaVersion: 1;
  source: AgentSource;
  sourceSessionId?: string;
  sourceMetadata?: Record<string, unknown>;
  title: string;
  titleInferred: boolean;
  createdAt?: string;
  updatedAt?: string;
  importedAt: string;
  messages: NormalizedMessage[];
  toolEvents: ToolEvent[];
  artifacts: SessionArtifact[];
  stats: SessionStats;
  redactionMetadata: RedactionMetadata;
  dataCompleteness: DataCompleteness;
};

export type NormalizedMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: string;
  model?: string;
  sourceEventId?: string;
  metadata?: Record<string, unknown>;
};

export type ToolEvent = {
  id: string;
  kind: ToolEventKind;
  name?: string;
  inputSummary?: string;
  outputSummary?: string;
  rawInputRedacted?: string;
  rawOutputRedacted?: string;
  status: "success" | "error" | "unknown";
  errorMessage?: string;
  timestamp?: string;
  durationMs?: number;
  relatedMessageId?: string;
  metadata?: Record<string, unknown>;
};

export type SessionArtifact = {
  id: string;
  kind: "file-diff" | "file" | "path" | "command-output" | "url" | "other";
  path?: string;
  language?: string;
  summary?: string;
  contentRedacted?: string;
  diffRedacted?: string;
  metadata?: Record<string, unknown>;
};

export type SessionStats = {
  messageCount: number;
  userTurnCount: number;
  assistantTurnCount: number;
  toolCallCount: number;
  errorCount: number;
  filesTouchedCount: number;
  estimatedDurationMs?: number;
  tokenCountInput?: number;
  tokenCountOutput?: number;
  estimatedCostUsd?: number;
};

export type RedactionMetadata = {
  clientSideApplied: boolean;
  serverSideApplied: boolean;
  categories: RedactionCategoryCount[];
  notes?: string[];
};

export type RedactionCategoryCount = {
  category: RedactionCategory;
  count: number;
};

export type DataCompleteness = {
  confidence: Confidence;
  hasTimestamps: boolean;
  hasToolEvents: boolean;
  hasDiffs: boolean;
  hasCommandOutputs: boolean;
  hasTestResults: boolean;
  hasModelMetadata: boolean;
  warnings: string[];
};

export type SessionSummary = Pick<
  NormalizedSession,
  | "source"
  | "sourceSessionId"
  | "title"
  | "titleInferred"
  | "createdAt"
  | "updatedAt"
  | "importedAt"
  | "stats"
  | "dataCompleteness"
  | "redactionMetadata"
> & {
  id: string;
  latestJob?: AnalysisJobSummary;
  latestReport?: AnalysisReportSummary;
};

export type SessionDetail = SessionSummary & {
  messagesPreview: NormalizedMessage[];
  toolEventsPreview: ToolEvent[];
  artifactsPreview: SessionArtifact[];
  traceFileAvailable: boolean;
};

export type ImportCandidate = {
  id: string;
  source: AgentSource;
  title: string;
  titleInferred: boolean;
  rawMessages: unknown[];
  rawEvents: unknown[];
  artifacts: unknown[];
  sourceMetadata: Record<string, unknown>;
  confidence: Confidence;
  warnings: string[];
};

export type RedactionPreview = {
  redactedText: string;
  categories: RedactionCategoryCount[];
  sampleSnippets: string[];
  warnings: string[];
};

export type CreateImportSessionArgs = {
  session: NormalizedSession;
  redactionReviewed: boolean;
};

export type CreateImportSessionResult = {
  sessionId: string;
  uploadUrl?: string;
};

export type SaveNormalizedTraceArgs = {
  sessionId: string;
  storageId: string;
  summary: SessionSummary;
};

export type AnalysisJobSummary = {
  id: string;
  sessionId: string;
  status: AnalysisJobStatus;
  progressMessage?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  retryable: boolean;
};

export type AnalysisReport = {
  schemaVersion: 1;
  sessionId: string;
  generatedAt: string;
  modelProvider: string;
  modelName: string;
  analysisConfidence: Confidence;
  executiveSummary: string;
  initialGoal: ReportSectionWithEvidence;
  outcomeSummary: ReportSectionWithEvidence;
  qualityAssessment: {
    overallScore: number;
    overallLabel: "poor" | "fair" | "good" | "great" | "excellent";
    summary: string;
  };
  rubricScores: RubricScore[];
  whatWentWell: ReportFinding[];
  whatWentWrong: ReportFinding[];
  risks: ReportRisk[];
  improvements: ReportRecommendation[];
  keyStatsNarrative: string;
  condensedTimeline: TimelineItem[];
};

export type AnalysisReportSummary = Pick<
  AnalysisReport,
  "generatedAt" | "modelProvider" | "modelName" | "analysisConfidence"
> & {
  id: string;
  jobId: string;
  overallScore: number;
  overallLabel: AnalysisReport["qualityAssessment"]["overallLabel"];
  topRisks: Pick<ReportRisk, "title" | "severity">[];
};

export type ReportSectionWithEvidence = {
  summary: string;
  inferred?: boolean;
  evidence: EvidenceReference[];
};

export type EvidenceReference = {
  kind: "message" | "tool-event" | "artifact" | "stat";
  id?: string;
  quote?: string;
  summary: string;
};

export type RubricScore = {
  dimension:
    | "goal-alignment"
    | "completeness"
    | "correctness-confidence"
    | "efficiency"
    | "tool-use-quality"
    | "user-collaboration-quality"
    | "risk-level";
  score: number;
  rationale: string;
  evidence: EvidenceReference[];
};

export type ReportFinding = {
  title: string;
  detail: string;
  severity?: "low" | "medium" | "high";
  evidence: EvidenceReference[];
};

export type ReportRisk = {
  title: string;
  severity: "low" | "medium" | "high";
  detail: string;
  mitigation: string;
  evidence: EvidenceReference[];
};

export type ReportRecommendation = {
  title: string;
  why: string;
  example?: string;
  priority: "low" | "medium" | "high";
};

export type TimelineItem = {
  order: number;
  title: string;
  detail: string;
  relatedIds: string[];
};

export type DashboardStats = {
  totalSessions: number;
  analyzedSessions: number;
  averageQualityScore?: number;
  averageConfidence: Confidence;
  sourceCounts: Partial<Record<AgentSource, number>>;
  commonRisks: { title: string; count: number; severity: "low" | "medium" | "high" }[];
  recentTrend: { date: string; sessionCount: number; averageScore?: number }[];
};

export type CurrentUser = {
  id: string;
  clerkUserId: string;
  email?: string;
  name?: string;
  imageUrl?: string;
};

export type ApiContract = {
  getCurrentUser: { args: Record<string, never>; result: CurrentUser | null };
  listSessions: { args: { limit?: number }; result: SessionSummary[] };
  listRecentSessions: { args: { limit?: number }; result: SessionSummary[] };
  getSession: { args: { sessionId: string }; result: SessionDetail | null };
  createImportSession: { args: CreateImportSessionArgs; result: CreateImportSessionResult };
  saveNormalizedTrace: { args: SaveNormalizedTraceArgs; result: { sessionId: string } };
  deleteSession: { args: { sessionId: string }; result: { deleted: true } };
  createAnalysisJob: { args: { sessionId: string }; result: AnalysisJobSummary };
  getAnalysisJob: { args: { jobId: string }; result: AnalysisJobSummary | null };
  retryAnalysisJob: { args: { jobId: string }; result: AnalysisJobSummary };
  getLatestReport: { args: { sessionId: string }; result: AnalysisReport | null };
  getDashboardStats: { args: Record<string, never>; result: DashboardStats };
};
