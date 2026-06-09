import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Pause, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ReadingStatus = "idle" | "playing" | "paused";

interface ChapterReadingSessionProps {
  projectId?: string;
  chapterIndex: number;
  chapterTitle: string;
  chapterText: string;
}

const STORAGE_PREFIX = "scriptora-reading-session-v1";

function cleanTextForReading(value: string): string {
  return String(value || "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitIntoReadableChunks(text: string): string[] {
  const clean = cleanTextForReading(text);
  if (!clean) return [];

  const sentences = clean.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [clean];
  const chunks: string[] = [];
  let buffer = "";

  for (const sentence of sentences) {
    const next = `${buffer} ${sentence}`.trim();
    if (next.length > 420 && buffer) {
      chunks.push(buffer);
      buffer = sentence.trim();
    } else {
      buffer = next;
    }
  }

  if (buffer) chunks.push(buffer);
  return chunks.filter((chunk) => chunk.length > 2);
}

function makeStorageKey(projectId: string | undefined, chapterIndex: number): string {
  return `${STORAGE_PREFIX}:${projectId || "local-project"}:${chapterIndex}`;
}

export function ChapterReadingSession({
  projectId,
  chapterIndex,
  chapterTitle,
  chapterText,
}: ChapterReadingSessionProps) {
  const chunks = useMemo(() => splitIntoReadableChunks(chapterText), [chapterText]);
  const storageKey = useMemo(() => makeStorageKey(projectId, chapterIndex), [projectId, chapterIndex]);

  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<ReadingStatus>("idle");
  const [chunkIndex, setChunkIndex] = useState(0);
  const [rate, setRate] = useState(0.95);
  const [voiceName, setVoiceName] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunkIndexRef = useRef(0);
  const manualStopRef = useRef(false);

  const progress = chunks.length ? Math.round((chunkIndex / chunks.length) * 100) : 0;
  const canRead = supported && chunks.length > 0;

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window);
  }, []);

  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
      if (!voiceName && available.length) {
        const italian =
          available.find((voice) => voice.lang?.toLowerCase().startsWith("it")) ||
          available.find((voice) => voice.lang?.toLowerCase().startsWith("en")) ||
          available[0];
        setVoiceName(italian?.name || "");
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported, voiceName]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { chunkIndex?: number; rate?: number; voiceName?: string };
      if (typeof saved.chunkIndex === "number") {
        const safeIndex = Math.min(Math.max(saved.chunkIndex, 0), Math.max(chunks.length - 1, 0));
        setChunkIndex(safeIndex);
        chunkIndexRef.current = safeIndex;
      }
      if (typeof saved.rate === "number") setRate(saved.rate);
      if (typeof saved.voiceName === "string") setVoiceName(saved.voiceName);
    } catch {
      /* ignore corrupted local reading state */
    }
  }, [storageKey, chunks.length]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ chunkIndex, rate, voiceName, updatedAt: Date.now() }));
    } catch {
      /* ignore */
    }
  }, [storageKey, chunkIndex, rate, voiceName]);

  useEffect(() => {
    chunkIndexRef.current = chunkIndex;
  }, [chunkIndex]);

  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      window.speechSynthesis?.cancel();
    };
  }, []);

  const speakFrom = (index: number) => {
    if (!canRead) return;

    const safeIndex = Math.min(Math.max(index, 0), chunks.length - 1);
    const text = chunks[safeIndex];

    manualStopRef.current = false;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    const selectedVoice = voices.find((voice) => voice.name === voiceName);
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onend = () => {
      if (manualStopRef.current) return;

      const nextIndex = safeIndex + 1;
      if (nextIndex < chunks.length) {
        setChunkIndex(nextIndex);
        chunkIndexRef.current = nextIndex;
        speakFrom(nextIndex);
      } else {
        setStatus("idle");
        setChunkIndex(0);
        chunkIndexRef.current = 0;
      }
    };

    utterance.onerror = () => {
      setStatus("idle");
    };

    utteranceRef.current = utterance;
    setChunkIndex(safeIndex);
    setStatus("playing");
    window.speechSynthesis.speak(utterance);
  };

  const play = () => {
    if (!canRead) return;

    if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("playing");
      return;
    }

    speakFrom(chunkIndexRef.current || chunkIndex);
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus("paused");
  };

  const stop = () => {
    manualStopRef.current = true;
    window.speechSynthesis.cancel();
    setStatus("idle");
  };

  const restart = () => {
    manualStopRef.current = true;
    window.speechSynthesis.cancel();
    setChunkIndex(0);
    chunkIndexRef.current = 0;
    setStatus("idle");
  };

  const saveBookmark = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ chunkIndex, rate, voiceName, bookmarkedAt: Date.now() }));
    } catch {
      /* ignore */
    }
  };

  if (!chapterText?.trim()) return null;

  return (
    <section className="mt-5 rounded-2xl border border-sky-300/15 bg-sky-500/[0.045] p-4 shadow-[0_18px_60px_rgba(14,165,233,0.08)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200/80">
            <Volume2 className="h-3.5 w-3.5" />
            Sessione lettura capitolo
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-foreground">{chapterTitle}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {supported
              ? `Riprendi, ascolta e marca il punto del capitolo. Avanzamento ${progress}%.`
              : "Questo browser non supporta la lettura vocale automatica."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {status !== "playing" ? (
            <button
              type="button"
              onClick={play}
              disabled={!canRead}
              className="ios-toolbar-button h-9 px-3 text-xs font-semibold text-sky-100 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {status === "paused" ? "Riprendi" : "Leggi"}
            </button>
          ) : (
            <button
              type="button"
              onClick={pause}
              className="ios-toolbar-button h-9 px-3 text-xs font-semibold text-amber-100"
            >
              <Pause className="h-3.5 w-3.5" />
              Pausa
            </button>
          )}

          <button type="button" onClick={stop} disabled={status === "idle"} className="ios-toolbar-button h-9 w-9 disabled:opacity-50" title="Ferma">
            <Square className="h-3.5 w-3.5" />
          </button>

          <button type="button" onClick={restart} className="ios-toolbar-button h-9 w-9" title="Torna all'inizio">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button type="button" onClick={saveBookmark} className="ios-toolbar-button h-9 w-9 text-sky-200" title="Salva segnalibro">
            <Bookmark className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full bg-sky-300 transition-all duration-500", status === "playing" && "animate-pulse")}
          style={{ width: `${Math.max(progress, status === "idle" ? 0 : 4)}%` }}
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <label className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Velocità
          <input
            type="range"
            min="0.75"
            max="1.25"
            step="0.05"
            value={rate}
            onChange={(event) => setRate(Number(event.target.value))}
            className="mt-2 w-full accent-sky-300"
          />
        </label>
        <span className="text-xs font-semibold text-sky-100">{rate.toFixed(2)}x</span>

        {voices.length > 0 && (
          <label className="sm:col-span-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Voce
            <select
              value={voiceName}
              onChange={(event) => setVoiceName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-background/70 px-3 py-2 text-xs text-foreground outline-none"
            >
              {voices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name} · {voice.lang}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </section>
  );
}
