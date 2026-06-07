# Per-Agent Import Parsing Plan

## Goal

Make the import wizard parse uploaded local agent traces with source-specific logic based on the agent selected in step 1, then fall back to generic transcript parsing when the trace is incomplete or unknown.

Supported sources today:

1. Claude Code
2. Cursor
3. Codex
4. Pi
5. Manual / unknown

## Current state

- Import UI is in `src/routes/import/+page.svelte`.
- Normalization is in `src/lib/importers/parse.ts`.
- Current parsing is generic:
  1. JSON object/array message extraction
  2. JSONL line extraction
  3. role-prefixed transcript extraction
  4. single unknown message fallback
- The wizard now shows source-specific upload hints during the upload step.

## Desired import flow

1. User selects source in step 1.
2. User uploads one or more files, or pastes text in step 2.
3. Import code chooses a parser using the selected `AgentSource`.
4. Source parser attempts high-confidence extraction.
5. If source parser cannot produce messages, generic parser runs as fallback.
6. UI shows an `ImportCandidate` preview in step 3:
   - title
   - source
   - message count
   - tool event count
   - confidence
   - warnings
   - metadata such as cwd, model, session id, timestamps
7. User continues through redaction and import.

## Data model additions

The existing `NormalizedSession` shape can remain the persistence target. Add intermediate parser shapes for better import UX.

```ts
export type ImportCandidate = {
  id: string;
  source: AgentSource;
  title: string;
  messages: NormalizedMessage[];
  toolEvents: ToolEvent[];
  artifacts: NormalizedSession["artifacts"];
  sourceMetadata: Record<string, unknown>;
  confidence: Confidence;
  warnings: string[];
};

export type ImportFileInput = {
  name: string;
  text?: string;
  bytes?: Uint8Array;
  type?: string;
  size: number;
  lastModified?: number;
};

export type SourceParser = (input: {
  files: ImportFileInput[];
  pastedText: string;
  source: AgentSource;
}) => ImportCandidate[];
```

For the first implementation, this can be simplified to one file plus pasted text, but design the parser boundary for multi-file support.

## Parser registry

Create source-specific modules under `src/lib/importers/`:

```txt
src/lib/importers/
  parse.ts
  generic.ts
  claude-code.ts
  codex.ts
  cursor.ts
  pi.ts
  types.ts
```

`parse.ts` should become orchestration:

```ts
const sourceParsers: Partial<Record<AgentSource, SourceParser>> = {
  "claude-code": parseClaudeCode,
  cursor: parseCursor,
  codex: parseCodex,
  pi: parsePi,
};

export function parseImport(input) {
  const sourceCandidates = sourceParsers[input.source]?.(input) ?? [];
  if (sourceCandidates.length) return sourceCandidates;
  return parseGeneric(input);
}
```

Keep `parseTranscript` as a compatibility wrapper until the UI migrates to `parseImport`.

## Shared utilities

Add reusable helpers:

- `parseJsonl(text): unknown[]`
- `safeJsonParse(value): unknown | undefined`
- `extractTextContent(value): string`
- `roleFrom(value): NormalizedMessage["role"]`
- `confidenceFor(messages, toolEvents, metadata)`
- `makeMessageId(prefix, index)`
- `makeToolEventId(prefix, index)`
- `firstUserText(messages)`
- `inferTitle(messages, metadata)`

Content extraction should handle:

- plain strings
- arrays of content blocks
- OpenAI-style `{ type: "input_text" | "output_text", text }`
- Anthropic-style `{ type: "text", text }`
- tool use/result blocks
- nested message payloads

## Claude Code parser

### Expected files

```txt
~/.claude/projects/<encoded-project-path>/*.jsonl
```

### Input format

Newline-delimited JSON. Known metadata rows include:

```json
{"type":"ai-title","aiTitle":"...","sessionId":"..."}
{"type":"agent-name","agentName":"...","sessionId":"..."}
```

Message rows may use nested `message` data, top-level role/content fields, and tool-use content blocks.

### Implementation

1. Parse each `.jsonl` file line-by-line.
2. Extract metadata:
   - `sessionId`
   - `cwd`
   - `version`
   - `aiTitle`
   - `agentName`
3. Convert message-like rows into `NormalizedMessage`:
   - `message.role`
   - `message.content`
   - top-level `role`, `content`, `text`, or `body`
4. Convert tool blocks into `ToolEvent`:
   - tool use blocks
   - tool result blocks
   - known Claude Code tool names like `Bash`, `Read`, `Edit`, `Write`, `Grep`, `Glob`, `TodoWrite`
5. Preserve raw row metadata on each message where useful.
6. Confidence:
   - high if messages + timestamps + tool events exist
   - medium if messages exist but tool events or timestamps are missing
   - low if only fallback text is available

### Warnings

- Missing timestamps
- Missing tool events
- Metadata-only file
- Unknown content block types

## Codex parser

### Expected files

```txt
~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
```

### Input format

Newline-delimited JSON. Observed rows:

```json
{
  "timestamp": "...",
  "type": "session_meta",
  "payload": {
    "id": "...",
    "cwd": "...",
    "cli_version": "...",
    "source": "vscode",
    "model_provider": "openai"
  }
}
```

```json
{
  "timestamp": "...",
  "type": "response_item",
  "payload": {
    "type": "message",
    "role": "developer",
    "content": [{ "type": "input_text", "text": "..." }]
  }
}
```

Other useful row types include `event_msg` and response/tool/function payloads.

### Implementation

1. Parse JSONL rows.
2. `session_meta` becomes source metadata:
   - id
   - cwd
   - cli version
   - originator/source
   - model provider
   - base instructions summary if needed
3. `response_item.payload.type === "message"` becomes a message.
4. Role mapping:
   - `user` -> user
   - `assistant` -> assistant
   - `system` / `developer` -> system
   - unknown -> unknown
5. Content extraction:
   - `input_text.text`
   - `output_text.text`
   - plain text strings
6. Tool events:
   - function call payloads
   - function call output payloads
   - shell/command events if present
   - task lifecycle events as metadata, not messages, unless they carry useful text
7. Group related rows by `turn_id` when available.

### Warnings

- Rollout contains only metadata/task lifecycle rows
- Developer/system-only content with no user request
- Function call shape not recognized

## Pi parser

### Expected files

```txt
~/.pi/agent/sessions/<encoded-cwd>/*.jsonl
```

### Input format

Append-only JSONL session files with a session header and tree entries.

Header:

```json
{ "type": "session", "version": 3, "id": "...", "timestamp": "...", "cwd": "..." }
```

Entry examples:

```json
{
  "type": "model_change",
  "id": "...",
  "parentId": null,
  "timestamp": "...",
  "provider": "openai-codex",
  "modelId": "gpt-5.5"
}
```

```json
{ "type": "message", "id": "...", "parentId": "...", "timestamp": "...", "message": {} }
```

Other entry types:

- `thinking_level_change`
- `compaction`
- `branch_summary`
- `custom`
- `custom_message`
- `label`
- `session_info`

### Implementation

1. Parse JSONL rows.
2. Header becomes metadata.
3. Track active model from `model_change` entries and attach it to following messages.
4. `message` entries become normalized messages using the nested agent message shape.
5. `custom_message` entries become messages if `display` is true or if they participate in context.
6. `compaction` and `branch_summary` become artifacts or system messages.
7. `thinking_level_change` becomes metadata.
8. Tool events:
   - bash execution messages
   - custom tool messages
   - role `tool`
   - messages with command/output/status fields
9. Preserve tree identifiers:
   - `id`
   - `parentId`
   - labels if available

### Warnings

- Branched session detected; parser imported append order rather than a selected branch
- Header missing
- Message shape not recognized

Future enhancement: reconstruct the active branch using Pi's tree structure rather than importing every append-order entry.

## Cursor parser

Cursor should be implemented in two phases because its local DB format is undocumented and changes over time.

### Phase 1: exported Cursor content

Support:

- Markdown exports
- JSON exports
- copied transcripts
- SpecStory-style Markdown if present

Implementation:

1. Detect Markdown role sections and transcript markers.
2. Extract user/assistant/tool turns.
3. Fall back to generic transcript parsing.

### Phase 2: `state.vscdb` upload

Expected files:

```txt
~/Library/Application Support/Cursor/User/workspaceStorage/<workspace-id>/state.vscdb
%APPDATA%\\Cursor\\User\\workspaceStorage\\<workspace-id>\\state.vscdb
```

Observed `ItemTable` keys:

- `composer.composerData`
- `aiService.prompts`
- `aiService.generations`
- `workbench.backgroundComposer.workspacePersistentData`

Implementation options:

1. Client-side SQLite with `sql.js`.
2. Dedicated local helper CLI that exports JSON from Cursor DB, then upload JSON.
3. Server-side SQLite parsing is not preferred because raw local DBs may contain sensitive data and should stay client-side.

Recommended first implementation: use `sql.js` in the browser.

Query:

```sql
SELECT key, value FROM ItemTable
WHERE key IN (
  'composer.composerData',
  'aiService.prompts',
  'aiService.generations'
)
OR key LIKE '%composer%'
OR key LIKE '%chat%'
OR key LIKE '%aiService%';
```

Parsing strategy:

- `aiService.prompts[]` -> user messages
- `aiService.generations[]` -> title/session candidates and timestamps
- `composer.composerData` -> selected composer IDs and possible richer composer metadata
- Other JSON values -> inspect for arrays/objects with message-like fields

Confidence:

- medium if prompts and generations can be matched
- low if only prompt history is present
- high only if full user/assistant turns and timestamps are reconstructed

Warnings:

- Cursor database parsing is best-effort
- Assistant responses may be missing depending on Cursor version
- Uploaded global DB may not map cleanly to one workspace/session

## Manual / unknown parser

Keep the existing generic behavior:

1. JSON object/array extraction
2. JSONL extraction
3. role-prefixed transcript extraction
4. raw text fallback

Improve generic parser to detect common fields:

- `role`
- `speaker`
- `author`
- `content`
- `text`
- `message`
- `body`
- `timestamp`
- `createdAt`
- `model`

## UI changes

### Upload step

Already added detailed hints. Next additions:

- Show accepted file types based on selected source.
- Support multiple files.
- Show selected files list with size and detected parser.
- Warn if file name does not match the selected source pattern.

### Detected step

Replace single parsed result with candidate picker:

- Candidate title
- Source
- File name
- Message count
- Tool event count
- Confidence
- Warnings

If one file creates multiple candidates, show all candidates.

### Redaction and preview

Redaction should run on the selected candidate's normalized text representation, not raw uploaded text only. Preserve source metadata but redact sensitive values in message/tool/artifact content.

## Privacy and security

- Parsing should remain client-side.
- Do not upload raw files before redaction.
- Cursor DB parsing must be client-side if implemented.
- Keep raw source rows out of persisted metadata unless redacted and explicitly needed.
- Cap previewed raw metadata to avoid accidentally displaying huge or sensitive data.

## Testing plan

Add unit tests for each parser using fixture files.

Fixtures:

```txt
src/lib/importers/fixtures/
  claude-code.basic.jsonl
  claude-code.tools.jsonl
  codex.rollout.basic.jsonl
  codex.rollout.tools.jsonl
  pi.session.basic.jsonl
  pi.session.branching.jsonl
  cursor.export.md
  cursor.prompts-generations.json
  generic.transcript.txt
```

Tests should assert:

- message count
- role mapping
- timestamp extraction
- tool event extraction
- confidence
- warnings
- title inference
- metadata extraction

## Implementation milestones

### Milestone 1: parser architecture

- Add parser type definitions.
- Split generic parser into its own module.
- Add parser registry.
- Keep `parseTranscript` compatibility wrapper.
- Add tests for current generic behavior.

### Milestone 2: JSONL agents

- Implement Claude Code parser.
- Implement Codex parser.
- Implement Pi parser.
- Add fixture tests.

### Milestone 3: import candidates UI

- Add multi-file upload support.
- Show candidate picker in detected step.
- Normalize selected candidate into `NormalizedSession`.

### Milestone 4: Cursor exports

- Implement Cursor Markdown/JSON export parser.
- Add tests for exported formats and copied transcripts.

### Milestone 5: Cursor SQLite

- Add `sql.js` via package manager.
- Parse uploaded `state.vscdb` client-side.
- Add best-effort candidate extraction.
- Add clear warnings for incomplete reconstructions.

## Validation commands

After implementation:

```bash
vp check
vp test
```

If importer tests are not currently configured, add or update the project test setup before relying on parser changes.
