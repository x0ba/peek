import type { NormalizedMessage, ToolEvent } from "$lib/contracts/api";
import type { SourceParser } from "./types";
import {
  asRecord,
  confidenceFor,
  extractTextContent,
  inferTitle,
  makeMessageId,
  makeToolEventId,
  parseJsonl,
  roleFrom,
  toolKind,
} from "./utils";

function extractClaudeContent(value: unknown): string {
  if (Array.isArray(value)) return value.map(extractClaudeContent).filter(Boolean).join("\n");
  const block = asRecord(value);
  if (block?.type === "thinking" && typeof block.thinking === "string") return block.thinking;
  return extractTextContent(value);
}

function summarizeToolValue(value: unknown) {
  return extractTextContent(value) || (value === undefined ? "" : JSON.stringify(value));
}

export const parseClaudeCode: SourceParser = (input) =>
  input.files.flatMap((file, fileIndex) => {
    const rows = parseJsonl(file.text ?? "");
    const metadata: Record<string, unknown> = { parser: "claude-code", fileName: file.name };
    const messages: NormalizedMessage[] = [];
    const toolEvents: ToolEvent[] = [];
    const unknownBlockTypes = new Set<string>();
    rows.forEach((row) => {
      const item = asRecord(row);
      if (!item) return;
      for (const key of ["sessionId", "cwd", "version", "aiTitle", "agentName", "timestamp"])
        if (item[key] !== undefined) metadata[key] = item[key];
      if (item.type === "ai-title" && typeof item.aiTitle === "string")
        metadata.aiTitle = item.aiTitle;
      if (item.type === "agent-name" && typeof item.agentName === "string")
        metadata.agentName = item.agentName;
      const nested = asRecord(item.message);
      const payload = nested ?? item;
      const content = extractClaudeContent(
        payload.content ?? payload.text ?? payload.body ?? item.content ?? item.text ?? item.body,
      );
      const role = roleFrom(payload.role ?? item.role);
      if (content.trim() && role !== "unknown")
        messages.push({
          id: makeMessageId(`claude_${fileIndex}`, messages.length),
          role,
          content,
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          model: typeof item.model === "string" ? item.model : undefined,
          sourceEventId: typeof item.uuid === "string" ? item.uuid : undefined,
          metadata: { type: item.type, sessionId: item.sessionId },
        });
      const blocks = Array.isArray(payload.content) ? payload.content : [];
      for (const block of blocks) {
        const b = asRecord(block);
        if (!b) continue;
        if (
          typeof b.type === "string" &&
          ![
            "text",
            "thinking",
            "redacted_thinking",
            "tool_use",
            "tool_result",
            "server_tool_use",
            "web_search_tool_result",
          ].includes(b.type)
        )
          unknownBlockTypes.add(b.type);
        if (
          b.type === "tool_use" ||
          b.type === "tool_result" ||
          b.type === "server_tool_use" ||
          b.type === "web_search_tool_result"
        ) {
          const isResult = b.type === "tool_result" || b.type === "web_search_tool_result";
          const name =
            typeof b.name === "string" ? b.name : typeof b.type === "string" ? b.type : "tool";
          toolEvents.push({
            id: makeToolEventId(`claude_${fileIndex}`, toolEvents.length),
            kind: toolKind(name),
            name,
            inputSummary: isResult ? undefined : summarizeToolValue(b.input).slice(0, 240),
            outputSummary: isResult ? extractTextContent(b.content).slice(0, 240) : undefined,
            rawInputRedacted:
              !isResult && b.input ? JSON.stringify(b.input).slice(0, 2000) : undefined,
            status: b.is_error === true ? "error" : isResult ? "success" : "unknown",
            timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
            relatedMessageId: messages.at(-1)?.id,
            metadata: {
              blockType: b.type,
              toolUseId: b.tool_use_id ?? b.id,
            },
          });
        }
      }
    });
    if (!messages.length) return [];
    return [
      {
        id: `candidate_claude_${fileIndex + 1}`,
        source: input.source,
        title: inferTitle(messages, metadata),
        messages,
        toolEvents,
        artifacts: [],
        sourceMetadata: metadata,
        confidence: confidenceFor(messages, toolEvents, metadata),
        warnings: [
          ...(!messages.some((m) => m.timestamp) ? ["Missing timestamps"] : []),
          ...(toolEvents.length === 0 ? ["Missing tool events"] : []),
          ...[...unknownBlockTypes].map((type) => `Unknown content block type: ${type}`),
        ],
      },
    ];
  });
