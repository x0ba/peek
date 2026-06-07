import type { Confidence, NormalizedMessage, ToolEvent, ToolEventKind } from "$lib/contracts/api";

export const rolePattern = /^(user|human|assistant|ai|system|developer|tool)\s*:\s*/i;

export function safeJsonParse(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function parseJsonl(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(safeJsonParse)
    .filter((row) => row !== undefined);
}

export function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function roleFrom(value: unknown): NormalizedMessage["role"] {
  if (typeof value !== "string") return "unknown";
  const rawRole = value.toLowerCase();
  if (rawRole === "human") return "user";
  if (rawRole === "ai") return "assistant";
  if (rawRole === "developer") return "system";
  if (["user", "assistant", "system", "tool"].includes(rawRole))
    return rawRole as NormalizedMessage["role"];
  return "unknown";
}

function summarize(value: unknown) {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  return JSON.stringify(value);
}

export function extractTextContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractTextContent).filter(Boolean).join("\n");
  const record = asRecord(value);
  if (!record) return "";
  if (typeof record.text === "string") return record.text;
  if (typeof record.content === "string" || Array.isArray(record.content))
    return extractTextContent(record.content);
  if (typeof record.message === "string" || Array.isArray(record.message))
    return extractTextContent(record.message);
  if (typeof record.body === "string") return record.body;
  if (record.type === "tool_use") {
    const name = typeof record.name === "string" ? record.name : "tool";
    return `[tool use] ${name} ${summarize(record.input).slice(0, 500)}`;
  }
  if (record.type === "tool_result")
    return `[tool result] ${summarize(record.content).slice(0, 500)}`;
  return "";
}

export function makeMessageId(prefix: string, index: number) {
  return `${prefix}_msg_${index + 1}`;
}

export function makeToolEventId(prefix: string, index: number) {
  return `${prefix}_tool_${index + 1}`;
}

export function firstUserText(messages: NormalizedMessage[]) {
  return messages.find((message) => message.role === "user")?.content;
}

export function inferTitle(messages: NormalizedMessage[], metadata: Record<string, unknown> = {}) {
  const metaTitle = metadata.aiTitle ?? metadata.title ?? metadata.name;
  if (typeof metaTitle === "string" && metaTitle.trim()) return metaTitle.trim().slice(0, 120);
  return firstUserText(messages)?.slice(0, 80) || "Imported agent session";
}

export function confidenceFor(
  messages: NormalizedMessage[],
  toolEvents: ToolEvent[],
  metadata: Record<string, unknown> = {},
): Confidence {
  const hasTimestamps =
    messages.some((message) => Boolean(message.timestamp)) || Boolean(metadata.timestamp);
  if (messages.length >= 4 && toolEvents.length > 0 && hasTimestamps) return "high";
  if (messages.length >= 2 || toolEvents.length > 0) return "medium";
  return messages.length ? "low" : "unknown";
}

export function toolKind(nameOrText: string): ToolEventKind {
  if (/bash|shell|command|terminal|exec/i.test(nameOrText)) return "command";
  if (/read|cat/i.test(nameOrText)) return "read";
  if (/edit|patch/i.test(nameOrText)) return "edit";
  if (/write/i.test(nameOrText)) return "write";
  if (/grep|glob|search|find/i.test(nameOrText)) return "search";
  if (/test|check|vitest|svelte-check/i.test(nameOrText)) return "test";
  return "other";
}

export function fallbackWarnings(messages: NormalizedMessage[], toolEvents: ToolEvent[]) {
  return [
    ...(!messages.some((message) => Boolean(message.timestamp))
      ? ["No timestamps found; duration is unavailable."]
      : []),
    ...(toolEvents.length === 0
      ? ["No tool events found; transcript fallback confidence is lower."]
      : []),
    "No file diffs found; output quality will use transcript evidence.",
  ];
}
