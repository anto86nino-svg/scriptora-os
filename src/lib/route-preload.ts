type PreloadableRoute = "dashboard" | "app" | "home";

const loaded = new Set<PreloadableRoute>();

export function preloadRoute(route: PreloadableRoute): void {
  if (loaded.has(route)) return;
  loaded.add(route);

  switch (route) {
    case "dashboard":
      void import("@/pages/Dashboard");
      break;
    case "app":
      void import("@/pages/Index");
      break;
    case "home":
      void import("@/pages/Home");
      break;
  }
}

export function preloadWriterAndDashboard(): void {
  preloadRoute("dashboard");
  preloadRoute("app");
}
