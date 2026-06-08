<script lang="ts">
  import { ArrowLeft, ArrowRight, Bot, Braces, Check, ClipboardPaste, Code2, FileJson, FileUp, ShieldCheck, Terminal, UploadCloud } from "@lucide/svelte";
  import Shell from "$lib/components/app/shell.svelte";
  import { useConvexClient } from "convex-svelte";
  import { api } from "$convex/_generated/api";
  import { normalizeCandidate, normalizedTextFromCandidate, parseImport } from "$lib/importers/parse";
  import type { ImportCandidate, ImportFileInput } from "$lib/importers/parse";
  import { redactText } from "$lib/redaction/redact";
  import type { AgentSource, NormalizedSession, ToolEvent } from "$lib/contracts/api";

  const sources = [
    { id: "claude-code", label: "Claude Code", detail: "Project history and JSONL traces", icon: Terminal },
    { id: "cursor", label: "Cursor", detail: "Chat and composer exports", icon: Code2 },
    { id: "codex", label: "Codex", detail: "CLI sessions and trace events", icon: Bot },
    { id: "pi", label: "Pi", detail: "Session logs and tool traces", icon: Braces },
    { id: "manual", label: "Other / manual", detail: "JSON, Markdown, or plain text", icon: FileJson },
  ] as const;
  const labels = ["Source", "Data input", "Detected", "Redaction", "Preview", "Complete"];
  const uploadHints: Record<AgentSource, { title: string; formats: string; paths: string[]; notes: string[] }> = {
    "claude-code": {
      title: "Claude Code local traces",
      formats: "JSONL session files",
      paths: ["~/.claude/projects/<encoded-project-path>/*.jsonl"],
      notes: [
        "Pick the .jsonl file for the project/session you want to inspect.",
        "Peek will look for message rows, timestamps, tool calls, and Claude metadata before falling back to transcript parsing.",
      ],
    },
    cursor: {
      title: "Cursor chat/composer history",
      formats: "Markdown/JSON exports, text transcripts, or state.vscdb SQLite databases",
      paths: [
        "~/Library/Application Support/Cursor/User/workspaceStorage/<workspace-id>/state.vscdb",
        "%APPDATA%\\Cursor\\User\\workspaceStorage\\<workspace-id>\\state.vscdb",
      ],
      notes: [
        "Markdown or JSON exports are safest. Cursor database parsing is best-effort because the internal schema changes.",
        "If uploading state.vscdb, choose the workspace database rather than the global one when possible.",
      ],
    },
    codex: {
      title: "Codex CLI rollout files",
      formats: "JSONL rollout/session files",
      paths: ["~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl"],
      notes: [
        "Upload rollout-*.jsonl for the session date you want.",
        "Peek will use session_meta, response_item, event_msg, timestamps, model/provider fields, and tool/function events where present.",
      ],
    },
    pi: {
      title: "Pi session logs",
      formats: "JSONL session files",
      paths: ["~/.pi/agent/sessions/<encoded-cwd>/*.jsonl"],
      notes: [
        "Pick a session file from the encoded project directory.",
        "Peek will read the session header, message entries, model changes, compactions, branch summaries, and tool execution messages.",
      ],
    },
    manual: {
      title: "Manual or unsupported traces",
      formats: "JSON, JSONL, Markdown, terminal output, or plain text",
      paths: ["Any local file that contains the conversation or trace content."],
      notes: [
        "Role-prefixed lines like “User:”, “Assistant:”, and “Tool:” produce the best transcript fallback.",
        "Structured JSON/JSONL with role/content/timestamp fields will be parsed automatically when possible.",
      ],
    },
    unknown: {
      title: "Unknown trace source",
      formats: "JSON, JSONL, Markdown, terminal output, or plain text",
      paths: ["Any text-like local trace file."],
      notes: ["Peek will try generic JSON, JSONL, and transcript parsing in that order."],
    },
  };
  const selectedUploadHint = $derived(uploadHints[source]);
  let step = $state(1);
  let source = $state<AgentSource>("claude-code");
  let text = $state("");
  let reviewed = $state(false);
  let files = $state<ImportFileInput[]>([]);
  let selectedCandidateId = $state("");
  let importing = $state(false);
  let importError = $state("");
  let importedSessionId = $state("");
  const client = useConvexClient();
  const candidates = $derived(parseImport({ files, pastedText: text, source }));
  const parsed = $derived(candidates.find((candidate) => candidate.id === selectedCandidateId) ?? candidates[0]);
  const candidateText = $derived(parsed ? redactionTextFromCandidate(parsed) : text);
  const preview = $derived(redactText(candidateText));

  function markImportChanged() {
    reviewed = false;
    selectedCandidateId = "";
  }

  async function readFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const selectedFiles = [...(input.files ?? [])];
    files = await Promise.all(selectedFiles.map(async (file) => ({
      name: file.name,
      text: await file.text(),
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
    })));
    markImportChanged();
  }

  function updateText(event: Event) {
    text = (event.currentTarget as HTMLTextAreaElement).value;
    markImportChanged();
  }

  function redactOptional(value: string | undefined) {
    return value ? redactText(value).redactedText : value;
  }

  function redactUnknown(value: unknown): unknown {
    if (typeof value === "string") return redactText(value).redactedText;
    if (Array.isArray(value)) return value.map(redactUnknown);
    if (value && typeof value === "object") return redactRecord(value as Record<string, unknown>);
    return value;
  }

  function redactRecord(record: Record<string, unknown>) {
    const redactedEntries = Object.entries(record).map(([key, value]) => [key, redactUnknown(value)]);
    return Object.fromEntries(redactedEntries);
  }

  function redactionTextFromCandidate(candidate: ImportCandidate) {
    return [
      normalizedTextFromCandidate(candidate),
      JSON.stringify(candidate.toolEvents),
      JSON.stringify(candidate.artifacts),
      JSON.stringify(candidate.sourceMetadata),
      JSON.stringify(candidate.messages.map((message) => message.metadata ?? {})),
    ].join("\n\n");
  }

  function redactedCandidate(candidate: ImportCandidate): ImportCandidate {
    const toolEvents: ToolEvent[] = candidate.toolEvents.map((event) => ({
      ...event,
      name: redactOptional(event.name),
      inputSummary: redactOptional(event.inputSummary),
      outputSummary: redactOptional(event.outputSummary),
      rawInputRedacted: redactOptional(event.rawInputRedacted),
      rawOutputRedacted: redactOptional(event.rawOutputRedacted),
      errorMessage: redactOptional(event.errorMessage),
      metadata: event.metadata ? redactRecord(event.metadata) : undefined,
    }));
    const artifacts: NormalizedSession["artifacts"] = candidate.artifacts.map((artifact) => ({
      ...artifact,
      path: redactOptional(artifact.path),
      summary: redactOptional(artifact.summary),
      contentRedacted: redactOptional(artifact.contentRedacted),
      diffRedacted: redactOptional(artifact.diffRedacted),
      metadata: artifact.metadata ? redactRecord(artifact.metadata) : undefined,
    }));
    return {
      ...candidate,
      messages: candidate.messages.map((message) => ({
        ...message,
        content: redactText(message.content).redactedText,
        metadata: message.metadata ? redactRecord(message.metadata) : undefined,
      })),
      toolEvents,
      artifacts,
      sourceMetadata: redactRecord(candidate.sourceMetadata),
    };
  }
  async function importSession() {
    importing = true;
    importError = "";
    let uploadedStorageId: string | undefined;
    try {
      if (!parsed) throw new Error("No importable session detected.");
      const originalCharacterCount = text.length + files.reduce((sum, file) => sum + file.text.length, 0);
      const session = normalizeCandidate(redactedCandidate(parsed), preview.categories, originalCharacterCount);
      const uploadUrl = await client.mutation(api.sessions.generateUploadUrl, {});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
      if (!response.ok) throw new Error("Trace upload failed.");
      const { storageId } = (await response.json()) as { storageId: string };
      uploadedStorageId = storageId;
      const sessionSummary = {
        schemaVersion: session.schemaVersion,
        source: session.source,
        sourceSessionId: session.sourceSessionId,
        sourceMetadata: session.sourceMetadata,
        title: session.title,
        titleInferred: session.titleInferred,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        importedAt: session.importedAt,
        messagesPreview: session.messages.slice(0, 20),
        toolEventsPreview: session.toolEvents.slice(0, 20),
        artifactsPreview: session.artifacts.slice(0, 20),
        stats: session.stats,
        redactionMetadata: session.redactionMetadata,
        dataCompleteness: session.dataCompleteness,
      };
      const result = await client.mutation(api.sessions.createImportSession, { session: sessionSummary, redactionReviewed: reviewed, storageId });
      importedSessionId = result.sessionId;
      await client.mutation(api.analysis.createAnalysisJob, { sessionId: result.sessionId });
      step = 6;
    } catch (error) {
      if (uploadedStorageId) {
        try {
          await client.mutation(api.sessions.deleteOrphanedTrace, { storageId: uploadedStorageId });
        } catch {
          // Best-effort cleanup only; preserve the original import error for the user.
        }
      }
      importError = error instanceof Error ? error.message : "Import failed.";
    } finally {
      importing = false;
    }
  }

  function next() {
    if (step === 4 && !reviewed) return;
    if (step === 5) {
      void importSession();
      return;
    }
    step = Math.min(6, step + 1);
  }
</script>

<svelte:head><title>Import session · Peek</title></svelte:head>
<Shell>
  <div class="mx-auto max-w-4xl space-y-8">
    <header>
      <p class="eyebrow eyebrow-accent mb-2">Local-first ingestion</p>
      <h1 class="text-[28px] font-semibold tracking-tight">Import agent session</h1>
      <p class="mt-1.5 text-sm text-muted-foreground">Parse and redact the trace in your browser before anything is uploaded.</p>
    </header>

    <!-- Progress rail — lives on the canvas, no box -->
    <ol class="flex items-center gap-2 overflow-x-auto pb-1">
      {#each labels as label, index}
        {@const state = step > index + 1 ? "done" : step === index + 1 ? "current" : "todo"}
        <li class="flex shrink-0 items-center gap-2">
          <span class="flex size-5 items-center justify-center rounded-full border text-[10px] font-medium transition-colors {state === 'done' ? 'border-signal-success bg-signal-success text-background' : state === 'current' ? 'border-signal-accent text-signal-accent' : 'border-border text-muted-foreground'}">
            {#if state === "done"}<Check class="size-3" />{:else}{index + 1}{/if}
          </span>
          <span class="hidden text-xs sm:block {state === 'current' ? 'font-medium text-foreground' : 'text-muted-foreground'}">{label}</span>
          {#if index < labels.length - 1}<span class="h-px w-5 bg-border sm:w-8"></span>{/if}
        </li>
      {/each}
    </ol>

    <section class="panel min-h-[460px] p-6 sm:p-8">
      {#if step === 1}
        <div><h2 class="text-lg font-medium">Where did this session run?</h2><p class="mt-1 text-sm text-muted-foreground">Source-specific parsing runs first, with tolerant fallback detection.</p></div>
        <div class="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each sources as item}
            <button onclick={() => { source = item.id; markImportChanged(); }} class="group min-h-32 rounded-lg border p-4 text-left transition-colors {source === item.id ? 'border-signal-accent bg-signal-accent/[0.06]' : 'border-border hover:border-border hover:bg-accent'}">
              <div class="flex items-start justify-between"><item.icon class="size-5 {source === item.id ? 'text-signal-accent' : 'text-muted-foreground'}" />{#if source === item.id}<Check class="size-4 text-signal-accent" />{/if}</div>
              <p class="mt-6 text-sm font-medium">{item.label}</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
            </button>
          {/each}
        </div>
      {:else if step === 2}
        <h2 class="text-lg font-medium">Add session data</h2><p class="mt-1 text-sm text-muted-foreground">Drop a supported file or paste a transcript. Parsing remains local.</p>
        <div class="mt-6 rounded-lg border border-border bg-background/50 p-4">
          <div class="flex items-start gap-3">
            <FileJson class="mt-0.5 size-4 shrink-0 text-signal-accent" />
            <div class="min-w-0">
              <p class="text-sm font-medium">{selectedUploadHint.title}</p>
              <p class="mt-1 text-xs leading-5 text-muted-foreground">Expected: {selectedUploadHint.formats}</p>
              <div class="mt-3 space-y-1.5">
                {#each selectedUploadHint.paths as path}
                  <code class="block overflow-x-auto rounded border border-border bg-muted/40 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">{path}</code>
                {/each}
              </div>
              <ul class="mt-3 space-y-1.5 text-xs leading-5 text-muted-foreground">
                {#each selectedUploadHint.notes as note}
                  <li class="flex gap-2"><span class="text-signal-accent">•</span><span>{note}</span></li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
        <div class="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <label class="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background/40 text-center transition-colors hover:border-signal-accent/50 hover:bg-signal-accent/[0.03]">
            <UploadCloud class="size-8 text-signal-accent" />
            <span class="mt-4 text-sm font-medium">{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Choose trace files"}</span>
            <span class="mt-1 px-5 text-xs leading-5 text-muted-foreground">{selectedUploadHint.formats}</span>
            <input type="file" multiple accept=".json,.jsonl,.md,.txt,.db,.sqlite,.vscdb" class="sr-only" onchange={readFile} />
          </label>
          <div>
            {#if files.length}
              <div class="mb-3 space-y-1.5">
                {#each files as file}
                  <div class="flex justify-between rounded border border-border bg-background/60 px-2 py-1.5 text-[11px] text-muted-foreground"><span class="truncate">{file.name}</span><span class="tnum ml-3">{Math.round(file.size / 1024)} KB</span></div>
                {/each}
              </div>
            {/if}
            <div class="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><ClipboardPaste class="size-3.5" />Paste transcript</div>
            <textarea value={text} oninput={updateText} class="h-64 w-full resize-none rounded-lg border border-border bg-background p-4 font-mono text-xs leading-6 outline-none focus:border-signal-accent" placeholder="User: …&#10;Assistant: …"></textarea>
          </div>
        </div>
      {:else if step === 3}
        <h2 class="text-lg font-medium">{candidates.length} session{candidates.length === 1 ? "" : "s"} detected</h2><p class="mt-1 text-sm text-muted-foreground">Choose a parser candidate before redaction.</p>
        <div class="mt-7 space-y-3">
          {#each candidates as candidate}
            <button onclick={() => { selectedCandidateId = candidate.id; reviewed = false; }} class="w-full rounded-lg border p-4 text-left transition-colors {(parsed?.id ?? "") === candidate.id ? 'border-signal-accent bg-signal-accent/[0.06]' : 'border-border hover:bg-accent'}">
              <p class="truncate text-sm font-medium">{candidate.title}</p>
              <p class="mt-1 font-mono text-[11px] text-muted-foreground">{candidate.messages.length} messages · {candidate.toolEvents.length} tool events · {candidate.confidence} confidence · {candidate.source}</p>
              <div class="mt-3 flex flex-wrap gap-2">{#each candidate.warnings as warning}<span class="rounded border border-signal-warning/20 bg-signal-warning/[0.06] px-2 py-1 text-[11px] text-signal-warning">{warning}</span>{/each}</div>
            </button>
          {:else}
            <p class="text-sm text-muted-foreground">No importable content detected yet.</p>
          {/each}
        </div>
      {:else if step === 4}
        <div id="redaction" class="flex items-start gap-3">
          <ShieldCheck class="mt-0.5 size-5 shrink-0 text-signal-success" />
          <div><h2 class="text-lg font-medium">Redaction preview</h2><p class="mt-1 text-sm text-muted-foreground">{preview.categories.reduce((sum, item) => sum + item.count, 0)} sensitive values detected and replaced locally.</p></div>
        </div>
        <div class="mt-7 grid gap-6 lg:grid-cols-[200px_1fr]">
          <div>
            {#if preview.categories.length}
              <ul class="divide-y divide-border">
                {#each preview.categories as category}
                  <li class="flex justify-between py-2.5 text-xs"><span class="capitalize text-muted-foreground">{category.category.replace("-", " ")}</span><span class="tnum font-mono">{category.count}</span></li>
                {/each}
              </ul>
            {:else}
              <p class="text-xs text-signal-success">No obvious secrets detected.</p>
            {/if}
          </div>
          <pre class="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background p-4 font-mono text-[11px] leading-5 text-muted-foreground">{preview.redactedText}</pre>
        </div>
        <label class="mt-6 flex cursor-pointer items-start gap-3 border-t border-border pt-5 text-sm">
          <input bind:checked={reviewed} type="checkbox" class="mt-0.5 rounded border-border bg-background text-signal-accent focus:ring-signal-accent" />
          <span><strong class="font-medium">I reviewed this import.</strong><span class="mt-0.5 block text-xs text-muted-foreground">I understand automated redaction is best-effort.</span></span>
        </label>
      {:else if step === 5}
        <h2 class="text-lg font-medium">Ready to import</h2><p class="mt-1 text-sm text-muted-foreground">Only this normalized, redacted trace will be stored.</p>
        <dl class="mt-7 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border sm:grid-cols-4 sm:divide-y-0">
          {#each [["Messages", parsed?.messages.length ?? 0], ["Tool events", parsed?.toolEvents.length ?? 0], ["Confidence", parsed?.confidence ?? "unknown"], ["Redactions", preview.categories.reduce((sum, item) => sum + item.count, 0)]] as stat}
            <div class="px-4 py-4"><dt class="text-[11px] uppercase tracking-wide text-muted-foreground">{stat[0]}</dt><dd class="tnum mt-2 text-xl font-semibold capitalize">{stat[1]}</dd></div>
          {/each}
        </dl>
        <div class="mt-6 border-l-2 border-signal-accent pl-4">
          <p class="eyebrow">Inferred goal</p>
          <p class="mt-1.5 text-sm leading-6">{parsed?.title}</p>
        </div>
      {:else}
        <div class="flex min-h-96 flex-col items-center justify-center text-center">
          <span class="flex size-14 items-center justify-center rounded-full border border-signal-success/30 bg-signal-success/10"><Check class="size-7 text-signal-success" /></span>
          <h2 class="mt-6 text-2xl font-semibold tracking-tight">Session imported</h2>
          <p class="mt-2 max-w-md text-sm leading-6 text-muted-foreground">The normalized trace is ready. Open the session to inspect its timeline and analysis report.</p>
          <a href="/sessions/{importedSessionId}" class="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Open session <ArrowRight class="size-4" /></a>
        </div>
      {/if}
    </section>

    {#if step < 6}
      <div class="flex justify-between">
        <button onclick={() => (step = Math.max(1, step - 1))} disabled={step === 1} class="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"><ArrowLeft class="size-4" />Back</button>
        <div class="flex flex-col items-end gap-2">
          {#if importError}<p class="text-xs text-signal-danger">{importError}</p>{/if}
          <button onclick={next} disabled={importing || (step === 2 && !text.trim() && files.length === 0) || (step === 3 && !parsed) || (step === 4 && !reviewed)} class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-30">{importing ? "Importing…" : step === 5 ? "Import session" : "Continue"}{#if step === 5}<FileUp class="size-4" />{:else}<ArrowRight class="size-4" />{/if}</button>
        </div>
      </div>
    {/if}
  </div>
</Shell>
