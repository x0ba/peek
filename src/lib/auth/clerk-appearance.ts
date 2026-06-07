// Shared Clerk appearance for Clerk's hosted components (SignIn, SignUp,
// UserButton). The full theme — colors, fonts, radius, the flat dark surface —
// is driven by Clerk's native CSS-variable API in `clerk.css` (`--clerk-*`),
// which is the documented, version-stable theming contract and avoids the
// type-drift problems of pushing `appearance.elements` through the pinned
// @clerk/shared types.
//
// This object only carries a couple of primitives as a pre-paint fallback (so
// the first frame isn't unstyled), using *direct* values — Clerk's docs warn
// that modern color functions like oklch() don't reliably resolve in the
// variables system, so the brand accent is hex, not the oklch design token.

export const clerkAppearance = {
  variables: {
    colorPrimary: "#2fdadc", // signal-accent (iris) — links/accents
    borderRadius: "0.5rem",
    fontFamily: '"Geist", ui-sans-serif, system-ui, sans-serif',
    fontFamilyButtons: '"Geist", ui-sans-serif, system-ui, sans-serif',
    fontSize: "0.875rem",
  },
} as const;

// The header UserButton popover shares the same theming; `clerk.css` styles its
// `.cl-userButtonPopover*` surface directly.
export const userButtonAppearance = clerkAppearance;
