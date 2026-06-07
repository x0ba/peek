import type { RedactionCategory, RedactionPreview } from "$lib/contracts/api";

const rules: { category: RedactionCategory; replacement: string; pattern: RegExp }[] = [
  {
    category: "private-key",
    replacement: "[REDACTED:PRIVATE_KEY]",
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    category: "api-key",
    replacement: "[REDACTED:API_KEY]",
    pattern: /\b(?:sk|pk|rk|xai|anthropic)-[A-Za-z0-9_-]{16,}\b/g,
  },
  {
    category: "token",
    replacement: "[REDACTED:TOKEN]",
    pattern: /\b(?:gh[opusr]_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._~-]{16,})\b/gi,
  },
  {
    category: "env-secret",
    replacement: "$1=[REDACTED:ENV_SECRET]",
    pattern: /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD))\s*=\s*[^\s]+/g,
  },
  {
    category: "email",
    replacement: "[REDACTED:EMAIL]",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    category: "url-secret",
    replacement: "$1[REDACTED:TOKEN]",
    pattern: /([?&](?:token|key|secret|password)=)[^&\s]+/gi,
  },
  {
    category: "absolute-path",
    replacement: "[REDACTED:ABSOLUTE_PATH]",
    pattern: /(?:\/Users\/|\/home\/)[^\s"'`]+/g,
  },
];

export function redactText(input: string): RedactionPreview {
  let redactedText = input;
  const counts = new Map<RedactionCategory, number>();

  for (const rule of rules) {
    redactedText = redactedText.replace(rule.pattern, (...args: unknown[]) => {
      counts.set(rule.category, (counts.get(rule.category) ?? 0) + 1);
      const groups = args.slice(1, -2);
      return rule.replacement.replace(/\$(\d)/g, (_, index: string) => {
        const group = groups[Number(index) - 1];
        return typeof group === "string" ? group : "";
      });
    });
  }

  return {
    redactedText,
    categories: [...counts].map(([category, count]) => ({ category, count })),
    sampleSnippets: redactedText
      .split("\n")
      .filter((line) => line.includes("[REDACTED:"))
      .slice(0, 4),
    warnings: ["Automated redaction is best-effort. Review the preview before importing."],
  };
}
