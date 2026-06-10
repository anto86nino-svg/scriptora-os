/**
 * Single source of truth for audiobook file export.
 * MP3/M4B/WAV require a real TTS backend — browser SpeechSynthesis is listen-only.
 * Do NOT set this to true unless file generation is implemented and verified.
 */
export const AUDIOBOOK_REAL_FILE_EXPORT_SUPPORTED = false;

export function isRealAudioFileExportSupported(): boolean {
  return AUDIOBOOK_REAL_FILE_EXPORT_SUPPORTED;
}

export function audiobookListenModeLabel(): string {
  return "Ascolto interno Live";
}
