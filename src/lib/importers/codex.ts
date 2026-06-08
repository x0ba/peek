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

function codexUserMessageContent(value: unknown) {
  const content = extractTextContent(value);
  const requestMarker = "\n## My request for Codex:\n";
  const markerIndex = content.indexOf(requestMarker);
  if (markerIndex === -1) return content;
  return content.slice(markerIndex + requestMarker.length).trim();
}

export const parseCodex: SourceParser = (input) =>
  input.files.flatMap((file, fileIndex) => {
    const rows = parseJsonl(file.text ?? "");
    const metadata: Record<string, unknown> = { parser: "codex", fileName: file.name };
    const messages: NormalizedMessage[] = [];
    const toolEvents: ToolEvent[] = [];
    let unrecognizedFunction = false;
    const hasEventMessages = rows.some((row) => {
      const item = asRecord(row);
      const payload = asRecord(item?.payload);
      return (
        item?.type === "event_msg" &&
        (payload?.type === "user_message" || payload?.type === "agent_message")
      );
    });
    rows.forEach((row) => {
      const item = asRecord(row);
      const payload = asRecord(item?.payload);
      if (!item) return;
      if (item.type === "session_meta" && payload)
        Object.assign(metadata, payload, { timestamp: item.timestamp });
      if (payload?.type === "user_message") {
        const content = codexUserMessageContent(payload.message ?? payload.content);
        if (content.trim())
          messages.push({
            id: makeMessageId(`codex_${fileIndex}`, messages.length),
            role: "user",
            content,
            timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
            model: typeof metadata.model === "string" ? metadata.model : undefined,
            metadata: { turn_id: payload.turn_id ?? item.turn_id, type: payload.type },
          });
      } else if (payload?.type === "agent_message") {
        const content = extractTextContent(payload.message ?? payload.content);
        if (content.trim())
          messages.push({
            id: makeMessageId(`codex_${fileIndex}`, messages.length),
            role: "assistant",
            content,
            timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
            model: typeof metadata.model === "string" ? metadata.model : undefined,
            metadata: {
              turn_id: payload.turn_id ?? item.turn_id,
              type: payload.type,
              phase: payload.phase,
            },
          });
      } else if (item.type === "response_item" && payload?.type === "message") {
        const role = roleFrom(payload.role);
        const content = extractTextContent(payload.content);
        const isConversationMessage = role === "user" || role === "assistant";
        if (content.trim() && role !== "unknown" && (!hasEventMessages || !isConversationMessage))
          messages.push({
            id: makeMessageId(`codex_${fileIndex}`, messages.length),
            role,
            content,
            timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
            model: typeof metadata.model === "string" ? metadata.model : undefined,
            metadata: { turn_id: item.turn_id, type: item.type },
          });
      }
      const candidate = payload ?? item;
      const candidateType =
        typeof candidate.type === "string"
          ? candidate.type
          : typeof item.type === "string"
            ? item.type
            : "";
      if (/function.*output|tool.*output/i.test(candidateType)) {
        toolEvents.push({
          id: makeToolEventId(`codex_${fileIndex}`, toolEvents.length),
          kind: "other",
          outputSummary: extractTextContent(candidate.output ?? candidate.content).slice(0, 240),
          status: /error|failed/i.test(extractTextContent(candidate.output ?? candidate.content))
            ? "error"
            : "success",
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          metadata: { type: candidateType, call_id: candidate.call_id },
        });
      } else if (/function_call|tool_call|shell|command/i.test(candidateType)) {
        const name =
          typeof candidate.name === "string"
            ? candidate.name
            : typeof candidate.tool_name === "string"
              ? candidate.tool_name
              : candidateType;
        toolEvents.push({
          id: makeToolEventId(`codex_${fileIndex}`, toolEvents.length),
          kind: toolKind(name),
          name,
          inputSummary: extractTextContent(
            candidate.arguments ?? candidate.input ?? candidate.command,
          ).slice(0, 240),
          rawInputRedacted: extractTextContent(candidate.arguments ?? candidate.input).slice(
            0,
            2000,
          ),
          status: "unknown",
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          relatedMessageId: messages.at(-1)?.id,
          metadata: { type: candidateType, call_id: candidate.call_id },
        });
      } else if (/function/i.test(candidateType)) unrecognizedFunction = true;
    });
    if (!messages.length) return [];
    return [
      {
        id: `candidate_codex_${fileIndex + 1}`,
        source: input.source,
        title: inferTitle(messages, metadata),
        messages,
        toolEvents,
        artifacts: [],
        sourceMetadata: metadata,
        confidence: confidenceFor(messages, toolEvents, metadata),
        warnings: [
          ...(!messages.some((m) => m.role === "user")
            ? ["Developer/system-only content with no user request"]
            : []),
          ...(toolEvents.length === 0
            ? ["Rollout contains no recognized tool/function events"]
            : []),
          ...(unrecognizedFunction ? ["Function call shape not recognized"] : []),
        ],
      },
    ];
  });
