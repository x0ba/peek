// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// Augments App.Locals with Clerk's `auth()` accessor (populated by
// withClerkHandler in hooks.server.ts).
import "svelte-clerk/env";

declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}  — `auth` comes from svelte-clerk/env above
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
