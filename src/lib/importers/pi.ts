import type { NormalizedMessage, NormalizedSession, ToolEvent } from "$lib/contracts/api";
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

export const parsePi: SourceParser = (input) =>
  input.files.flatMap((file, fileIndex) => {
    const rows = parseJsonl(file.text ?? "");
    const metadata: Record<string, unknown> = { parser: "pi", fileName: file.name };
    const messages: NormalizedMessage[] = [];
    const toolEvents: ToolEvent[] = [];
    const artifacts: NormalizedSession["artifacts"] = [];
    let activeModel: string | undefined;
    let hasBranching = false;
    let hasHeader = false;
    const rowIds = new Set(
      rows.map((row) => asRecord(row)?.id).filter((id): id is string => typeof id === "string"),
    );
    rows.forEach((row) => {
      const item = asRecord(row);
      if (!item) return;
      if (item.type === "session") {
        hasHeader = true;
        for (const key of ["version", "id", "timestamp", "cwd"]) metadata[key] = item[key];
      }
      if (item.type === "model_change")
        activeModel = typeof item.modelId === "string" ? item.modelId : undefined;
      if (typeof item.parentId === "string" && !rowIds.has(item.parentId)) hasBranching = true;
      if (item.type === "message" || item.type === "custom_message") {
        if (item.type === "custom_message" && item.display === false) return;
        const payload = asRecord(item.message) ?? item;
        const content = extractTextContent(
          payload.content ?? payload.text ?? payload.body ?? payload.message,
        );
        if (!content.trim()) return;
        const role = roleFrom(payload.role ?? item.role);
        const id =
          typeof item.id === "string" ? item.id : makeMessageId(`pi_${fileIndex}`, messages.length);
        messages.push({
          id,
          role,
          content,
          timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
          model: activeModel,
          sourceEventId: typeof item.id === "string" ? item.id : undefined,
          metadata: { parentId: item.parentId, type: item.type },
        });
        if (role === "tool" || /command|output|status|bash/i.test(Object.keys(payload).join(" "))) {
          toolEvents.push({
            id: makeToolEventId(`pi_${fileIndex}`, toolEvents.length),
            kind: toolKind(content),
            inputSummary: content.slice(0, 240),
            status: /error|failed/i.test(content) ? "error" : "unknown",
            timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
            relatedMessageId: id,
          });
        }
      }
      if (item.type === "compaction" || item.type === "branch_summary")
        artifacts.push({
          id: `pi_artifact_${artifacts.length + 1}`,
          kind: "other" as const,
          summary: extractTextContent(item.summary ?? item.content ?? item.text).slice(0, 500),
          metadata: { type: item.type },
        });
      if (item.type === "thinking_level_change") metadata.thinkingLevel = item.level;
    });
    if (!messages.length) return [];
    return [
      {
        id: `candidate_pi_${fileIndex + 1}`,
        source: input.source,
        title: inferTitle(messages, metadata),
        messages,
        toolEvents,
        artifacts,
        sourceMetadata: metadata,
        confidence: confidenceFor(messages, toolEvents, metadata),
        warnings: [
          ...(hasBranching
            ? ["Branched session detected; imported append order rather than a selected branch"]
            : []),
          ...(!hasHeader ? ["Header missing"] : []),
          ...(toolEvents.length === 0 ? ["No tool events recognized"] : []),
        ],
      },
    ];
  });
