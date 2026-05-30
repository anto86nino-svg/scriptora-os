import { getSupabaseClient, isSupabaseConfigured } from "@/integrations/supabase/client";

type CloudCapabilities = {
  projects: boolean;
  autoBestseller: boolean;
};

let cached: CloudCapabilities | null = null;
let probing: Promise<CloudCapabilities> | null = null;

/** True when PostgREST reports a missing table/RPC (404 / PGRST205). */
export function isMissingSupabaseResource(
  error: { code?: string; message?: string; status?: number } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.status === 404) return true;
  if (error.code === "PGRST205" || error.code === "42P01") return true;
  const msg = error.message || "";
  return /Could not find the table|relation .* does not exist|schema cache/i.test(msg);
}

const UNAVAILABLE: CloudCapabilities = { projects: false, autoBestseller: false };
const SESSION_KEY = "scriptora_cloud_caps_v1";

function readSessionCaps(): CloudCapabilities | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as CloudCapabilities) : null;
  } catch {
    return null;
  }
}

function writeSessionCaps(caps: CloudCapabilities) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(caps));
  } catch {
    /* ignore */
  }
}

/** One probe per session — avoids repeated 404 noise when migrations are not applied. */
export function probeSupabaseCapabilities(force = false): Promise<CloudCapabilities> {
  if (cached && !force) return Promise.resolve(cached);
  if (!force) {
    const session = readSessionCaps();
    if (session) {
      cached = session;
      return Promise.resolve(session);
    }
  }
  if (probing && !force) return probing;

  probing = (async (): Promise<CloudCapabilities> => {
    if (!isSupabaseConfigured()) {
      cached = UNAVAILABLE;
      return cached;
    }
    try {
      const supabase = getSupabaseClient();
      const [projectsRes, runsRes] = await Promise.all([
        supabase.from("projects").select("id").limit(1),
        supabase.from("auto_bestseller_runs").select("id").limit(1),
      ]);
      cached = {
        projects: !isMissingSupabaseResource(projectsRes.error),
        autoBestseller: !isMissingSupabaseResource(runsRes.error),
      };
    } catch {
      cached = UNAVAILABLE;
    }
    writeSessionCaps(cached);
    return cached;
  })();

  return probing;
}

export async function hasProjectsCloud(): Promise<boolean> {
  return (await probeSupabaseCapabilities()).projects;
}

export async function hasAutoBestsellerCloud(): Promise<boolean> {
  return (await probeSupabaseCapabilities()).autoBestseller;
}
