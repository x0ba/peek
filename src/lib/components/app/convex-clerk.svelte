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

  let provisioned = $state(false);

  $effect(() => {
    // Wait for Clerk to finish loading before deciding auth state.
    if (!ctx.isLoaded) return;

    const session = ctx.session;
    if (session) {
      client.setAuth(async ({ forceRefreshToken }) => {
        const token = await session.getToken({
          template: "convex",
          skipCache: forceRefreshToken,
        });
        return token ?? null;
      });
    } else {
      // Signed out — drop any token so Convex calls run unauthenticated.
      client.setAuth(async () => null);
      provisioned = false;
    }
  });

  $effect(() => {
    // Provision the Convex user row exactly once per signed-in session.
    if (!ctx.isLoaded || !ctx.session || provisioned) return;
    provisioned = true;
    void client.mutation(api.users.ensureUser, {}).catch(() => {
      // Allow a later retry if provisioning failed (e.g. transient token).
      provisioned = false;
    });
  });
</script>

{@render children()}
