<script lang="ts">
  import "./layout.css";
  import "$lib/auth/clerk.css";
  import favicon from "$lib/assets/favicon.svg";
  import { ClerkProvider } from "svelte-clerk";
  import { setupConvex } from "convex-svelte";
  import { page } from "$app/state";
  import { env } from "$env/dynamic/public";
  import { clerkAppearance } from "$lib/auth/clerk-appearance";
  import ConvexClerk from "$lib/components/app/convex-clerk.svelte";
  import AppLoadingFrame from "$lib/components/app/app-loading-frame.svelte";
  import { surfaceFor } from "$lib/theme";

  let { children, data } = $props();

  const convexUrl = env.PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("PUBLIC_CONVEX_URL is not set. Set it to your Convex deployment URL.");
  }

  // Single Convex client for the app; the auth bridge below feeds it Clerk tokens.
  setupConvex(convexUrl);

  // The app shell (Shell.svelte), the landing page, and the auth screens all
  // auto-theme with the device via `.theme-auto`. `data-surface` is stamped on
  // <html> server-side (hooks.server.ts) so the first paint is flash-free; this
  // keeps it in sync across client-side navigation.
  $effect(() => {
    document.documentElement.dataset.surface = surfaceFor(page.url.pathname);
  });
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ClerkProvider
  initialState={data.initialState}
  signInUrl="/sign-in"
  signUpUrl="/sign-up"
  afterSignOutUrl="/"
  appearance={clerkAppearance}
>
  <ConvexClerk>
    {#snippet fallback()}
      <AppLoadingFrame />
    {/snippet}
    {@render children()}
  </ConvexClerk>
</ClerkProvider>
