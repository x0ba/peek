import type { AgentSource, Confidence, NormalizedMessage } from "$lib/contracts/api";

const rolePattern = /^(user|human|assistant|ai|system|tool)\s*:\s*/i;

export function parseTranscript(text: string, source: AgentSource) {
  const lines = text.trim().split(/\r?\n/);
  const messages: NormalizedMessage[] = [];
  let current: NormalizedMessage | undefined;

  for (const line of lines) {
    const match = line.match(rolePattern);
    if (match) {
      const rawRole = match[1].toLowerCase();
      const role =
        rawRole === "human"
          ? "user"
          : rawRole === "ai"
            ? "assistant"
            : (rawRole as NormalizedMessage["role"]);
      current = {
        id: `msg_${messages.length + 1}`,
        role,
        content: line.replace(rolePattern, "").trim(),
      };
      messages.push(current);
    } else if (current && line.trim()) {
      current.content += `\n${line}`;
    }
  }

  if (messages.length === 0 && text.trim()) {
    messages.push({ id: "msg_1", role: "unknown", content: text.trim() });
  }

  const confidence: Confidence = messages.length >= 4 ? "medium" : "low";
  return {
    title:
      messages.find((message) => message.role === "user")?.content.slice(0, 64) ||
      "Imported agent session",
    messages,
    confidence,
    warnings: [
      ...(messages.some((message) => message.role === "unknown")
        ? ["Role boundaries could not be detected."]
        : []),
      "No timestamps found; duration is unavailable.",
      "No file diffs found; output quality will use transcript evidence.",
    ],
    source,
  };
}
