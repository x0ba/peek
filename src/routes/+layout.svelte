<script lang="ts">
  import "./layout.css";
  import "$lib/auth/clerk.css";
  import favicon from "$lib/assets/favicon.svg";
  import { ClerkProvider } from "svelte-clerk";
  import { setupConvex } from "convex-svelte";
  import { env } from "$env/dynamic/public";
  import { clerkAppearance } from "$lib/auth/clerk-appearance";
  import ConvexClerk from "$lib/components/app/convex-clerk.svelte";

  let { children, data } = $props();

  // Single Convex client for the app; the auth bridge below feeds it Clerk tokens.
  setupConvex(env.PUBLIC_CONVEX_URL);
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
    {@render children()}
  </ConvexClerk>
</ClerkProvider>
