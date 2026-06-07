import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Authenticated app users, mapped 1:1 to a Clerk identity.
  // Created lazily on first authenticated load (see users.ensureUser).
  users: defineTable({
    // Canonical, globally-unique identity key: `${issuer}|${subject}`.
    tokenIdentifier: v.string(),
    // Clerk user id (identity.subject) — surfaced to the client contract.
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_clerk_user", ["clerkUserId"]),
});
