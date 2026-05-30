/** True when running Vite dev server or on localhost — dev tools allowed. */
export function isLocalDevHost(): boolean {
  if (typeof window === "undefined") return import.meta.env.DEV;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/** Dev Mode badge, password unlock, and auth bypass — never in production deploys. */
export function canUseDevTools(): boolean {
  return import.meta.env.DEV || isLocalDevHost();
}
