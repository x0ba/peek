# Peek API and Data Contract

Contract version: `1`

This contract lets the frontend build against stable shapes before the Convex backend and analysis pipeline are complete. The TypeScript source of truth for frontend imports is `src/lib/contracts/api.ts`.

## Principles

- All persisted endpoints are authenticated.
- Never pass `userId` from the client for authorization; the backend derives ownership from auth.
- Client uploads only redacted normalized traces.
- Server applies a second redaction pass before storage and AI analysis.
- Large trace content lives in Convex file storage; query results return summaries/previews.
- Timestamps in API payloads are ISO strings. Convex documents may store internal times as numbers.

## Frontend-facing operations

| Operation             | Kind later | Args                                | Result                       |
| --------------------- | ---------- | ----------------------------------- | ---------------------------- |
| `getCurrentUser`      | query      | `{}`                                | `CurrentUser \| null`        |
| `listSessions`        | query      | `{ limit?: number }`                | `SessionSummary[]`           |
| `listRecentSessions`  | query      | `{ limit?: number }`                | `SessionSummary[]`           |
| `getSession`          | query      | `{ sessionId: string }`             | `SessionDetail \| null`      |
| `createImportSession` | mutation   | `{ session, redactionReviewed }`    | `{ sessionId, uploadUrl? }`  |
| `saveNormalizedTrace` | mutation   | `{ sessionId, storageId, summary }` | `{ sessionId }`              |
| `deleteSession`       | mutation   | `{ sessionId }`                     | `{ deleted: true }`          |
| `createAnalysisJob`   | mutation   | `{ sessionId }`                     | `AnalysisJobSummary`         |
| `getAnalysisJob`      | query      | `{ jobId }`                         | `AnalysisJobSummary \| null` |
| `retryAnalysisJob`    | mutation   | `{ jobId }`                         | `AnalysisJobSummary`         |
| `getLatestReport`     | query      | `{ sessionId }`                     | `AnalysisReport \| null`     |
| `getDashboardStats`   | query      | `{}`                                | `DashboardStats`             |

## Core DTOs

The complete DTO definitions live in `src/lib/contracts/api.ts`. Key top-level shapes:

- `NormalizedSession`: canonical imported trace shape produced client-side.
- `SessionSummary`: dashboard/list row shape.
- `SessionDetail`: session page shape with preview arrays.
- `AnalysisJobSummary`: analysis progress/status shape.
- `AnalysisReport`: full evidence-backed report shape.
- `DashboardStats`: aggregate dashboard cards and charts.

## Import contract

Frontend importers produce `ImportCandidate[]`, then normalize a selected candidate into `NormalizedSession`.

Upload flow:

1. Client parses source files or pasted text locally.
2. Client redacts content and sets `redactionMetadata.clientSideApplied = true`.
3. Client requires `redactionReviewed = true`.
4. Client calls `createImportSession` with the redacted `NormalizedSession`.
5. If file storage is used, client uploads the full normalized trace blob and calls `saveNormalizedTrace`.
6. UI navigates to `/sessions/[sessionId]`.

`SessionSummary` stores only queryable metadata, stats, redaction counts, and data-completeness flags. Full messages/tool events/artifacts should be loaded from storage or returned as bounded previews.

## Analysis contract

Analysis flow:

1. Client calls `createAnalysisJob({ sessionId })`.
2. Backend returns an `AnalysisJobSummary` with status `queued`.
3. UI subscribes/polls `getAnalysisJob` and `getLatestReport`.
4. Backend progresses through statuses:
   - `queued`
   - `parsing`
   - `redacting`
   - `normalizing`
   - `analyzing`
   - `scoring`
   - `generating-report`
   - terminal: `completed`, `failed`, or `cancelled`
5. On `completed`, `getLatestReport` returns `AnalysisReport`.
6. On `failed`, show `errorMessage` and enable retry when `retryable = true`.

## Error behavior

Until a shared error envelope is implemented, Convex functions should throw user-readable errors. Frontend should map failures into the relevant UI state:

- unauthenticated: redirect/sign-in prompt
- unauthorized/not found: session not found state
- parse/import failure: import wizard error panel
- analysis failure: job error panel with retry

## Mocking guidance

Frontend mocks should import types from `src/lib/contracts/api.ts` and return contract-compliant data. Prefer stable string IDs in mocks so routes and evidence links can be tested before Convex IDs exist.
