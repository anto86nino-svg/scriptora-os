#!/usr/bin/env node
/**
 * Pre-build immunity gate — blocks build with readable errors.
 */
import { loadMergedEnv, removeStaleGuardedEnvFiles, validateSupabaseEnv } from "./scriptora-env-core.mjs";

const removed = removeStaleGuardedEnvFiles();
if (removed > 0) {
  console.warn(`[env-guard] Removed ${removed} stale guarded env file(s) (.env.production / .env.vercel).`);
}

const env = loadMergedEnv({ mode: "production" });
const report = validateSupabaseEnv(env);

if (report.ok) {
  if (process.env.DEBUG_ENV_GUARD === "1") {
    console.log("[env-guard] Build env validation passed.");
  }
  process.exit(0);
}

console.error("\nBuild blocked.\n");
for (const err of report.errors) {
  console.error(`  ❌ ${err.message}`);
}
console.error("\nSupabase credentials invalid or environment corrupted.");
console.error("Run:\n  npm run scriptora:doctor\n  npm run scriptora:repair\n");
process.exit(1);
