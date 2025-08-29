import { type RouteConfig, index, route, layout, prefix } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/auth/login.tsx"),
  route("register", "routes/auth/register.tsx"),
  route("auth/callback", "routes/auth/callback.tsx"),
 
  layout("routes/dashboard/layout.tsx", [
    route("dashboard", "routes/dashboard/index.tsx"),
    route("dashboard/knowledge-base", "routes/dashboard/knowledge-base.tsx"),
    route("dashboard/widget-config", "routes/dashboard/widget-config.tsx"),
    route("dashboard/analytics", "routes/dashboard/analytics.tsx"),
    route("dashboard/settings", "routes/dashboard/settings.tsx"),
  ]),

  ...prefix('api', [
    route("auth/login", "routes/api/auth/login.tsx"),
    route("auth/register", "routes/api/auth/register.tsx"),
    route("chat", "routes/api/chat.tsx"),
    route("widget/config/:clientId", "routes/api/widget/config.tsx"),
    route("knowledge-base/upload", "routes/api/knowledge-base/upload.tsx"),
  ]),
] satisfies RouteConfig;
