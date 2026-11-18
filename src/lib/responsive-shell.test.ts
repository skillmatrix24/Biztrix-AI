import test from "node:test";
import assert from "node:assert/strict";
import {
  MOBILE_NAV_BREAKPOINT,
  SIDEBAR_DRAWER_BREAKPOINT,
  normalizePathname,
  isMobileNavViewport,
  isCompactSidebarViewport,
  isAuthPathname,
  isCustomerFacingPublicRoute,
  isStandaloneFullPageRoute,
  shouldShowGlobalChatbot,
  hasMobileBottomShell,
  hasManagedDialogScroll,
} from "./responsive-shell";

test("viewport breakpoint helpers separate phone (<768) and tablet drawer (<1024)", () => {
  assert.equal(MOBILE_NAV_BREAKPOINT, 768);
  assert.equal(SIDEBAR_DRAWER_BREAKPOINT, 1024);

  // Mobile phone (390px) -> mobile nav + drawer sidebar
  assert.equal(isMobileNavViewport(390), true);
  assert.equal(isCompactSidebarViewport(390), true);

  // Tablet portrait (768px) -> no mobile bottom nav, uses collapsible drawer sidebar so main gets full width
  assert.equal(isMobileNavViewport(768), false);
  assert.equal(isCompactSidebarViewport(768), true);
  assert.equal(isCompactSidebarViewport(1023), true);

  // Desktop / Tablet landscape (1024px+) -> permanent collapsible rail sidebar
  assert.equal(isCompactSidebarViewport(1024), false);
  assert.equal(isCompactSidebarViewport(1440), false);
});

test("pathname normalization strips trailing slashes safely", () => {
  assert.equal(normalizePathname("/settings/"), "/settings");
  assert.equal(normalizePathname("/"), "/");
  assert.equal(normalizePathname(""), "");
});

test("shouldShowGlobalChatbot hides on auth, shop, funnel, and customer tracking portals", () => {
  assert.equal(shouldShowGlobalChatbot("/login"), false);
  assert.equal(shouldShowGlobalChatbot("/signup"), false);
  assert.equal(shouldShowGlobalChatbot("/forgot-password"), false);
  assert.equal(shouldShowGlobalChatbot("/shop/demo-store"), false);
  assert.equal(shouldShowGlobalChatbot("/funnel/offer-1"), false);
  assert.equal(shouldShowGlobalChatbot("/loyalty/join/biz123"), false);
  assert.equal(shouldShowGlobalChatbot("/loyalty/track/biz123/mem1"), false);
  assert.equal(shouldShowGlobalChatbot("/complaints/form"), false);
  assert.equal(shouldShowGlobalChatbot("/projects/track/biz1/proj1"), false);

  // Visible on marketing landing, pricing, marketplace, and internal OS pages
  assert.equal(shouldShowGlobalChatbot("/"), true);
  assert.equal(shouldShowGlobalChatbot("/pricing"), true);
  assert.equal(shouldShowGlobalChatbot("/marketplace"), true);
  assert.equal(shouldShowGlobalChatbot("/dashboard"), true);
  assert.equal(shouldShowGlobalChatbot("/staff"), true);
  assert.equal(shouldShowGlobalChatbot("/settings"), true);
});

test("hasMobileBottomShell detects when BottomNav + QuickActionFAB occupy bottom viewport", () => {
  assert.equal(hasMobileBottomShell("/dashboard", true), true);
  assert.equal(hasMobileBottomShell("/staff", true), true);
  assert.equal(hasMobileBottomShell("/marketplace", true), true);

  // Logged-out hybrid/public routes do not render LayoutShell BottomNav
  assert.equal(hasMobileBottomShell("/marketplace", false), false);
  assert.equal(hasMobileBottomShell("/pricing", false), false);
  assert.equal(hasMobileBottomShell("/", true), false);
  assert.equal(hasMobileBottomShell("/login", true), false);
  assert.equal(hasMobileBottomShell("/shop/mystore", true), false);

  assert.equal(isAuthPathname("/signup/"), true);
  assert.equal(isCustomerFacingPublicRoute("/portal/solar/abc"), true);
  assert.equal(isStandaloneFullPageRoute("/"), true);
  assert.equal(isStandaloneFullPageRoute("/dashboard"), false);
});

test("hasManagedDialogScroll preserves custom flex-col / fixed-height scroll dialogs", () => {
  assert.equal(
    hasManagedDialogScroll("sm:max-w-[850px] max-h-[90vh] flex flex-col p-0 overflow-hidden"),
    true
  );
  assert.equal(
    hasManagedDialogScroll("sm:max-w-[460px] h-[88vh] rounded-2xl p-0 overflow-hidden flex flex-col"),
    true
  );
  assert.equal(
    hasManagedDialogScroll("sm:max-w-[540px] rounded-2xl border-slate-200 p-0 overflow-hidden"),
    false
  );
  assert.equal(hasManagedDialogScroll(undefined), false);
});
