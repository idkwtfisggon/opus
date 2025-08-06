import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("sign-in/*", "routes/sign-in.tsx"),
  route("sign-up/*", "routes/sign-up.tsx"),
  route("pricing", "routes/pricing.tsx"),
  route("success", "routes/success.tsx"),
  route("subscription-required", "routes/subscription-required.tsx"),
  route("print-label", "routes/print-label.tsx"),
  layout("routes/dashboard/layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("dashboard/chat", "routes/dashboard/chat.tsx"),
    route("dashboard/settings", "routes/dashboard/settings.tsx"),
  ]),
  // Forwarder dashboard
  layout("routes/forwarder/layout.tsx", [
    route("forwarder", "routes/forwarder/index.tsx"),
    route("forwarder/orders", "routes/forwarder/orders.tsx"),
    route("forwarder/warehouses", "routes/forwarder/warehouses.tsx"),
    route("forwarder/analytics", "routes/forwarder/analytics.tsx"),
    route("forwarder/settings", "routes/forwarder/settings.tsx"),
  ]),
] satisfies RouteConfig;
