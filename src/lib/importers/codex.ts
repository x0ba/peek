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
            metadata: { turn_id: item.turn_id, type: payload.type },
          });
      } else if (item.type === "response_item" && payload?.type === "message") {
        const content = extractTextContent(payload.content);
        if (content.trim())
          messages.push({
            id: makeMessageId(`codex_${fileIndex}`, messages.length),
            role: roleFrom(payload.role),
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
      if (/function_call|tool_call|shell|command/i.test(candidateType)) {
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
          status: "unknown",
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          metadata: { type: candidateType },
        });
      } else if (/function.*output|tool.*output/i.test(candidateType)) {
        toolEvents.push({
          id: makeToolEventId(`codex_${fileIndex}`, toolEvents.length),
          kind: "other",
          outputSummary: extractTextContent(candidate.output ?? candidate.content).slice(0, 240),
          status: /error|failed/i.test(extractTextContent(candidate.output ?? candidate.content))
            ? "error"
            : "success",
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          metadata: { type: candidateType },
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
