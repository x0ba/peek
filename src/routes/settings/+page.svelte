<script lang="ts">
  import { KeyRound, ShieldCheck, Trash2, UserRound } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { useConvexClient } from "convex-svelte";
  import { useClerkContext } from "svelte-clerk";
  import Shell from "$lib/components/app/shell.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { api } from "$convex/_generated/api";

  const client = useConvexClient();
  const ctx = useClerkContext();
  let deleteDialogOpen = $state(false);
  let deleting = $state(false);
  const name = $derived(ctx.user?.fullName ?? ctx.user?.firstName ?? "Your account");
  const email = $derived(ctx.user?.primaryEmailAddress?.emailAddress ?? "");
  const imageUrl = $derived(ctx.user?.imageUrl ?? "");
  const initials = $derived(
    ((ctx.user?.firstName?.[0] ?? "") + (ctx.user?.lastName?.[0] ?? "") || name.slice(0, 2))
      .toUpperCase()
      .slice(0, 2),
  );
  const provider = $derived(
    ctx.user?.externalAccounts?.[0]?.provider?.replace(/^oauth_/, "") ?? "email",
  );

  const openProfile = () => ctx.clerk?.openUserProfile();

  async function confirmDeleteAll() {
    if (deleting) return;
    deleting = true;
    try {
      await client.mutation(api.sessions.deleteAllWorkspaceData, {});
      deleteDialogOpen = false;
      await goto("/dashboard");
    } finally {
      deleting = false;
    }
  }

  const privacy = [
    ["Client-side first", "Secrets are detected and replaced in your browser before anything is uploaded."],
    ["Double pass", "A second redaction pass runs on the server before storage and before analysis."],
    ["No secret ledger", "Raw redacted values are never retained — only the normalized trace survives."],
  ];
</script>

<svelte:head><title>Settings · Peek</title></svelte:head>
<Shell>
  <div class="mx-auto max-w-3xl">
    <header class="pb-2">
      <p class="eyebrow eyebrow-accent mb-2">Workspace control</p>
      <h1 class="text-[28px] font-semibold tracking-tight">Settings</h1>
      <p class="mt-1.5 text-sm text-muted-foreground">Manage your account, privacy boundary, and stored trace data.</p>
    </header>

    <!-- Account -->
    <section class="border-t border-border py-8">
      <div class="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div>
          <div class="flex items-center gap-2"><UserRound class="size-4 text-signal-accent" /><h2 class="text-sm font-medium">Account</h2></div>
          <p class="mt-1.5 text-xs leading-5 text-muted-foreground">Profile and authentication.</p>
        </div>
        <div class="flex flex-wrap items-center gap-4">
          {#if imageUrl}
            <img src={imageUrl} alt={name} class="size-11 rounded-full object-cover ring-1 ring-border" />
          {:else}
            <span class="flex size-11 items-center justify-center rounded-full bg-secondary text-xs font-semibold ring-1 ring-border">{initials}</span>
          {/if}
          <div class="min-w-0">
            <p class="text-sm font-medium">{name}</p>
            <p class="truncate text-xs text-muted-foreground">{email}{email && provider ? " · " : ""}{provider}</p>
          </div>
          <button onclick={openProfile} class="ml-auto rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent">Manage with Clerk</button>
        </div>
      </div>
    </section>

    <!-- Privacy -->
    <section class="border-t border-border py-8">
      <div class="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div>
          <div class="flex items-center gap-2"><ShieldCheck class="size-4 text-signal-success" /><h2 class="text-sm font-medium">Privacy &amp; redaction</h2></div>
          <p class="mt-1.5 text-xs leading-5 text-muted-foreground">How Peek handles every imported trace.</p>
        </div>
        <ul class="-my-3 divide-y divide-border">
          {#each privacy as item}
            <li class="flex gap-4 py-3">
              <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal-success"></span>
              <div>
                <p class="text-sm font-medium">{item[0]}</p>
                <p class="mt-0.5 text-xs leading-5 text-muted-foreground">{item[1]}</p>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </section>

    <!-- Provider -->
    <section class="border-t border-border py-8">
      <div class="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div>
          <div class="flex items-center gap-2"><KeyRound class="size-4 text-muted-foreground" /><h2 class="text-sm font-medium">Analysis provider</h2></div>
          <p class="mt-1.5 text-xs leading-5 text-muted-foreground">Managed by Peek for the MVP.</p>
        </div>
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-medium">Peek managed model</p>
            <p class="mt-0.5 text-xs text-muted-foreground">No API key required. Provider selection is coming later.</p>
          </div>
          <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-signal-success/25 bg-signal-success/10 px-2.5 py-1 font-mono text-[10px] text-signal-success">
            <span class="size-1.5 rounded-full bg-signal-success shadow-[0_0_6px_var(--signal-success)]"></span>ACTIVE
          </span>
        </div>
      </div>
    </section>

    <!-- Danger -->
    <section class="border-t border-border py-8">
      <div class="grid gap-6 sm:grid-cols-[200px_1fr]">
        <div>
          <div class="flex items-center gap-2"><Trash2 class="size-4 text-signal-danger" /><h2 class="text-sm font-medium text-signal-danger">Danger zone</h2></div>
          <p class="mt-1.5 text-xs leading-5 text-muted-foreground">Irreversible actions.</p>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-signal-danger/25 bg-signal-danger/[0.03] px-4 py-3.5">
          <div>
            <p class="text-sm font-medium">Delete all workspace data</p>
            <p class="mt-0.5 text-xs text-muted-foreground">Permanently remove sessions, trace files, jobs, and reports.</p>
          </div>
          <button
            type="button"
            onclick={() => (deleteDialogOpen = true)}
            class="ml-auto flex shrink-0 items-center gap-2 rounded-md border border-signal-danger/40 px-3 py-2 text-xs font-medium text-signal-danger hover:bg-signal-danger/10"
          >
            <Trash2 class="size-3.5" />Delete all data
          </button>
        </div>
      </div>
    </section>
  </div>

  <AlertDialog.Root bind:open={deleteDialogOpen}>
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>Delete all workspace data?</AlertDialog.Title>
        <AlertDialog.Description>
          This permanently removes every session, trace file, analysis job, and report in your workspace. This action
          cannot be undone.
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel disabled={deleting}>Cancel</AlertDialog.Cancel>
        <Button variant="destructive" disabled={deleting} onclick={confirmDeleteAll}>
          {deleting ? "Deleting…" : "Delete all data"}
        </Button>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  </AlertDialog.Root>
</Shell>
