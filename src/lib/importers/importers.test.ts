import { describe, expect, it } from "vite-plus/test";
import { parseClaudeCode } from "./claude-code";
import { parseCodex } from "./codex";

const file = (text: string) => ({ name: "trace.jsonl", text, size: text.length });

describe("trace importers", () => {
  it("accepts Claude Code thinking blocks and preserves tool blocks", () => {
    const text = [
      JSON.stringify({
        type: "assistant",
        timestamp: "2026-01-01T00:00:00.000Z",
        message: {
          role: "assistant",
          content: [
            { type: "thinking", thinking: "short summary" },
            { type: "text", text: "I'll inspect it." },
            { type: "tool_use", id: "toolu_1", name: "Bash", input: { command: "pwd" } },
          ],
        },
      }),
      JSON.stringify({
        type: "user",
        timestamp: "2026-01-01T00:00:01.000Z",
        message: {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: "toolu_1", content: "/repo" }],
        },
      }),
    ].join("\n");

    const [candidate] = parseClaudeCode({
      files: [file(text)],
      pastedText: "",
      source: "claude-code",
    });

    expect(candidate.warnings).not.toContain("Unknown content block type: thinking");
    expect(candidate.messages.map((message) => message.content)).toEqual([
      'short summary\nI\'ll inspect it.\n[tool use] Bash {"command":"pwd"}',
      "/repo",
    ]);
    expect(candidate.toolEvents).toHaveLength(2);
  });

  it("imports Codex rollout event messages and function outputs", () => {
    const text = [
      JSON.stringify({
        timestamp: "2026-01-01T00:00:00.000Z",
        type: "session_meta",
        payload: { id: "thread", cwd: "/repo", model: "gpt-5.1-codex" },
      }),
      JSON.stringify({
        timestamp: "2026-01-01T00:00:01.000Z",
        type: "event_msg",
        payload: { type: "user_message", message: "Fix the tests" },
      }),
      JSON.stringify({
        timestamp: "2026-01-01T00:00:02.000Z",
        type: "event_msg",
        payload: { type: "agent_message", message: "I'll run them." },
      }),
      JSON.stringify({
        timestamp: "2026-01-01T00:00:03.000Z",
        type: "response_item",
        payload: {
          type: "function_call",
          name: "exec_command",
          arguments: '{"cmd":"vp test"}',
          call_id: "call_1",
        },
      }),
      JSON.stringify({
        timestamp: "2026-01-01T00:00:04.000Z",
        type: "response_item",
        payload: { type: "function_call_output", call_id: "call_1", output: "1 failed" },
      }),
    ].join("\n");

    const [candidate] = parseCodex({ files: [file(text)], pastedText: "", source: "codex" });

    expect(candidate.messages.map(({ role, content }) => [role, content])).toEqual([
      ["user", "Fix the tests"],
      ["assistant", "I'll run them."],
    ]);
    expect(
      candidate.toolEvents.map(({ name, outputSummary, metadata }) => [
        name,
        outputSummary,
        metadata?.call_id,
      ]),
    ).toEqual([
      ["exec_command", undefined, "call_1"],
      [undefined, "1 failed", "call_1"],
    ]);
  });
});
