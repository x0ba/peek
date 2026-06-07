import { buildClerkProps } from "svelte-clerk/server";
import type { LayoutServerLoad } from "./$types";

// Hydrates Clerk's auth state on the server so components render the
// correct signed-in/out UI without a client-side flash.
export const load: LayoutServerLoad = ({ locals }) => {
  return {
    ...buildClerkProps(locals.auth()),
  };
};
