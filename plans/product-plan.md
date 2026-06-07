# Peek Product Plan and Implementation Spec

Peek is a cloud SaaS for importing, normalizing, redacting, analyzing, storing, and reviewing coding-agent sessions from major agent harnesses. This document is intentionally detailed enough for an implementation agent to build the full product without needing the original planning conversation.

## 1. Product Summary

### One-liner

Peek is a black box recorder and review console for AI coding-agent sessions.

### Primary user

Individual developers and AI-agent power users who use tools like Claude Code, Cursor, Codex, Pi, and similar coding harnesses.

### Core job to be done

A user imports one coding-agent session and receives a clear, evidence-backed analysis of:

- what the user was trying to accomplish
- what the agent actually did
- whether the output was good
- where the session went wrong or carried risk
- what the user can improve next time
- useful statistics about the session

### Product mode

Cloud SaaS.

### MVP promise

“Import a coding-agent session from any major harness, preview/redact it, and get an AI-generated review report with scores, risks, stats, and improvement advice.”

## 2. Tech Stack Decisions

Use the existing project unless explicitly changed later.

### Frontend

- SvelteKit
- Svelte 5 runes/component style
- TypeScript
- Tailwind CSS
- shadcn-svelte components
- lucide-svelte icons
- Vite+ commands through `vp`

### Authentication

- Clerk
- Providers:
  - GitHub
  - Google
  - email magic link

### Backend

- Convex
- Convex file storage
- Convex scheduled/background functions where appropriate

### AI analysis

- App-managed AI provider/model by default.
- Do not require users to bring API keys for MVP.
- Provider should be abstracted behind a small server-side analysis service so models can be changed later.

### Validation commands

After meaningful changes, run:

```sh
vp check
vp test
```

If there are no tests yet, note that `vp test` reports no test files and add tests when implementing real logic.

## 3. High-Level Architecture

```txt
Browser/SvelteKit
  ├─ Clerk auth
  ├─ Import wizard UI
  ├─ Client-side file reading/parsing
  ├─ Client-side redaction preview
  └─ Convex client calls

Convex backend
  ├─ Authenticated user/session records
  ├─ File storage for uploaded/redacted trace blobs
  ├─ Import session metadata
  ├─ Analysis job records
  ├─ AI analysis orchestration
  ├─ Reports and rubric scores
  └─ Aggregate stats queries

AI provider
  └─ Receives only redacted normalized session payloads
```

## 4. Core User Flows

### 4.1 New user onboarding

1. User lands on marketing/app page.
2. User clicks “Sign in”.
3. Clerk sign-in modal/page supports GitHub, Google, and email magic link.
4. After auth, user lands on dashboard.
5. Empty dashboard shows:
   - “Import your first agent session” CTA
   - supported sources
   - privacy/redaction explanation

### 4.2 Import a session

1. User opens Import Wizard.
2. User chooses source:
   - Claude Code
   - Cursor
   - Codex
   - Pi
   - Other/manual
3. User provides data via one of:
   - folder picker, when browser supports it
   - file picker
   - drag-and-drop files
   - paste transcript
4. Browser parses data locally.
5. Browser detects candidate sessions.
6. User selects one or more sessions to import.
7. Browser runs client-side redaction.
8. User sees redaction preview and data completeness preview.
9. User confirms upload.
10. App uploads redacted normalized trace payload and metadata to Convex.
11. User lands on session preview page.
12. User clicks “Analyze session”.
13. Background analysis job starts.
14. User sees progress states.
15. Report appears when complete.

### 4.3 Review analysis report

1. User opens a session.
2. UI shows:
   - session metadata
   - data completeness/confidence
   - trace timeline
   - stats
   - analysis report
   - rubric scores
   - risks
   - improvement recommendations
3. User can delete session and report.
4. Later: user can export report.

### 4.4 Dashboard

Dashboard shows:

- recent imported sessions
- analysis status
- quick stats
- source distribution
- basic quality trends
- CTA to import another session

## 5. Information Architecture and Routes

### `/`

For now can be app landing plus import CTA. Eventually split marketing and app if desired.

Required sections:

- Hero: “Agent trace analyzer for coding harnesses”
- Supported sources
- Privacy/redaction promise
- CTA to sign in/import

### `/dashboard`

Authenticated route.

Show:

- recent sessions table/list
- analysis job statuses
- aggregate stats cards:
  - total sessions
  - analyzed sessions
  - average quality score
  - average confidence
  - most common risks
- empty state if no imports

### `/import`

Authenticated route.

Full Import Wizard.

Steps:

1. Source
2. Data input
3. Detected sessions
4. Redaction preview
5. Session preview
6. Upload/import complete

### `/sessions/[id]`

Authenticated route.

Show one imported session.

Sections:

- header metadata
- analysis status/actions
- data completeness panel
- key stats
- trace timeline
- artifacts/diffs summary
- analysis report if available
- rubric score panel
- risk panel
- delete button

### `/settings`

Authenticated route.

Sections:

- Clerk profile/account management
- privacy policy summary
- delete all data
- future: model/provider preferences

## 6. UI Direction

Style: developer observability dashboard.

### Visual qualities

- Dark-first
- Dense but readable
- Trace/timeline oriented
- Clear status colors
- Monospace accents
- Minimal rounded corners; current shadcn style has square/industrial look
- Feels closer to Linear + Datadog + GitHub Actions than generic AI SaaS

### UI patterns

Use shadcn-svelte where possible:

- Button
- Card
- Badge
- Tabs
- Table
- Dialog/AlertDialog
- Progress
- Accordion
- Tooltip
- Select
- Separator
- ScrollArea
- Alert
- DropdownMenu
- Input/Textarea

### Color semantics

- Emerald/green: safe, complete, high confidence, success
- Amber/yellow: warning, missing data, medium confidence
- Red: destructive, secret risk, failed analysis, high risk
- Blue/cyan: informational/model/tool metadata
- Muted gray: unavailable/unknown/inferred

## 7. Import Sources

Support multiple sources from day one. Native importers do not need equal trace depth initially. All sources must normalize into the same internal schema.

### 7.1 Claude Code importer

Goal: import local Claude Code project/session exports or history files.

Implementation expectations:

- Let user select files/folders.
- Scan for JSON/JSONL/Markdown/text-like session files.
- Parse messages, tool calls, timestamps, model names, file edits/diffs if present.
- Preserve source-specific metadata in `sourceMetadata`.
- If exact current Claude Code storage format changes, importer should be tolerant and fallback to generic JSON/JSONL parsing.

### 7.2 Cursor importer

Goal: import Cursor chat/composer history exports or copied transcripts.

Implementation expectations:

- Accept workspace-related files, JSON-like data, Markdown, or pasted transcripts.
- Extract user/assistant turns where possible.
- Extract file references, commands, and edits where present.
- Mark low confidence if only plain transcript text exists.

### 7.3 Codex importer

Goal: import OpenAI Codex CLI/session traces where available.

Implementation expectations:

- Accept JSON/JSONL trace files.
- Extract messages, tool events, command outputs, and diffs where present.
- Fallback to generic structured/plain transcript parser.

### 7.4 Pi importer

Goal: import Pi coding-agent harness history/traces.

Implementation expectations:

- Accept Pi session logs or exported traces.
- Extract user/assistant messages, tool calls, file operations, shell commands, and outputs.
- Preserve provider/model metadata when present.

### 7.5 Universal fallback importer

Always support:

- `.json`
- `.jsonl`
- `.md`
- `.txt`
- pasted text

Fallback parsing strategy:

1. Try structured JSON detection.
2. Try JSONL event detection.
3. Try Markdown transcript role splitting.
4. Try plain text role splitting using common prefixes:
   - `User:`
   - `Assistant:`
   - `System:`
   - `Tool:`
   - `Human:`
   - `AI:`
5. If no role boundaries are found, import as one text artifact and ask AI to infer structure with low confidence.

## 8. Normalized Session Schema

Every import should produce a normalized session object. Fields may be nullable/optional if unavailable.

```ts
type AgentSource = "claude-code" | "cursor" | "codex" | "pi" | "manual" | "unknown";

type MessageRole = "user" | "assistant" | "system" | "tool" | "unknown";

type ToolEventKind =
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

type Confidence = "high" | "medium" | "low" | "unknown";

type NormalizedSession = {
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

type NormalizedMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: string;
  model?: string;
  sourceEventId?: string;
  metadata?: Record<string, unknown>;
};

type ToolEvent = {
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

type SessionArtifact = {
  id: string;
  kind: "file-diff" | "file" | "path" | "command-output" | "url" | "other";
  path?: string;
  language?: string;
  summary?: string;
  contentRedacted?: string;
  diffRedacted?: string;
  metadata?: Record<string, unknown>;
};

type SessionStats = {
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

type RedactionMetadata = {
  clientSideApplied: boolean;
  serverSideApplied: boolean;
  categories: RedactionCategoryCount[];
  notes?: string[];
};

type RedactionCategoryCount = {
  category:
    | "api-key"
    | "token"
    | "email"
    | "absolute-path"
    | "env-secret"
    | "private-key"
    | "url-secret"
    | "other";
  count: number;
};

type DataCompleteness = {
  confidence: Confidence;
  hasTimestamps: boolean;
  hasToolEvents: boolean;
  hasDiffs: boolean;
  hasCommandOutputs: boolean;
  hasTestResults: boolean;
  hasModelMetadata: boolean;
  warnings: string[];
};
```

## 9. Redaction Requirements

Redaction is both a trust feature and a data-safety requirement.

### 9.1 Client-side redaction

Run before upload.

Detect and replace:

- API-key-like strings
- bearer tokens
- GitHub tokens
- OpenAI/Anthropic-style keys
- private key blocks
- email addresses
- absolute local paths
- `.env`-style secret assignments
- URLs with obvious secret query params

Replacement format:

- `[REDACTED:API_KEY]`
- `[REDACTED:TOKEN]`
- `[REDACTED:EMAIL]`
- `[REDACTED:ABSOLUTE_PATH]`
- `[REDACTED:ENV_SECRET]`
- `[REDACTED:PRIVATE_KEY]`

Do not store raw redacted values in metadata. Only store category counts.

### 9.2 Redaction preview UI

Before upload show:

- detected categories
- counts by category
- sample redacted snippets, with raw secret values hidden
- warning that automated redaction is best-effort
- checkbox/confirmation: “I reviewed this import and understand redaction is best-effort.”

### 9.3 Server-side redaction

Run again after upload and before storage/AI analysis.

Server pass should use the same categories and may add extra redactions. Store `serverSideApplied = true`.

## 10. Data Completeness and Confidence

Because harnesses expose different trace detail, the app must explicitly communicate confidence.

### Confidence rules

High confidence if:

- messages are present
- tool events are present
- diffs or file artifacts are present
- command/test outputs are present
- timestamps are mostly available

Medium confidence if:

- messages and some tool/file references are present
- little/no test output
- partial timestamps

Low confidence if:

- plain transcript only
- no tool calls
- no diffs
- no timestamps

### UI warnings

Examples:

- “No timestamps found; duration is unavailable.”
- “No test output found; correctness confidence may be lower.”
- “No file diffs available; output quality is judged from transcript only.”
- “Source format was inferred from generic transcript parsing.”

## 11. Analysis Job Flow

Analysis should run asynchronously as a background job.

### Job states

```ts
type AnalysisJobStatus =
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
```

### Flow

1. User clicks “Analyze session”.
2. Convex mutation creates job with status `queued`.
3. Background action loads redacted normalized trace.
4. Server-side redaction safety pass runs if needed.
5. Analysis prompt is constructed.
6. AI model returns structured JSON analysis.
7. Validate JSON shape.
8. Store report and rubric scores.
9. Mark job `completed`.
10. If anything fails, mark `failed` with user-readable error and retry eligibility.

### Progress UI

Show:

- current stage
- last updated time
- retry button on failure
- “You can leave this page; analysis will continue.”

## 12. AI Analysis Report

The report must be evidence-backed and actionable, not generic.

### Report schema

```ts
type AnalysisReport = {
  schemaVersion: 1;
  sessionId: string;
  generatedAt: string;
  modelProvider: string;
  modelName: string;
  analysisConfidence: Confidence;
  executiveSummary: string;
  initialGoal: {
    summary: string;
    inferred: boolean;
    evidence: EvidenceReference[];
  };
  outcomeSummary: {
    summary: string;
    evidence: EvidenceReference[];
  };
  qualityAssessment: {
    overallScore: number; // 1-5
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

type EvidenceReference = {
  kind: "message" | "tool-event" | "artifact" | "stat";
  id?: string;
  quote?: string;
  summary: string;
};

type RubricScore = {
  dimension:
    | "goal-alignment"
    | "completeness"
    | "correctness-confidence"
    | "efficiency"
    | "tool-use-quality"
    | "user-collaboration-quality"
    | "risk-level";
  score: number; // 1-5, for risk-level 5 means low risk / well-managed risk
  rationale: string;
  evidence: EvidenceReference[];
};

type ReportFinding = {
  title: string;
  detail: string;
  severity?: "low" | "medium" | "high";
  evidence: EvidenceReference[];
};

type ReportRisk = {
  title: string;
  severity: "low" | "medium" | "high";
  detail: string;
  mitigation: string;
  evidence: EvidenceReference[];
};

type ReportRecommendation = {
  title: string;
  why: string;
  example?: string;
  priority: "low" | "medium" | "high";
};

type TimelineItem = {
  order: number;
  title: string;
  detail: string;
  relatedIds: string[];
};
```

### Report sections in UI

1. Initial goal
2. Outcome summary
3. Quality assessment
4. Rubric scores
5. What went well
6. What went wrong / risks
7. How to improve next time
8. Key stats
9. Condensed timeline

## 13. Quality Rubric

Each dimension is scored 1–5 with evidence.

### 13.1 Goal alignment

Did the result address the initial user goal?

- 1: mostly missed goal
- 2: partially addressed but major mismatch
- 3: addressed core goal with gaps
- 4: well aligned
- 5: exceptionally aligned and anticipated adjacent needs

### 13.2 Completeness

Did it finish the task or leave major gaps?

- 1: incomplete/no useful deliverable
- 2: major unfinished work
- 3: usable but incomplete
- 4: complete enough for intended task
- 5: complete with polish and follow-through

### 13.3 Correctness confidence

Does the trace show evidence the output works?

- 1: likely wrong or unsupported
- 2: no validation and suspicious signs
- 3: plausible but weak evidence
- 4: validated by tests/checks/manual evidence
- 5: strong validation and handled edge cases

### 13.4 Efficiency

Did the agent avoid unnecessary loops/dead ends?

- 1: severe thrashing
- 2: repeated avoidable mistakes
- 3: some inefficiency
- 4: mostly efficient
- 5: direct, well-planned, minimal waste

### 13.5 Tool-use quality

Did it inspect/edit/test appropriately?

- 1: poor or dangerous tool use
- 2: insufficient inspection/validation
- 3: adequate tool use
- 4: good tool selection and sequencing
- 5: excellent observability and verification behavior

### 13.6 User-collaboration quality

Did it ask clarifying questions when needed and communicate clearly?

- 1: ignored user/context
- 2: poor communication
- 3: acceptable communication
- 4: clear and collaborative
- 5: excellent expectation-setting and collaboration

### 13.7 Risk level

Score is inverted: higher means better risk management.

- 1: high unmanaged risk
- 2: notable risk with little mitigation
- 3: moderate risk
- 4: low risk or mitigated
- 5: very low risk and well documented

## 14. Convex Data Model

Exact Convex schema can vary, but implement these conceptual tables.

### users

- `clerkUserId: string`
- `email?: string`
- `name?: string`
- `imageUrl?: string`
- `createdAt: number`
- `updatedAt: number`

Indexes:

- by `clerkUserId`

### sessions

- `userId`
- `source`
- `sourceSessionId?`
- `title`
- `titleInferred`
- `createdAt?`
- `updatedAt?`
- `importedAt`
- `normalizedTraceFileId?`
- `normalizedTraceSummary` small queryable subset
- `stats`
- `dataCompleteness`
- `redactionMetadata`
- `deletedAt?`

Indexes:

- by `userId`, `importedAt`
- by `userId`, `source`

### analysisJobs

- `userId`
- `sessionId`
- `status`
- `progressMessage?`
- `errorMessage?`
- `retryCount`
- `createdAt`
- `updatedAt`
- `completedAt?`

Indexes:

- by `userId`, `createdAt`
- by `sessionId`
- by `status`

### analysisReports

- `userId`
- `sessionId`
- `jobId`
- `generatedAt`
- `modelProvider`
- `modelName`
- `analysisConfidence`
- `report` structured object or file reference if large
- `overallScore`
- `deletedAt?`

Indexes:

- by `userId`, `generatedAt`
- by `sessionId`

### aggregateStats

May be computed live first, materialized later.

Potential fields:

- `userId`
- `sessionCount`
- `analyzedSessionCount`
- `averageOverallScore`
- `averageConfidence`
- `sourceCounts`
- `commonRiskCounts`
- `updatedAt`

## 15. Convex Functions

Recommended function boundaries.

### Auth/user

- `getCurrentUser()` query
- `ensureCurrentUser()` mutation/internal helper
- Clerk webhook handler or lazy user creation on first app load

### Import

- `createImportSession(metadata)` mutation
- `getSession(sessionId)` query
- `listSessions()` query
- `deleteSession(sessionId)` mutation
- `generateUploadUrl()` mutation/action if needed for file storage
- `saveNormalizedTrace(sessionId, storageId, summary)` mutation

### Analysis

- `createAnalysisJob(sessionId)` mutation
- `getAnalysisJob(jobId)` query
- `getLatestReport(sessionId)` query
- `runAnalysisJob(jobId)` action/internal action
- `retryAnalysisJob(jobId)` mutation

### Stats

- `getDashboardStats()` query
- `listRecentSessions()` query

## 16. Client-Side Modules

Create focused modules under `src/lib`.

Suggested structure:

```txt
src/lib/
  auth/
    clerk.ts
  importers/
    types.ts
    detect.ts
    parse-json.ts
    parse-jsonl.ts
    parse-markdown.ts
    parse-plain-text.ts
    claude-code.ts
    cursor.ts
    codex.ts
    pi.ts
    normalize.ts
  redaction/
    patterns.ts
    redact.ts
    types.ts
  analysis/
    types.ts
  components/
    app-shell.svelte
    import/
      source-picker.svelte
      data-input.svelte
      detected-sessions.svelte
      redaction-preview.svelte
      session-preview.svelte
    sessions/
      session-timeline.svelte
      data-completeness-card.svelte
      stats-grid.svelte
      report-view.svelte
      rubric-scores.svelte
```

## 17. Importer Implementation Details

### Parser output

Each parser should return:

```ts
type ImportCandidate = {
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
```

Then normalize candidates into `NormalizedSession`.

### Detection order

When files are provided:

1. Source-specific parser selected by user.
2. Generic structured parser.
3. Markdown/plain transcript parser.
4. Single-artifact fallback.

### Avoid brittle assumptions

Agent harness formats change. Parsers should be tolerant:

- optional chaining
- unknown field preservation in `sourceMetadata`
- warnings rather than fatal errors where possible
- fail only when no usable content exists

## 18. Security and Privacy Requirements

### Must-have

- Require authentication for stored sessions.
- Ensure every Convex query/mutation checks ownership.
- Never return another user’s data.
- Do not store original unredacted files long-term.
- Redact before AI analysis.
- Show user deletion controls.
- Do not use uploads for model training by default.
- Make AI provider/model visible in report metadata.

### Deletion behavior

When user deletes a session:

- soft-delete session metadata immediately or hard-delete if easy
- delete associated Convex storage files
- delete analysis jobs/reports or mark deleted
- remove from dashboard stats

## 19. Error Handling

### Import errors

Show actionable messages:

- unsupported file type
- no sessions detected
- file too large
- parse failed
- browser folder access unavailable

### Analysis errors

Show:

- failed stage
- user-readable message
- retry button
- support/debug metadata hidden behind expandable details

### Partial success

If multiple sessions are imported and some fail:

- import successful sessions
- list failed files/sessions with reason
- allow retry

## 20. MVP Implementation Phases

### Phase 0: Current state

- Minimal SvelteKit app exists.
- shadcn-svelte installed.
- Import wizard mock exists at `src/routes/+page.svelte`.
- Product plan exists in `docs/product-plan.md`.

### Phase 1: App shell and routing

Implement:

- dark app shell layout
- navigation
- routes:
  - `/dashboard`
  - `/import`
  - `/sessions/[id]`
  - `/settings`
- move current mock into `/import` or split into components
- landing/empty dashboard state

Acceptance criteria:

- app navigates between pages
- UI matches developer observability dashboard style
- `vp check` passes

### Phase 2: Clerk auth

Implement:

- Clerk provider integration for SvelteKit
- sign-in/sign-out UI
- protected app routes
- user profile area
- Convex user mapping plan wired or stubbed

Acceptance criteria:

- unauthenticated users cannot access dashboard/import/session/settings
- GitHub, Google, and email magic link are configured in Clerk

### Phase 3: Convex setup

Implement:

- Convex project files
- schema for users, sessions, analysisJobs, analysisReports
- generated Convex client integration
- basic authenticated queries/mutations

Acceptance criteria:

- signed-in user can create/list/delete a mock session
- ownership checks are enforced

### Phase 4: Client-side redaction

Implement:

- redaction pattern library
- redaction function returning redacted text plus category counts
- tests for secret patterns
- redaction preview component

Acceptance criteria:

- common secrets are replaced with typed placeholders
- raw secret values are not included in metadata
- tests cover API keys, emails, paths, private keys, env assignments

### Phase 5: Universal importers

Implement:

- JSON parser
- JSONL parser
- Markdown transcript parser
- plain text parser
- paste transcript flow
- normalize into `NormalizedSession`
- data completeness calculation

Acceptance criteria:

- user can paste transcript and preview normalized session
- user can upload JSON/JSONL/Markdown/text files
- confidence/warnings display correctly

### Phase 6: Native importer first pass

Implement tolerant first-pass native importers for:

- Claude Code
- Cursor
- Codex
- Pi

Acceptance criteria:

- each source option has a parser path
- each parser can produce at least messages and metadata from plausible inputs
- if native parse fails, fallback parser is attempted

### Phase 7: Upload and storage

Implement:

- upload redacted normalized traces to Convex file storage
- save metadata/session row to Convex
- delete temporary raw uploads after processing

Acceptance criteria:

- imported sessions persist across reloads
- session preview page loads from Convex
- raw unredacted content is not stored

### Phase 8: Analysis jobs

Implement:

- create analysis job mutation
- job status UI
- background action stub
- real AI provider abstraction
- structured prompt and output validation
- report storage

Acceptance criteria:

- user can click Analyze
- job progresses through states
- report is generated and stored
- failed jobs can be retried

### Phase 9: Report UI

Implement:

- report view
- rubric score cards
- evidence references
- risk list
- recommendations
- condensed timeline

Acceptance criteria:

- complete analysis report is readable and evidence-backed
- missing data/confidence warnings are visible

### Phase 10: Dashboard stats

Implement:

- recent sessions list
- aggregate cards
- source distribution
- average score/confidence
- common risks

Acceptance criteria:

- dashboard updates from real Convex data
- empty state is polished

### Phase 11: Settings and deletion

Implement:

- profile/account area
- delete one session
- delete all user data
- privacy copy

Acceptance criteria:

- user can remove stored data
- deleted data disappears from dashboard/session routes

## 21. Testing Plan

### Unit tests

Add tests for:

- redaction patterns
- JSON parser
- JSONL parser
- Markdown parser
- plain text role splitter
- normalization
- data completeness scoring
- rubric/report schema validation

### Integration tests

Add tests for:

- import candidate -> redacted normalized session
- normalized session -> stored session metadata
- analysis job lifecycle with mocked AI provider

### Manual QA scenarios

1. Import plain pasted transcript.
2. Import JSONL trace.
3. Import Markdown chat.
4. Import file containing API key and verify redaction before upload.
5. Analyze session with tool calls and diffs.
6. Analyze plain transcript and verify low confidence warnings.
7. Delete session and verify associated report disappears.
8. Try to access another user’s session and verify denial.

## 22. AI Prompting Requirements

The AI analysis prompt should include:

- product role: expert coding-agent trace reviewer
- normalized session JSON
- data completeness warnings
- instruction to cite evidence by message/tool/artifact IDs
- required output JSON schema
- instruction to avoid unsupported claims
- instruction to lower confidence when data is missing
- instruction to produce actionable recommendations

The AI must not be asked to reveal redacted secrets or infer secret values.

## 23. Non-Goals for MVP

Do not implement in MVP unless explicitly requested:

- full repository upload
- team/org analytics
- enterprise compliance controls
- browser extension
- desktop companion app
- BYO API keys
- public sharing links
- automatic filesystem scanning without user selection
- using uploaded data for model training

## 24. Future Enhancements

Potential post-MVP features:

- team workspaces
- project/task grouping across multiple sessions
- trend coaching across many sessions
- benchmark model/agent comparisons
- prompt habit coaching
- export to Markdown/PDF
- GitHub PR correlation
- local desktop helper for easier source discovery
- browser extension for web chat imports
- BYO model/API key option
- report sharing with redacted public links

## 25. Current Implementation Notes

As of this document:

- `src/routes/+page.svelte` contains a static/interactive-looking import wizard UI mock.
- `docs/product-plan.md` is the implementation source of truth.
- shadcn-svelte components are present in `src/lib/components/ui`.
- The next best implementation step is Phase 1: extract the mock into reusable import components and create the app routes.
