<script lang="ts">
  import { useClerkContext } from "svelte-clerk";
  import { useConvexClient } from "convex-svelte";
  import { api } from "$convex/_generated/api";
  import type { Snippet } from "svelte";

  // Bridges Clerk's session into the Convex client: feeds Convex a token
  // fetcher backed by Clerk's `convex` JWT template, and lazily provisions
  // the Convex user row once authenticated. Must render inside <ClerkProvider>
  // and inside a tree where setupConvex() has run.
  let { children }: { children: Snippet } = $props();

  const ctx = useClerkContext();
  const client = useConvexClient();

  let provisionedSessionId = $state<string | null>(null);
  let convexReady = $state(false);

  $effect(() => {
    // Wait for Clerk to finish loading before deciding auth state.
    if (!ctx.isLoaded) return;

    const session = ctx.session;
    if (!session) {
      // Signed out — drop any token so Convex calls run unauthenticated.
      client.setAuth(async () => null);
      provisionedSessionId = null;
      convexReady = true;
      return;
    }

    client.setAuth(async ({ forceRefreshToken }) => {
      const token = await session.getToken({
        template: "convex",
        skipCache: forceRefreshToken,
      });
      return token ?? null;
    });

    if (provisionedSessionId === session.id) {
      convexReady = true;
      return;
    }

    let cancelled = false;
    convexReady = false;
    void client
      .mutation(api.users.ensureUser, {})
      .then(() => {
        if (cancelled) return;
        provisionedSessionId = session.id;
        convexReady = true;
      })
      .catch(() => {
        if (cancelled) return;
        // Allow a later retry if provisioning failed (e.g. transient token).
        provisionedSessionId = null;
        convexReady = false;
      });

    return () => {
      cancelled = true;
    };
  });
</script>

{#if convexReady}
  {@render children()}
{/if}
