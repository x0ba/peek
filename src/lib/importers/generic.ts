import type { NormalizedMessage, ToolEvent } from "$lib/contracts/api";
import type { ImportCandidate, SourceParser } from "./types";
import {
  asRecord,
  confidenceFor,
  extractTextContent,
  fallbackWarnings,
  inferTitle,
  makeMessageId,
  makeToolEventId,
  parseJsonl,
  roleFrom,
  rolePattern,
  safeJsonParse,
  toolKind,
} from "./utils";

function messageFromRecord(
  item: Record<string, unknown>,
  index: number,
  prefix = "generic",
): NormalizedMessage | undefined {
  const nested = asRecord(item.message);
  const source = nested && (nested.role || nested.content) ? { ...item, ...nested } : item;
  const content = extractTextContent(
    source.content ?? source.text ?? source.message ?? source.body ?? source.output,
  );
  if (!content.trim()) return undefined;
  return {
    id: makeMessageId(prefix, index),
    role: roleFrom(source.role ?? source.speaker ?? source.author),
    content,
    timestamp:
      typeof source.timestamp === "string"
        ? source.timestamp
        : typeof source.createdAt === "string"
          ? source.createdAt
          : undefined,
    model: typeof source.model === "string" ? source.model : undefined,
    metadata: source,
  };
}

function maybeJsonMessages(text: string) {
  const parsed = safeJsonParse(text);
  const events = Array.isArray(parsed)
    ? parsed
    : asRecord(parsed)
      ? Object.values(asRecord(parsed)!).find(Array.isArray)
      : undefined;
  if (!Array.isArray(events)) return [];
  return events.flatMap((event, index) => {
    const item = asRecord(event);
    const message = item ? messageFromRecord(item, index) : undefined;
    return message ? [message] : [];
  });
}

function jsonlMessages(text: string) {
  return parseJsonl(text).flatMap((row, index) => {
    const item = asRecord(row);
    const message = item ? messageFromRecord(item, index, "jsonl") : undefined;
    return message ? [message] : [];
  });
}

function transcriptMessages(text: string) {
  const lines = text.trim().split(/\r?\n/);
  const messages: NormalizedMessage[] = [];
  let current: NormalizedMessage | undefined;
  for (const line of lines) {
    const match = line.match(rolePattern);
    if (match) {
      current = {
        id: makeMessageId("transcript", messages.length),
        role: roleFrom(match[1]),
        content: line.replace(rolePattern, "").trim(),
      };
      messages.push(current);
    } else if (current && line.trim()) current.content += `\n${line}`;
  }
  return messages;
}

export function inferToolEvents(messages: NormalizedMessage[]) {
  return messages.flatMap((message, index) =>
    message.role === "tool"
      ? [
          {
            id: makeToolEventId("generic", index),
            kind: toolKind(message.content),
            inputSummary: message.content.slice(0, 240),
            status: /error|failed|exception/i.test(message.content) ? "error" : "unknown",
            relatedMessageId: message.id,
          } satisfies ToolEvent,
        ]
      : [],
  );
}

export const parseGeneric: SourceParser = (input) => {
  const combined = [...input.files.map((file) => file.text ?? ""), input.pastedText]
    .filter(Boolean)
    .join("\n");
  let messages = maybeJsonMessages(combined);
  if (!messages.length) messages = jsonlMessages(combined);
  if (!messages.length) messages = transcriptMessages(combined);
  if (!messages.length && combined.trim())
    messages = [{ id: "generic_msg_1", role: "unknown", content: combined.trim() }];
  if (!messages.length) return [];
  const toolEvents = inferToolEvents(messages);
  const sourceMetadata = {
    parser: "generic",
    files: input.files.map((file) => ({ name: file.name, size: file.size })),
  };
  const candidate: ImportCandidate = {
    id: "candidate_generic_1",
    source: input.source,
    title: inferTitle(messages, sourceMetadata),
    messages,
    toolEvents,
    artifacts: [],
    sourceMetadata,
    confidence: confidenceFor(messages, toolEvents, sourceMetadata),
    warnings: fallbackWarnings(messages, toolEvents),
  };
  return [candidate];
};
