import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// The shape returned to the client. Mirrors `CurrentUser` in
// `src/lib/contracts/api.ts` — keep the two in sync.
export type CurrentUser = {
  id: string;
  clerkUserId: string;
  email?: string;
  name?: string;
  imageUrl?: string;
};

function toCurrentUser(user: Doc<"users">): CurrentUser {
  return {
    id: user._id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    name: user.name,
    imageUrl: user.imageUrl,
  };
}

/**
 * Look up the user row for the currently authenticated identity.
 * Returns `null` when unauthenticated or not yet provisioned.
 * Prefer this helper inside other functions that need the caller's user.
 */
export async function getUserByIdentity(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

/** Like {@link getUserByIdentity} but throws — use where auth is required. */
export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const user = await getUserByIdentity(ctx);
  if (!user) {
    throw new Error("Not authenticated. Sign in and reload to provision your account.");
  }
  return user;
}

/** Current signed-in user, or `null`. Drives the client auth state. */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx): Promise<CurrentUser | null> => {
    const user = await getUserByIdentity(ctx);
    return user ? toCurrentUser(user) : null;
  },
});

/**
 * Lazily provision (or refresh) the user row from the Clerk identity.
 * Called once after sign-in from the client. Idempotent: keeps profile
 * fields (name/email/avatar) in sync with Clerk on every call.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx): Promise<CurrentUser | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const profile = {
      clerkUserId: identity.subject,
      email: identity.email,
      name: identity.name ?? identity.nickname ?? identity.givenName,
      imageUrl: identity.pictureUrl,
      updatedAt: Date.now(),
    };

    const existing = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, profile);
      const updated = await ctx.db.get(existing._id);
      return updated ? toCurrentUser(updated) : null;
    }

    const id = await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      createdAt: Date.now(),
      ...profile,
    });
    const created = await ctx.db.get(id);
    return created ? toCurrentUser(created) : null;
  },
});
