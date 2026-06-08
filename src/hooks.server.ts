import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { withClerkHandler } from "svelte-clerk/server";
import { surfaceFor } from "$lib/theme";

// App areas that require an authenticated user. Everything else
// (landing page, /sign-in, /sign-up, static assets) stays public.
const PROTECTED_PREFIXES = ["/dashboard", "/import", "/sessions", "/settings"];

const isProtected = (pathname: string) =>
  PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const guardRoutes: Handle = async ({ event, resolve }) => {
  if (isProtected(event.url.pathname)) {
    const { userId } = event.locals.auth();
    if (!userId) {
      const redirectUrl = encodeURIComponent(event.url.pathname + event.url.search);
      throw redirect(307, `/sign-in?redirect_url=${redirectUrl}`);
    }
  }
  return resolve(event);
};

// Stamp `data-surface` on <html> server-side so the first paint already has the
// correct `color-scheme`. Without this, the dark default flashes a black
// scrollbar-gutter strip on the right when loading an app route in light mode.
const stampSurface: Handle = async ({ event, resolve }) => {
  const surface = surfaceFor(event.url.pathname);
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace("<html", `<html data-surface="${surface}"`),
  });
};

export const handle = sequence(withClerkHandler(), stampSurface, guardRoutes);
