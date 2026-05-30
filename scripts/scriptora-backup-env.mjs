#!/usr/bin/env node
/**
 * Create timestamped backups of .env and .env.local before any manual/script edit.
 */
import path from "node:path";
import { backupProtectedEnvFiles } from "./scriptora-env-core.mjs";

const created = backupProtectedEnvFiles();
if (created.length === 0) {
  console.log("[scriptora-backup] No .env / .env.local files to backup.");
} else {
  for (const file of created) {
    console.log(`[scriptora-backup] ${path.basename(file)}`);
  }
}
