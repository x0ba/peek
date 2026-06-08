<script lang="ts">
  import { Bell, Command, Search } from "@lucide/svelte";
  import { UserButton } from "svelte-clerk";
  import { page } from "$app/state";
  import Logo from "./logo.svelte";
  import UserMenu from "./user-menu.svelte";
  import { userButtonAppearance } from "$lib/auth/clerk-appearance";

  let { children } = $props();
  const tabs = [
    { label: "Overview", href: "/dashboard" },
    { label: "Sessions", href: "/sessions" },
    { label: "Import", href: "/import" },
    { label: "Settings", href: "/settings" },
  ];
</script>

<div class="theme-auto relative min-h-screen overflow-x-clip bg-background text-foreground">
  <header class="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
    <div class="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 lg:px-6">
      <Logo />
      <span class="text-border">/</span>
      <UserMenu />
      <span class="hidden text-border sm:block">/</span>
      <span class="hidden text-sm font-medium sm:block">peek</span>
      <div class="ml-auto flex items-center gap-1.5">
        <button class="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-[13px] text-muted-foreground md:flex">
          <Search class="size-3.5" /><span>Find…</span>
          <kbd class="ml-3 flex items-center gap-0.5 rounded border border-border px-1 py-0.5 font-mono text-[10px]"><Command class="size-2.5" />K</kbd>
        </button>
        <button class="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Notifications"><Bell class="size-4" /></button>
        <div class="ml-0.5 flex items-center">
          <UserButton appearance={userButtonAppearance} />
        </div>
      </div>
    </div>
    <nav class="mx-auto flex max-w-[1280px] overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-5">
      {#each tabs as tab}
        {@const active = page.url.pathname === tab.href || (tab.href === "/sessions" && page.url.pathname.startsWith("/sessions"))}
        <a href={tab.href} class="relative flex h-11 shrink-0 items-center px-1">
          <span class="rounded-md px-3 py-1.5 text-sm transition-colors {active ? 'font-medium text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}">{tab.label}</span>
          {#if active}<span class="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-signal-accent shadow-[0_0_12px_var(--signal-accent)]"></span>{/if}
        </a>
      {/each}
    </nav>
  </header>
  <div class="canvas-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px]"></div>
  <main class="relative mx-auto w-full max-w-[1280px] px-4 py-10 lg:px-6">
    {@render children()}
  </main>
</div>
