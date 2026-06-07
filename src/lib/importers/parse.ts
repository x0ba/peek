import type { AgentSource, NormalizedSession, RedactionCategoryCount } from "$lib/contracts/api";
import { parseClaudeCode } from "./claude-code";
import { parseCodex } from "./codex";
import { parseCursor } from "./cursor";
import { parseGeneric } from "./generic";
import { parsePi } from "./pi";
import type { ImportCandidate, ImportFileInput, SourceParser } from "./types";

const sourceParsers: Partial<Record<AgentSource, SourceParser>> = {
  "claude-code": parseClaudeCode,
  cursor: parseCursor,
  codex: parseCodex,
  pi: parsePi,
};

export type { ImportCandidate, ImportFileInput, SourceParser } from "./types";

export function parseImport(input: {
  files?: ImportFileInput[];
  pastedText?: string;
  source: AgentSource;
}) {
  const parserInput = {
    files: input.files ?? [],
    pastedText: input.pastedText ?? "",
    source: input.source,
  };
  const sourceCandidates = sourceParsers[input.source]?.(parserInput) ?? [];
  if (sourceCandidates.length) return sourceCandidates;
  return parseGeneric(parserInput);
}

export function parseTranscript(text: string, source: AgentSource) {
  return (
    parseImport({ pastedText: text, source })[0] ?? {
      id: "candidate_empty",
      title: "Imported agent session",
      messages: [],
      toolEvents: [],
      artifacts: [],
      sourceMetadata: {},
      confidence: "unknown" as const,
      warnings: ["No importable content found."],
      source,
    }
  );
}

export function normalizedTextFromCandidate(candidate: ImportCandidate) {
  return candidate.messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
}

export function normalizeCandidate(
  candidate: ImportCandidate,
  categories: RedactionCategoryCount[],
  originalCharacterCount: number,
): NormalizedSession {
  const hasTimestamps = candidate.messages.some((message) => Boolean(message.timestamp));
  const titleInferred = ![
    candidate.sourceMetadata.aiTitle,
    candidate.sourceMetadata.title,
    candidate.sourceMetadata.name,
  ].some((title) => typeof title === "string" && title.trim());
  const hasTestResults = candidate.toolEvents.some((event) => event.kind === "test");
  const errorCount = candidate.toolEvents.filter((event) => event.status === "error").length;
  return {
    schemaVersion: 1,
    source: candidate.source,
    sourceSessionId:
      typeof candidate.sourceMetadata.id === "string"
        ? candidate.sourceMetadata.id
        : typeof candidate.sourceMetadata.sessionId === "string"
          ? candidate.sourceMetadata.sessionId
          : undefined,
    sourceMetadata: {
      ...candidate.sourceMetadata,
      originalCharacterCount,
      importMode: "guided-file-or-paste",
    },
    title: candidate.title,
    titleInferred,
    importedAt: new Date().toISOString(),
    messages: candidate.messages,
    toolEvents: candidate.toolEvents,
    artifacts: candidate.artifacts,
    stats: {
      messageCount: candidate.messages.length,
      userTurnCount: candidate.messages.filter((m) => m.role === "user").length,
      assistantTurnCount: candidate.messages.filter((m) => m.role === "assistant").length,
      toolCallCount: candidate.toolEvents.length,
      errorCount,
      filesTouchedCount: candidate.artifacts.filter(
        (artifact) =>
          artifact.kind === "file" || artifact.kind === "file-diff" || artifact.kind === "path",
      ).length,
    },
    redactionMetadata: {
      clientSideApplied: true,
      serverSideApplied: false,
      categories,
      notes: ["Client-side best-effort redaction applied before upload."],
    },
    dataCompleteness: {
      confidence: candidate.confidence,
      hasTimestamps,
      hasToolEvents: candidate.toolEvents.length > 0,
      hasDiffs: candidate.artifacts.some((artifact) => artifact.kind === "file-diff"),
      hasCommandOutputs: candidate.toolEvents.some((event) => event.kind === "command"),
      hasTestResults,
      hasModelMetadata: candidate.messages.some((m) => Boolean(m.model)),
      warnings: candidate.warnings,
    },
  };
}

/** @deprecated Use normalizeCandidate(redactedCandidate(parsed), ...) instead. */
export function normalizeImport(
  text: string,
  redactedText: string,
  source: AgentSource,
  categories: RedactionCategoryCount[],
): NormalizedSession {
  return normalizeCandidate(parseTranscript(redactedText, source), categories, text.length);
}
