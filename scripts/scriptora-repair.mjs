#!/usr/bin/env node
/**
 * Scriptora repair — suggest restore from timestamped env backups (never auto-overwrite).
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {
  ROOT,
  listEnvBackups,
  validateSupabaseEnv,
  parseEnvContent,
  backupProtectedEnvFiles,
} from "./scriptora-env-core.mjs";

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

console.log("\nSCRIPTORA REPAIR MODE\n");

const currentIssues = [];
for (const file of [".env", ".env.local"]) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  const vars = parseEnvContent(fs.readFileSync(full, "utf8"));
  const v = validateSupabaseEnv(vars);
  if (!v.ok) currentIssues.push({ file, errors: v.errors.map((e) => e.message) });
}

if (currentIssues.length === 0) {
  console.log("✅ No corrupted env files detected.");
  console.log("Nothing to repair. Run: npm run scriptora:doctor\n");
  process.exit(0);
}

console.log("Corrupted or risky env detected:\n");
for (const issue of currentIssues) {
  console.log(`  ${issue.file}:`);
  for (const e of issue.errors) console.log(`    • ${e}`);
}

const backups = listEnvBackups();
if (backups.length === 0) {
  console.log("\n❌ No timestamped backups found (.env.backup.* / .env.local.backup.*).");
  console.log("Restore manually from Supabase Dashboard → API keys.\n");
  process.exit(1);
}

console.log("\nAvailable backups (newest first):\n");
backups.slice(0, 10).forEach((b, i) => {
  console.log(`  [${i + 1}] ${b.name} → restores ${b.kind}`);
});

const pick = await ask("\nRestore backup number (or Enter to cancel): ");
if (!pick || !/^\d+$/.test(pick)) {
  console.log("Cancelled. No files were modified.\n");
  process.exit(0);
}

const idx = Number(pick) - 1;
const chosen = backups[idx];
if (!chosen) {
  console.log("Invalid selection. Cancelled.\n");
  process.exit(1);
}

const target = path.join(ROOT, chosen.kind);
const preview = validateSupabaseEnv(parseEnvContent(fs.readFileSync(chosen.path, "utf8")));
if (!preview.ok) {
  console.log("\n⚠️  Selected backup also fails validation. Proceed only if you trust this file.");
}

console.log(`\nWorking environment found:\n  ${chosen.name}\n  → ${chosen.kind}`);
const confirm = await ask("Restore? [y/N] ");
if (!/^y(es)?$/i.test(confirm)) {
  console.log("Cancelled. No files were modified.\n");
  process.exit(0);
}

const created = backupProtectedEnvFiles();
if (created.length) {
  console.log("\nSafety copies created before restore:");
  for (const c of created) console.log(`  ${path.basename(c)}`);
}

fs.copyFileSync(chosen.path, target);
console.log(`\n✅ Restored ${chosen.kind} from ${chosen.name}`);
console.log("Run: npm run scriptora:doctor\n");
