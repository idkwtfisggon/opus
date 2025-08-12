import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("signup", "routes/signup.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("onboarding/customer", "routes/onboarding/customer.tsx"),
  route("onboarding/forwarder", "routes/onboarding/forwarder.tsx"),
  route("sign-in/*", "routes/sign-in.tsx"),
  route("sign-up/*", "routes/sign-up.tsx"),
  route("staff-signup", "routes/staff-signup/index.tsx"),
  route("auth-redirect", "routes/auth-redirect.tsx"),
  route("pricing", "routes/pricing.tsx"),
  route("success", "routes/success.tsx"),
  route("subscription-required", "routes/subscription-required.tsx"),
  route("print-label", "routes/print-label.tsx"),
  layout("routes/dashboard/layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("dashboard/chat", "routes/dashboard/chat.tsx"),
    route("dashboard/settings", "routes/dashboard/settings.tsx"),
  ]),
  // Customer dashboard
  layout("routes/customer/layout.tsx", [
    route("customer", "routes/customer/index.tsx"),
    route("customer/orders", "routes/customer/orders.tsx"),
    route("customer/create-order", "routes/customer/create-order.tsx"),
    route("customer/account", "routes/customer/account.tsx"),
    route("customer/settings", "routes/customer/settings.tsx"),
  ]),
  // Forwarder dashboard
  layout("routes/forwarder/layout.tsx", [
    route("forwarder", "routes/forwarder/index.tsx"),
    route("forwarder/orders", "routes/forwarder/orders.tsx"),
    route("forwarder/staff", "routes/forwarder/staff.tsx"),
    route("forwarder/order-audit", "routes/forwarder/order-audit.tsx"),
    route("forwarder/service-areas", "routes/forwarder/service-areas.tsx"),
    route("forwarder/analytics", "routes/forwarder/analytics.tsx"),
    route("forwarder/settings", "routes/forwarder/settings.tsx"),
    route("forwarder/account", "routes/forwarder/account.tsx"),
  ]),
  // Staff mobile interface
  layout("routes/staff/layout.tsx", [
    route("staff", "routes/staff/index.tsx"),
    route("staff/scanner", "routes/staff/scanner.tsx"),
    route("staff/orders", "routes/staff/orders.tsx"),
    route("staff/activity", "routes/staff/activity.tsx"),
    route("staff/profile", "routes/staff/profile.tsx"),
  ]),
] satisfies RouteConfig;
