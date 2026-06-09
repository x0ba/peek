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
            {
              type: "server_tool_use",
              id: "srvtoolu_1",
              name: "web_search",
              input: { query: "Vite+" },
            },
          ],
        },
      }),
      JSON.stringify({
        type: "user",
        timestamp: "2026-01-01T00:00:01.000Z",
        message: {
          role: "user",
          content: [
            { type: "tool_result", tool_use_id: "toolu_1", content: "/repo" },
            {
              type: "web_search_tool_result",
              tool_use_id: "srvtoolu_1",
              content: [{ type: "text", text: "Vite+ docs" }],
            },
          ],
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
      "/repo\nVite+ docs",
    ]);
    expect(
      candidate.toolEvents.map(({ name, inputSummary, outputSummary, metadata }) => [
        name,
        inputSummary,
        outputSummary,
        metadata?.toolUseId,
      ]),
    ).toEqual([
      ["Bash", '{"command":"pwd"}', undefined, "toolu_1"],
      ["web_search", '{"query":"Vite+"}', undefined, "srvtoolu_1"],
      ["tool_result", undefined, "/repo", "toolu_1"],
      ["web_search_tool_result", undefined, "Vite+ docs", "srvtoolu_1"],
    ]);
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

  it("falls back to Codex response item messages when event messages are absent", () => {
    const text = [
      JSON.stringify({
        timestamp: "2025-01-01T00:00:00.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          turn_id: "turn_legacy",
          content: [{ type: "input_text", text: "Fix the legacy trace" }],
        },
      }),
      JSON.stringify({
        timestamp: "2025-01-01T00:00:01.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "I'll fix it." }],
        },
      }),
    ].join("\n");

    const [candidate] = parseCodex({ files: [file(text)], pastedText: "", source: "codex" });

    expect(candidate.messages.map(({ role, content }) => [role, content])).toEqual([
      ["user", "Fix the legacy trace"],
      ["assistant", "I'll fix it."],
    ]);
    expect(candidate.messages[0]?.metadata?.turn_id).toBe("turn_legacy");
  });
});
