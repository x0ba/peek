import { describe, expect, it } from "vite-plus/test";
import { normalizeCandidate, parseImport, parseTranscript } from "./parse";

const file = (name: string, text: string) => ({ name, text, size: text.length });

describe("generic import parsing", () => {
  it("splits pasted plain text transcripts by common role prefixes", () => {
    const candidate = parseTranscript(
      [
        "User: Please add tests for redaction",
        "Assistant: I will inspect the implementation.",
        "Tool: bash vp test failed",
        "AI: I fixed the issue.",
      ].join("\n"),
      "manual",
    );

    expect(candidate.messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(candidate.messages[0]?.content).toBe("Please add tests for redaction");
    expect(candidate.toolEvents).toHaveLength(1);
    expect(candidate.toolEvents[0]).toMatchObject({ kind: "command", status: "error" });
    expect(candidate.confidence).toBe("medium");
  });

  it("parses JSON and JSONL message traces", () => {
    const json = parseImport({
      source: "unknown",
      files: [
        file(
          "trace.json",
          JSON.stringify({
            messages: [
              { role: "human", content: "Hi" },
              { role: "ai", text: "Hello" },
            ],
          }),
        ),
      ],
    })[0];

    const jsonl = parseImport({
      source: "unknown",
      files: [
        file(
          "trace.jsonl",
          [
            JSON.stringify({
              role: "user",
              content: "Run tests",
              timestamp: "2026-01-01T00:00:00Z",
            }),
            JSON.stringify({ role: "assistant", content: "Done", model: "model-a" }),
          ].join("\n"),
        ),
      ],
    })[0];

    expect(json?.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(jsonl?.messages).toHaveLength(2);
    expect(jsonl?.messages[0]?.timestamp).toBe("2026-01-01T00:00:00Z");
    expect(jsonl?.messages[1]?.model).toBe("model-a");
  });

  it("normalizes candidates into session stats and data-completeness metadata", () => {
    const candidate = parseTranscript(
      "User: fix it\nTool: vitest failed\nAssistant: fixed",
      "manual",
    );
    const normalized = normalizeCandidate(candidate, [{ category: "email", count: 1 }], 42);

    expect(normalized.schemaVersion).toBe(1);
    expect(normalized.stats).toMatchObject({
      messageCount: 3,
      userTurnCount: 1,
      assistantTurnCount: 1,
      toolCallCount: 1,
      errorCount: 1,
      filesTouchedCount: 0,
    });
    expect(normalized.redactionMetadata).toMatchObject({
      clientSideApplied: true,
      serverSideApplied: false,
      categories: [{ category: "email", count: 1 }],
    });
    expect(normalized.sourceMetadata?.originalCharacterCount).toBe(42);
    expect(normalized.dataCompleteness).toMatchObject({
      confidence: "medium",
      hasToolEvents: true,
      hasCommandOutputs: false,
      hasTimestamps: false,
    });
  });
});

describe("native importer first pass", () => {
  it("parses Claude Code JSONL messages, tool blocks, title metadata, and unknown block warnings", () => {
    const candidate = parseImport({
      source: "claude-code",
      files: [
        file(
          "claude.jsonl",
          [
            JSON.stringify({ type: "ai-title", aiTitle: "Add tests", sessionId: "s1" }),
            JSON.stringify({
              type: "message",
              timestamp: "2026-01-01T00:00:00Z",
              message: { role: "user", content: "Add tests" },
            }),
            JSON.stringify({
              type: "message",
              timestamp: "2026-01-01T00:00:01Z",
              message: {
                role: "assistant",
                content: [
                  { type: "text", text: "I'll run tests" },
                  { type: "tool_use", name: "bash", input: { command: "vp test" } },
                  { type: "mystery", text: "future block" },
                ],
              },
            }),
          ].join("\n"),
        ),
      ],
    })[0];

    expect(candidate?.title).toBe("Add tests");
    expect(candidate?.messages).toHaveLength(2);
    expect(candidate?.toolEvents[0]).toMatchObject({ kind: "command", name: "bash" });
    expect(candidate?.sourceMetadata.sessionId).toBe("s1");
    expect(candidate?.warnings).toContain("Unknown content block type: mystery");
  });

  it("parses Cursor markdown exports and falls back to generic parsing for pasted transcripts", () => {
    const markdown = parseImport({
      source: "cursor",
      files: [file("chat.md", "# User\nMake a dashboard\n# Assistant\nHere is the plan")],
    })[0];
    const fallback = parseImport({ source: "cursor", pastedText: "User: hello\nAssistant: hi" })[0];

    expect(markdown?.sourceMetadata.parser).toBe("cursor-export");
    expect(markdown?.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(fallback?.sourceMetadata.parser).toBe("generic");
    expect(fallback?.messages).toHaveLength(2);
  });

  it("parses Codex rollout JSONL user messages and function calls", () => {
    const candidate = parseImport({
      source: "codex",
      files: [
        file(
          "rollout.jsonl",
          [
            JSON.stringify({ type: "session_meta", timestamp: "t0", payload: { model: "gpt-5" } }),
            JSON.stringify({
              type: "event",
              timestamp: "t1",
              payload: {
                type: "user_message",
                message: "ctx\n## My request for Codex:\nWrite tests",
              },
            }),
            JSON.stringify({
              type: "response_item",
              timestamp: "t2",
              payload: { type: "message", role: "assistant", content: [{ text: "OK" }] },
            }),
            JSON.stringify({
              type: "response_item",
              timestamp: "t3",
              payload: { type: "function_call", name: "shell", arguments: { cmd: "vp test" } },
            }),
          ].join("\n"),
        ),
      ],
    })[0];

    expect(candidate?.messages[0]).toMatchObject({
      role: "user",
      content: "Write tests",
      model: "gpt-5",
    });
    expect(candidate?.toolEvents[0]).toMatchObject({ kind: "command", name: "shell" });
  });

  it("parses Pi logs with model metadata, tool-like messages, and artifacts", () => {
    const candidate = parseImport({
      source: "pi",
      files: [
        file(
          "pi.jsonl",
          [
            JSON.stringify({ type: "session", id: "pi-session", timestamp: "t0", version: "1" }),
            JSON.stringify({ type: "model_change", modelId: "claude-sonnet" }),
            JSON.stringify({
              type: "message",
              id: "m1",
              timestamp: "t1",
              message: { role: "user", content: "Run tests" },
            }),
            JSON.stringify({
              type: "message",
              id: "m2",
              timestamp: "t2",
              message: { role: "tool", content: "bash vp test output" },
            }),
            JSON.stringify({ type: "compaction", summary: "Earlier context" }),
          ].join("\n"),
        ),
      ],
    })[0];

    expect(candidate?.sourceMetadata.id).toBe("pi-session");
    expect(candidate?.messages[0]?.model).toBe("claude-sonnet");
    expect(candidate?.toolEvents[0]).toMatchObject({ kind: "command", relatedMessageId: "m2" });
    expect(candidate?.artifacts[0]).toMatchObject({ kind: "other", summary: "Earlier context" });
  });
});
