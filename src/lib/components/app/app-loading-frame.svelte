<script lang="ts">
  import { page } from "$app/state";
  import Shell from "./shell.svelte";

  const path = $derived(page.url.pathname);
  const isSessionsList = $derived(path === "/sessions");
  const isSessionDetail = $derived(path.startsWith("/sessions/") && path !== "/sessions");
  const isDashboard = $derived(path === "/dashboard");
  const isImport = $derived(path === "/import");
  const isAppRoute = $derived(isDashboard || isSessionsList || isSessionDetail || isImport || path === "/settings");
</script>

{#if isAppRoute}
  <Shell>
    <div class="peek-rise space-y-8" aria-busy="true" aria-live="polite">
    {#if isDashboard}
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="skeleton h-3 w-36"></div>
          <div class="skeleton mt-3 h-8 w-32"></div>
          <div class="skeleton mt-3 h-4 w-80 max-w-[70vw]"></div>
        </div>
        <div class="skeleton h-9 w-32 rounded-md"></div>
      </div>
      <div class="skeleton h-4 w-80 max-w-full"></div>
      <div class="panel grid grid-cols-2 divide-x divide-y divide-border overflow-hidden md:grid-cols-4 md:divide-y-0">
        {#each Array(4) as _}
          <div class="min-h-[92px] px-5 py-4"><div class="skeleton h-3 w-20"></div><div class="skeleton mt-3 h-8 w-16"></div></div>
        {/each}
      </div>
      <div class="grid gap-x-10 gap-y-8 lg:grid-cols-[1fr_280px]">
        <section><div class="mb-4 flex justify-between"><div class="skeleton h-3 w-28"></div><div class="skeleton h-3 w-12"></div></div><div class="divide-y divide-border">{#each Array(4) as _}<div class="py-3"><div class="skeleton h-4 w-2/3"></div><div class="skeleton mt-2 h-3 w-1/2"></div></div>{/each}</div></section>
        <aside class="space-y-8"><div><div class="skeleton mb-4 h-3 w-24"></div><div class="skeleton h-2 w-full rounded-full"></div></div><div><div class="skeleton mb-4 h-3 w-20"></div><div class="space-y-3">{#each Array(3) as _}<div class="skeleton h-3 w-full"></div>{/each}</div></div></aside>
      </div>
    {:else if isSessionsList}
      <div class="flex flex-wrap items-end justify-between gap-4"><div><div class="skeleton h-3 w-28"></div><div class="skeleton mt-3 h-8 w-32"></div><div class="skeleton mt-3 h-4 w-96 max-w-[70vw]"></div></div><div class="skeleton h-9 w-32 rounded-md"></div></div>
      <section class="panel overflow-hidden"><div class="flex items-center gap-3 border-b border-border p-3"><div class="skeleton h-8 w-80 max-w-[50vw]"></div><div class="skeleton ml-auto h-8 w-56"></div></div><div class="hidden grid-cols-[1fr_120px_130px_90px] gap-4 border-b border-border px-5 py-2.5 sm:grid"><div class="skeleton h-3 w-16"></div><div class="skeleton h-3 w-14"></div><div class="skeleton h-3 w-16"></div><div class="skeleton h-3 w-14"></div></div>{#each Array(5) as _}<div class="grid h-[73px] gap-3 border-b border-border px-5 py-4 sm:grid-cols-[1fr_120px_130px_90px]"><div><div class="skeleton h-4 w-2/3"></div><div class="skeleton mt-2 h-3 w-1/2"></div></div><div class="skeleton h-4 w-20"></div><div class="skeleton h-4 w-24"></div><div class="skeleton h-4 w-16"></div></div>{/each}</section>
    {:else if isSessionDetail}
      <div class="skeleton h-4 w-24"></div><div class="space-y-8"><div><div class="skeleton h-9 w-96 max-w-[75vw]"></div><div class="skeleton mt-3 h-4 w-[36rem] max-w-[80vw]"></div><div class="skeleton mt-3 h-3 w-64"></div></div><div class="panel grid grid-cols-2 divide-x divide-y divide-border overflow-hidden sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">{#each Array(5) as _}<div class="px-5 py-4"><div class="skeleton h-3 w-20"></div><div class="skeleton mt-3 h-8 w-16"></div></div>{/each}</div><div class="grid gap-10 lg:grid-cols-[1fr_320px]"><div class="space-y-8"><div class="skeleton h-40 w-full"></div><div class="panel h-80"></div></div><aside class="space-y-6"><div class="skeleton h-40 w-full"></div><div class="skeleton h-48 w-full"></div></aside></div></div>
    {:else if isImport}
      <div class="mx-auto max-w-4xl space-y-8"><header><div class="skeleton h-3 w-40"></div><div class="skeleton mt-3 h-8 w-64"></div><div class="skeleton mt-3 h-4 w-96 max-w-[70vw]"></div></header><div class="skeleton h-6 w-full"></div><section class="panel min-h-[460px] p-6 sm:p-8"><div class="skeleton h-6 w-56"></div><div class="skeleton mt-3 h-4 w-96 max-w-full"></div><div class="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{#each Array(6) as _}<div class="skeleton h-32 rounded-lg"></div>{/each}</div></section></div>
    {:else}
      <div class="space-y-6"><div class="skeleton h-8 w-64"></div><div class="panel h-80"></div></div>
    {/if}
    </div>
  </Shell>
{/if}
