import { describe, expect, it } from "vite-plus/test";
import { redactText } from "./redact";

function countFor(result: ReturnType<typeof redactText>, category: string) {
  return result.categories.find((entry) => entry.category === category)?.count ?? 0;
}

describe("redactText", () => {
  it("redacts common secret and personal-data categories with typed placeholders", () => {
    const input = [
      "OPENAI_API_KEY=sk-proj_abcdefghijklmnopqrstuvwxyz123456",
      "Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890",
      "GitHub token ghp_abcdefghijklmnopqrstuvwxyz123456",
      "Email daniel@example.com",
      "Path /Users/daniel/Code/private/.env",
      "URL https://example.com/callback?token=super-secret-value&next=/app",
    ].join("\n");

    const result = redactText(input);

    expect(result.redactedText).toContain("OPENAI_API_KEY=[REDACTED:ENV_SECRET]");
    expect(result.redactedText).toContain("Authorization: [REDACTED:TOKEN]");
    expect(result.redactedText).toContain("[REDACTED:EMAIL]");
    expect(result.redactedText).toContain("[REDACTED:ABSOLUTE_PATH]");
    expect(result.redactedText).toContain("token=[REDACTED:TOKEN]");
    expect(result.redactedText).not.toContain("daniel@example.com");
    expect(result.redactedText).not.toContain("super-secret-value");
    expect(result.redactedText).not.toContain("ghp_abcdefghijklmnopqrstuvwxyz123456");
    expect(countFor(result, "env-secret")).toBe(1);
    expect(countFor(result, "token")).toBeGreaterThanOrEqual(2);
    expect(countFor(result, "email")).toBe(1);
    expect(countFor(result, "absolute-path")).toBe(1);
    expect(countFor(result, "url-secret")).toBe(1);
  });

  it("redacts private key blocks without exposing raw values in preview snippets", () => {
    const result = redactText(
      `-----BEGIN PRIVATE KEY-----\nabc123secret\n-----END PRIVATE KEY-----`,
    );

    expect(result.redactedText).toBe("[REDACTED:PRIVATE_KEY]");
    expect(result.sampleSnippets).toEqual(["[REDACTED:PRIVATE_KEY]"]);
    expect(result.sampleSnippets.join("\n")).not.toContain("abc123secret");
    expect(countFor(result, "private-key")).toBe(1);
  });
});
