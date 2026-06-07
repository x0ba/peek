import type { AgentSource, Confidence } from "$lib/contracts/api";

export type DemoSession = {
  id: string;
  title: string;
  goal: string;
  source: AgentSource;
  status: "completed" | "analyzing" | "queued" | "failed";
  score?: number;
  confidence: Confidence;
  turns: number;
  tools: number;
  errors: number;
  files: number;
  duration: string;
  updated: string;
};

export const demoSessions: DemoSession[] = [
  {
    id: "ses_9f3a1c",
    title: "SvelteKit import wizard",
    goal: "Build a guided trace-import flow with client-side redaction",
    source: "claude-code",
    status: "completed",
    score: 4.6,
    confidence: "high",
    turns: 42,
    tools: 24,
    errors: 3,
    files: 12,
    duration: "38m",
    updated: "4m ago",
  },
  {
    id: "ses_71be08",
    title: "Stripe webhook retries",
    goal: "Make checkout webhooks idempotent and back off on 5xx",
    source: "cursor",
    status: "analyzing",
    confidence: "high",
    turns: 28,
    tools: 19,
    errors: 1,
    files: 7,
    duration: "12m",
    updated: "live",
  },
  {
    id: "ses_22dd4e",
    title: "Postgres index migration",
    goal: "Add composite indexes for the sessions query path",
    source: "codex",
    status: "completed",
    score: 3.4,
    confidence: "medium",
    turns: 19,
    tools: 11,
    errors: 0,
    files: 4,
    duration: "9m",
    updated: "1h ago",
  },
  {
    id: "ses_04ac9b",
    title: "Refactor auth middleware",
    goal: "Split Clerk session handling out of the request hook",
    source: "claude-code",
    status: "failed",
    score: 2.1,
    confidence: "medium",
    turns: 55,
    tools: 33,
    errors: 9,
    files: 18,
    duration: "1h 4m",
    updated: "2h ago",
  },
  {
    id: "ses_5c8f12",
    title: "CLI argument parser",
    goal: "Port the flag parser from commander to a typed schema",
    source: "pi",
    status: "completed",
    score: 4.9,
    confidence: "high",
    turns: 16,
    tools: 7,
    errors: 0,
    files: 5,
    duration: "6m",
    updated: "5h ago",
  },
  {
    id: "ses_aa1077",
    title: "Flaky e2e test triage",
    goal: "Find and stabilize the intermittent checkout spec",
    source: "cursor",
    status: "queued",
    confidence: "medium",
    turns: 31,
    tools: 22,
    errors: 4,
    files: 9,
    duration: "—",
    updated: "6h ago",
  },
];

export const sourceLabels: Record<AgentSource, string> = {
  "claude-code": "Claude Code",
  cursor: "Cursor",
  codex: "Codex",
  pi: "Pi",
  manual: "Manual",
  unknown: "Unknown",
};
