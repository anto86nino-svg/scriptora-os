const LOCAL_RECOVERY_KEYS = [
  "nexora-last-project",
  "nexora_plan_cache_v1",
  "scriptora-sidebar-open",
];

const SESSION_RECOVERY_KEYS = [
  "nexora-active-run",
  "nexora-open-project",
  "nexora-open-section",
  "nexora-new-book",
  "scriptora-open-mode",
  "scriptora-setup-origin",
  "scriptora-writing-room-last-project",
  "scriptora-writing-room-active-section",
];

export function clearScriptoraLocalSessionPointers() {
  try {
    LOCAL_RECOVERY_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error("[storage parse failed] local session cleanup failed", error);
  }

  try {
    SESSION_RECOVERY_KEYS.forEach((key) => sessionStorage.removeItem(key));
  } catch (error) {
    console.error("[storage parse failed] session cleanup failed", error);
  }
}

export function retryScriptoraBoot() {
  window.location.reload();
}

export function goScriptoraHome() {
  window.location.assign("/");
}

export function openSafeScriptoraDashboard() {
  clearScriptoraLocalSessionPointers();
  window.location.assign("/dashboard?safe=1");
}
