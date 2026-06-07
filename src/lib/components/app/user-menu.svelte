<script lang="ts">
  import { ChevronDown } from "@lucide/svelte";
  import { useClerkContext } from "svelte-clerk";

  const ctx = useClerkContext();

  const displayName = $derived(
    ctx.user?.fullName ??
      ctx.user?.firstName ??
      ctx.user?.primaryEmailAddress?.emailAddress ??
      "Account",
  );

  const initials = $derived(
    (
      (ctx.user?.firstName?.[0] ?? "") + (ctx.user?.lastName?.[0] ?? "") ||
      displayName.slice(0, 2)
    )
      .toUpperCase()
      .slice(0, 2),
  );
</script>

{#if ctx.isLoaded && ctx.user}
  <span class="flex items-center gap-2 rounded-md px-1.5 py-1">
    <span class="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-signal-accent to-signal-success text-[9px] font-semibold text-background">
      {initials}
    </span>
    <span class="hidden max-w-[10rem] truncate text-sm font-medium sm:block">{displayName}</span>
    <span class="hidden rounded-full border border-border px-1.5 py-px text-[10px] text-muted-foreground sm:block">Free</span>
    <ChevronDown class="hidden size-3.5 text-muted-foreground sm:block" />
  </span>
{:else}
  <!-- Auth still hydrating: reserve space to avoid layout shift -->
  <span class="flex items-center gap-2 px-1.5 py-1">
    <span class="size-5 animate-pulse rounded-full bg-secondary"></span>
    <span class="hidden h-3.5 w-20 animate-pulse rounded bg-secondary sm:block"></span>
  </span>
{/if}
