// The app shell, landing page, and auth screens auto-theme with the device via
// `.theme-auto`; the <html> canvas behind them (overscroll, native scrollbar,
// reserved scrollbar gutter) follows suit through `data-surface="app"`. This is
// resolved on the server (hooks) so the very first paint has the right
// `color-scheme` — otherwise the dark default leaks a black scrollbar-gutter
// strip on light-mode loads. The client layout keeps it in sync on navigation.
const AUTO_THEMED_ROUTES = [
  "/",
  "/dashboard",
  "/sessions",
  "/import",
  "/settings",
  "/sign-in",
  "/sign-up",
];

export const isAutoThemedPath = (pathname: string): boolean =>
  AUTO_THEMED_ROUTES.some((r) => pathname === r || (r !== "/" && pathname.startsWith(`${r}/`)));

export const surfaceFor = (pathname: string): "app" | "site" =>
  isAutoThemedPath(pathname) ? "app" : "site";
