import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/login.tsx"),
  route("/dashboard", "routes/dashboard.tsx"),
  route("/menu-lain", "routes/MenuLain.tsx"),
  // Handle Chrome DevTools well-known route
  route("/.well-known/appspecific/com.chrome.devtools.json", "routes/devtools.tsx"),
] satisfies RouteConfig;
