import type { NormalizedMessage } from "$lib/contracts/api";
import type { SourceParser } from "./types";
import {
  asRecord,
  confidenceFor,
  extractTextContent,
  inferTitle,
  makeMessageId,
  roleFrom,
  safeJsonParse,
} from "./utils";
import { inferToolEvents, parseGeneric } from "./generic";

function markdownMessages(text: string) {
  const messages: NormalizedMessage[] = [];
  const sections = text.split(
    /\n(?=#{1,6}\s*(?:User|Human|Assistant|AI|System|Tool)\b)|\n(?=\*\*(?:User|Human|Assistant|AI|System|Tool)\*\*)/i,
  );
  for (const section of sections) {
    const match = section.match(
      /^(?:#{1,6}\s*)?(?:\*\*)?(User|Human|Assistant|AI|System|Tool)(?:\*\*)?\s*:?\s*\n?/i,
    );
    if (!match) continue;
    const content = section.slice(match[0].length).trim();
    if (content)
      messages.push({
        id: makeMessageId("cursor_md", messages.length),
        role: roleFrom(match[1]),
        content,
      });
  }
  return messages;
}

function jsonMessages(text: string) {
  const parsed = safeJsonParse(text);
  const root = asRecord(parsed);
  const arrays = [parsed, ...(root ? Object.values(root) : [])].filter(
    Array.isArray,
  ) as unknown[][];
  return arrays.flatMap((array) =>
    array.flatMap((value, index) => {
      const item = asRecord(value);
      const content = item
        ? extractTextContent(item.content ?? item.text ?? item.prompt ?? item.message)
        : "";
      return item && content.trim()
        ? [
            {
              id: makeMessageId("cursor_json", index),
              role: roleFrom(item.role ?? item.speaker ?? (item.prompt ? "user" : undefined)),
              content,
              timestamp: typeof item.timestamp === "string" ? item.timestamp : undefined,
              metadata: item,
            } satisfies NormalizedMessage,
          ]
        : [];
    }),
  );
}

export const parseCursor: SourceParser = (input) => {
  const candidates = input.files.flatMap((file, fileIndex) => {
    const text = file.text ?? "";
    const messages = file.name.endsWith(".md") ? markdownMessages(text) : jsonMessages(text);
    if (!messages.length) return [];
    const toolEvents = inferToolEvents(messages);
    const sourceMetadata = { parser: "cursor-export", fileName: file.name };
    return [
      {
        id: `candidate_cursor_${fileIndex + 1}`,
        source: input.source,
        title: inferTitle(messages, sourceMetadata),
        messages,
        toolEvents,
        artifacts: [],
        sourceMetadata,
        confidence: confidenceFor(messages, toolEvents, sourceMetadata),
        warnings: [
          "Cursor export parsing is best-effort",
          ...(toolEvents.length === 0
            ? ["Assistant responses or tool events may be missing depending on Cursor version"]
            : []),
        ],
      },
    ];
  });
  return candidates.length ? candidates : parseGeneric(input);
};
