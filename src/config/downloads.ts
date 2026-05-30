// Centralized downloads configuration. Reads .env, provides safe defaults,
// and exposes a typed config consumed by the Download Center UI.
// NOTE: No real artifacts are bundled here. This is a dormant, future-ready layer.

export type DownloadMode = "coming_soon" | "live";
export type Platform = "android" | "ios" | "macos" | "windows" | "linux" | "web";
export type FileType = "apk" | "aab" | "dmg" | "zip" | "exe" | "deb" | "appimage" | "pwa";

export interface DownloadItem {
  id: string;
  platform: Platform;
  label: string;
  description: string;
  url: string;
  available: boolean;
  comingSoon: boolean;
  fileType: FileType;
  recommended?: boolean;
}

function readEnv(key: string, fallback = ""): string {
  try {
    const v = (import.meta as any)?.env?.[key];
    return typeof v === "string" ? v : fallback;
  } catch {
    return fallback;
  }
}

export const downloadsEnabled = readEnv("VITE_ENABLE_DOWNLOADS", "false") === "true";
const MODE_RAW = readEnv("VITE_DOWNLOAD_MODE", "coming_soon") as DownloadMode;
export const downloadMode: DownloadMode =
  MODE_RAW === "live" ? "live" : "coming_soon";

export const appVersion = readEnv("VITE_APP_VERSION", "0.1.0");
export const buildChannel = readEnv("VITE_BUILD_CHANNEL", "alpha");

const ANDROID_APK = readEnv("VITE_ANDROID_APK_URL", "");
const ANDROID_AAB = readEnv("VITE_ANDROID_AAB_URL", "");
const MAC_DMG = readEnv("VITE_MAC_DMG_URL", "");
const MAC_ZIP = readEnv("VITE_MAC_ZIP_URL", "");
const WINDOWS_EXE = readEnv("VITE_WINDOWS_EXE_URL", "");

function buildItem(
  partial: Omit<DownloadItem, "available" | "comingSoon">,
): DownloadItem {
  const live = downloadsEnabled && downloadMode === "live";
  const hasUrl = !!partial.url;
  return {
    ...partial,
    available: live && hasUrl,
    comingSoon: !live || !hasUrl,
  };
}

export const downloadItems: DownloadItem[] = [
  buildItem({
    id: "android-apk",
    platform: "android",
    label: "Android APK",
    description: "Installazione diretta su dispositivi Android (sideload).",
    url: ANDROID_APK,
    fileType: "apk",
    recommended: true,
  }),
  buildItem({
    id: "android-aab",
    platform: "android",
    label: "Android AAB",
    description: "Bundle per Google Play Store (uso interno / publishing).",
    url: ANDROID_AAB,
    fileType: "aab",
  }),
  buildItem({
    id: "macos-dmg",
    platform: "macos",
    label: "macOS Installer",
    description: "File DMG installabile per Mac (Apple Silicon & Intel).",
    url: MAC_DMG,
    fileType: "dmg",
    recommended: true,
  }),
  buildItem({
    id: "macos-zip",
    platform: "macos",
    label: "macOS ZIP",
    description: "Archivio portatile per Mac, senza installer.",
    url: MAC_ZIP,
    fileType: "zip",
  }),
  buildItem({
    id: "windows-exe",
    platform: "windows",
    label: "Windows Installer",
    description: "Installer .exe per Windows 10/11 (in arrivo).",
    url: WINDOWS_EXE,
    fileType: "exe",
  }),
];

export interface ChangelogEntry {
  version: string;
  date: string;
  channel: string;
  notes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: appVersion,
    date: "2026-04-20",
    channel: buildChannel,
    notes: [
      "download_changelog_note_1",
      "download_changelog_note_2",
      "download_changelog_note_3",
    ],
  },
];