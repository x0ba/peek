import type {
  AgentSource,
  Confidence,
  NormalizedMessage,
  NormalizedSession,
  ToolEvent,
} from "$lib/contracts/api";

export type ImportCandidate = {
  id: string;
  source: AgentSource;
  title: string;
  messages: NormalizedMessage[];
  toolEvents: ToolEvent[];
  artifacts: NormalizedSession["artifacts"];
  sourceMetadata: Record<string, unknown>;
  confidence: Confidence;
  warnings: string[];
};

export type ImportFileInput = {
  name: string;
  text?: string;
  bytes?: Uint8Array;
  type?: string;
  size: number;
  lastModified?: number;
};

export type SourceParser = (input: {
  files: ImportFileInput[];
  pastedText: string;
  source: AgentSource;
}) => ImportCandidate[];
