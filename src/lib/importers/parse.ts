import type {
  AgentSource,
  Confidence,
  NormalizedMessage,
  NormalizedSession,
  RedactionCategoryCount,
  ToolEvent,
} from "$lib/contracts/api";

const rolePattern = /^(user|human|assistant|ai|system|tool)\s*:\s*/i;

const sourceHints: Record<AgentSource, string[]> = {
  "claude-code": [
    "Select Claude project JSONL files, usually under ~/.claude/projects/<project>/, or paste the transcript.",
  ],
  cursor: [
    "Choose exported Cursor chat/composer JSON or Markdown from your workspace; paste is always supported.",
  ],
  codex: [
    "Choose Codex CLI JSONL trace/session files when available, or paste terminal transcript output.",
  ],
  pi: [
    "Choose Pi session logs/exported traces from your Pi coding-agent history, or paste the transcript fallback.",
  ],
  manual: ["Upload JSON, JSONL, Markdown, text, or paste any transcript."],
  unknown: ["Upload or paste any text-like trace."],
};

function roleFrom(value: string): NormalizedMessage["role"] {
  const rawRole = value.toLowerCase();
  if (rawRole === "human") return "user";
  if (rawRole === "ai") return "assistant";
  if (["user", "assistant", "system", "tool"].includes(rawRole))
    return rawRole as NormalizedMessage["role"];
  return "unknown";
}

function maybeJsonMessages(text: string) {
  try {
    const parsed = JSON.parse(text) as unknown;
    const events = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed
        ? Object.values(parsed as Record<string, unknown>).find(Array.isArray)
        : undefined;
    if (!Array.isArray(events)) return [];
    return events.flatMap((event, index) => {
      if (!event || typeof event !== "object") return [];
      const item = event as Record<string, unknown>;
      const content = item.content ?? item.text ?? item.message ?? item.body;
      if (typeof content !== "string") return [];
      return [
        {
          id: `msg_${index + 1}`,
          role: typeof item.role === "string" ? roleFrom(item.role) : "unknown",
          content,
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          model: typeof item.model === "string" ? item.model : undefined,
          metadata: item,
        } satisfies NormalizedMessage,
      ];
    });
  } catch {
    return [];
  }
}

function jsonlMessages(text: string) {
  return text.split(/\r?\n/).flatMap((line, index) => {
    try {
      const item = JSON.parse(line) as Record<string, unknown>;
      const content = item.content ?? item.text ?? item.message ?? item.body ?? item.output;
      if (typeof content !== "string") return [];
      return [
        {
          id: `msg_${index + 1}`,
          role: typeof item.role === "string" ? roleFrom(item.role) : "unknown",
          content,
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          model: typeof item.model === "string" ? item.model : undefined,
          metadata: item,
        } satisfies NormalizedMessage,
      ];
    } catch {
      return [];
    }
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
        id: `msg_${messages.length + 1}`,
        role: roleFrom(match[1]),
        content: line.replace(rolePattern, "").trim(),
      };
      messages.push(current);
    } else if (current && line.trim()) current.content += `\n${line}`;
  }
  return messages;
}

function inferToolEvents(messages: NormalizedMessage[]) {
  return messages.flatMap((message, index) =>
    message.role === "tool"
      ? [
          {
            id: `tool_${index + 1}`,
            kind: /test|check|vitest|svelte-check/i.test(message.content)
              ? "test"
              : /bash|shell|command|terminal/i.test(message.content)
                ? "command"
                : "other",
            inputSummary: message.content.slice(0, 240),
            status: /error|failed|exception/i.test(message.content) ? "error" : "unknown",
            relatedMessageId: message.id,
          } satisfies ToolEvent,
        ]
      : [],
  );
}

function confidenceFor(
  messages: NormalizedMessage[],
  toolEvents: ToolEvent[],
  hasTimestamps: boolean,
): Confidence {
  if (messages.length >= 4 && toolEvents.length > 0 && hasTimestamps) return "high";
  if (messages.length >= 3 || toolEvents.length > 0) return "medium";
  return "low";
}

export function parseTranscript(text: string, source: AgentSource) {
  let messages: NormalizedMessage[] = maybeJsonMessages(text);
  if (!messages.length) messages = jsonlMessages(text);
  if (!messages.length) messages = transcriptMessages(text);
  if (!messages.length && text.trim())
    messages = [{ id: "msg_1", role: "unknown", content: text.trim() }];
  const toolEvents = inferToolEvents(messages);
  const hasTimestamps = messages.some((message) => Boolean(message.timestamp));
  const confidence = confidenceFor(messages, toolEvents, hasTimestamps);
  return {
    title:
      messages.find((message) => message.role === "user")?.content.slice(0, 80) ||
      "Imported agent session",
    messages,
    toolEvents,
    confidence,
    warnings: [
      ...sourceHints[source],
      ...(!hasTimestamps ? ["No timestamps found; duration is unavailable."] : []),
      ...(toolEvents.length === 0
        ? ["No tool events found; transcript fallback confidence is lower."]
        : []),
      "No file diffs found; output quality will use transcript evidence.",
    ],
    source,
  };
}

export function normalizeImport(
  text: string,
  redactedText: string,
  source: AgentSource,
  categories: RedactionCategoryCount[],
): NormalizedSession {
  const parsed = parseTranscript(redactedText, source);
  const hasTimestamps = parsed.messages.some((message) => Boolean(message.timestamp));
  const hasTestResults = parsed.toolEvents.some((event) => event.kind === "test");
  const errorCount = parsed.toolEvents.filter((event) => event.status === "error").length;
  return {
    schemaVersion: 1,
    source,
    sourceMetadata: { originalCharacterCount: text.length, importMode: "guided-file-or-paste" },
    title: parsed.title,
    titleInferred: true,
    importedAt: new Date().toISOString(),
    messages: parsed.messages,
    toolEvents: parsed.toolEvents,
    artifacts: [],
    stats: {
      messageCount: parsed.messages.length,
      userTurnCount: parsed.messages.filter((m) => m.role === "user").length,
      assistantTurnCount: parsed.messages.filter((m) => m.role === "assistant").length,
      toolCallCount: parsed.toolEvents.length,
      errorCount,
      filesTouchedCount: 0,
    },
    redactionMetadata: {
      clientSideApplied: true,
      serverSideApplied: false,
      categories,
      notes: ["Client-side best-effort redaction applied before upload."],
    },
    dataCompleteness: {
      confidence: parsed.confidence,
      hasTimestamps,
      hasToolEvents: parsed.toolEvents.length > 0,
      hasDiffs: false,
      hasCommandOutputs: parsed.toolEvents.some((event) => event.kind === "command"),
      hasTestResults,
      hasModelMetadata: parsed.messages.some((m) => Boolean(m.model)),
      warnings: parsed.warnings,
    },
  };
}
