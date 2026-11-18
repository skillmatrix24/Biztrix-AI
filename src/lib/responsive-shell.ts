export const MOBILE_NAV_BREAKPOINT = 768;
export const SIDEBAR_DRAWER_BREAKPOINT = 1024;

const AUTH_EXACT_ROUTES = new Set(["/login", "/signup", "/forgot-password"]);

const PUBLIC_FULLPAGE_PREFIXES = [
  "/shop",
  "/funnel",
  "/projects/track",
  "/feedback/form",
  "/feedback/track",
  "/loyalty/track",
  "/loyalty/join",
  "/loyalty/payment-failed",
  "/loyalty/payment-cancelled",
  "/loyalty/success",
  "/portal/solar",
  "/complaints/track",
  "/complaints/form",
  "/staff/track",
];

export function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) return "";
  const trimmed = pathname.trim().replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function isMobileNavViewport(width: number): boolean {
  return Number.isFinite(width) && width < MOBILE_NAV_BREAKPOINT;
}

export function isCompactSidebarViewport(width: number): boolean {
  return Number.isFinite(width) && width < SIDEBAR_DRAWER_BREAKPOINT;
}

export function isAuthPathname(pathname: string | null | undefined): boolean {
  const clean = normalizePathname(pathname);
  return AUTH_EXACT_ROUTES.has(clean);
}

export function isCustomerFacingPublicRoute(pathname: string | null | undefined): boolean {
  const clean = normalizePathname(pathname);
  if (!clean || clean === "/") return false;
  return PUBLIC_FULLPAGE_PREFIXES.some(
    (prefix) => clean === prefix || clean.startsWith(`${prefix}/`)
  );
}

export function isStandaloneFullPageRoute(pathname: string | null | undefined): boolean {
  const clean = normalizePathname(pathname);
  if (!clean || clean === "/") return true;
  return isCustomerFacingPublicRoute(clean);
}

/**
 * Determines whether the merchant Biztrix Assistant floating widget should render.
 * Hidden on authentication screens, public storefronts/funnels, and external customer portals
 * so it never covers login buttons, checkout bars, or customer-facing forms on mobile.
 */
export function shouldShowGlobalChatbot(pathname: string | null | undefined): boolean {
  const clean = normalizePathname(pathname);
  if (!clean) return false;
  if (isAuthPathname(clean)) return false;
  if (isCustomerFacingPublicRoute(clean)) return false;
  return true;
}

/**
 * Determines whether the authenticated mobile bottom navigation + QuickActionFAB shell
 * is active on the current route, so floating widgets can offset cleanly above it.
 */
export function hasMobileBottomShell(
  pathname: string | null | undefined,
  isAuthenticatedUser: boolean
): boolean {
  if (!isAuthenticatedUser) return false;
  const clean = normalizePathname(pathname);
  if (!clean || isAuthPathname(clean) || isStandaloneFullPageRoute(clean)) {
    return false;
  }
  return true;
}

/**
 * Detects whether a DialogContent className already manages its own flex/height scroll container
 * (e.g., `flex-col`, `h-[88vh]`, `max-h-[90vh]`), so default viewport scroll fallback
 * only activates on dialogs that would otherwise clip vertically on small mobile screens.
 */
export function hasManagedDialogScroll(className: string | undefined): boolean {
  if (!className) return false;
  return /\b(flex-col|lg:flex-row|h-\[|max-h-\[)/.test(className);
}
