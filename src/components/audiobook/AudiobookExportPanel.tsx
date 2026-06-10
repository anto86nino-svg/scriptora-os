import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Download, FileJson, FileText, Headphones, Mic, Sparkles, AlertCircle, Lock,
} from "lucide-react";
import type { BookProject } from "@/types/book";
import { FeatureStatusBadge } from "@/components/payments/FeatureStatusBadge";
import { HumanReadingPlayer, type HumanReadingPlayerHandle } from "@/components/audiobook/HumanReadingPlayer";
import {
  audiobookProjectsWithContent,
  buildAudiobookManifest,
  buildAudiobookScript,
  downloadAudiobookScript,
  formatAudiobookDuration,
  splitBookIntoAudioChapters,
} from "@/lib/audiobook-export";
import { audiobookListenModeLabel, isRealAudioFileExportSupported } from "@/lib/audiobook-capabilities";
import { toast } from "sonner";

interface AudiobookExportPanelProps {
  projects: BookProject[];
  selectedProjectId?: string;
  onSelectProject?: (id: string) => void;
  compact?: boolean;
}

export function AudiobookExportPanel({
  projects,
  selectedProjectId,
  onSelectProject,
  compact = false,
}: AudiobookExportPanelProps) {
  const listenable = useMemo(() => audiobookProjectsWithContent(projects), [projects]);
  const [internalId, setInternalId] = useState(listenable[0]?.id || "");
  const [showPlayer, setShowPlayer] = useState(false);
  const playerRef = useRef<HumanReadingPlayerHandle>(null);

  const activeId = selectedProjectId ?? internalId;
  const project = listenable.find((p) => p.id === activeId) || listenable[0] || null;

  const manifest = useMemo(
    () => (project ? buildAudiobookManifest(project) : null),
    [project],
  );
  const chapters = useMemo(
    () => (project ? splitBookIntoAudioChapters(project) : []),
    [project],
  );

  const setProjectId = (id: string) => {
    if (onSelectProject) onSelectProject(id);
    else setInternalId(id);
  };

  const handleDownload = async (format: "txt" | "json") => {
    if (!project) return;
    try {
      await downloadAudiobookScript(project, format);
      toast.success(format === "json" ? "Manifest audiolibro scaricato" : "Copione audiolibro scaricato");
    } catch {
      toast.error("Download non riuscito. Riprova.");
    }
  };

  const realFileExport = isRealAudioFileExportSupported();

  if (listenable.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 text-center">
        <p className="text-sm text-muted-foreground">Nessun capitolo con testo per l'audiolibro.</p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Scrivi o genera almeno un capitolo, poi torna qui.
        </p>
      </div>
    );
  }

  return (
    <div className={`max-w-full space-y-4 overflow-x-hidden ${compact ? "" : "rounded-2xl border border-white/12 bg-white/[0.03] p-4"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Audiolibro</h3>
        <FeatureStatusBadge featureId="audiobook_listen" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
          {audiobookListenModeLabel()}
        </span>
        <FeatureStatusBadge featureId="audiobook_script" />
      </div>

      {!selectedProjectId && (
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progetto</label>
          <select
            value={activeId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-11 min-h-[44px] w-full rounded-lg border border-border bg-background px-3 text-sm"
          >
            {listenable.map((p) => (
              <option key={p.id} value={p.id}>{p.config.title || "Senza titolo"}</option>
            ))}
          </select>
        </div>
      )}

      {manifest && project && (
        <>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Stat label="Titolo" value={manifest.title} />
            <Stat label="Autore" value={manifest.author || manifest.penName || "—"} />
            <Stat label="Capitoli" value={String(manifest.chapterCount)} />
            <Stat label="Durata stim." value={formatAudiobookDuration(manifest.estimatedTotalMinutes)} />
            <Stat label="Lingua" value={manifest.language} />
            <Stat label="Parole" value={manifest.totalWords.toLocaleString("it-IT")} />
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/15 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Durata per capitolo</p>
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs text-foreground/85">
              {chapters.map((ch) => (
                <li key={ch.id} className="flex justify-between gap-2">
                  <span className="truncate">{ch.index + 1}. {ch.title}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{formatAudiobookDuration(ch.estimatedMinutes)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <ActionButton
              icon={Headphones}
              label="Ascolta anteprima"
              hint="Legge un breve estratto del capitolo corrente (senza crediti)"
              onClick={() => {
                setShowPlayer(true);
                window.setTimeout(() => playerRef.current?.playPreview(), 80);
              }}
              badge={<FeatureStatusBadge featureId="audiobook_listen" />}
            />
            <ActionButton
              icon={Headphones}
              label="Ascolta audiolibro"
              hint="Apre il player completo con navigazione capitoli"
              onClick={() => {
                setShowPlayer(true);
                window.setTimeout(() => playerRef.current?.playFull(), 80);
              }}
              badge={<FeatureStatusBadge featureId="audiobook_listen" />}
            />
            <ActionButton
              icon={Sparkles}
              label="Genera copione audiolibro"
              hint="Costruisce testo pulito con pause [Pausa breve/lunga]"
              onClick={() => {
                buildAudiobookScript(project);
                toast.success("Copione pronto. Usa Scarica copione o Manifest.");
              }}
              badge={<FeatureStatusBadge featureId="audiobook_script" />}
            />
            <ActionButton
              icon={FileText}
              label="Scarica copione (.txt)"
              hint="Esporta copione audio per narratore o TTS esterno"
              onClick={() => void handleDownload("txt")}
            />
            <ActionButton
              icon={FileJson}
              label="Manifest audiolibro (.json)"
              hint="Metadata strutturati, capitoli e durate stimate"
              onClick={() => void handleDownload("json")}
            />
          </div>

          {showPlayer && (
            <HumanReadingPlayer
              ref={playerRef}
              projectId={project.id}
              bookTitle={manifest.title}
              language={manifest.language}
              chapters={chapters}
            />
          )}

          {!realFileExport && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-950/20 p-3">
              <div className="flex items-start gap-2">
                <Mic className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-amber-100">MP3/M4B presto disponibile</p>
                    <FeatureStatusBadge featureId="audiobook_mp3" />
                    <Lock className="h-3.5 w-3.5 text-amber-200/70" />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-amber-100/75">
                    L'export MP3/M4B richiede una voce premium o backend TTS.
                    Puoi già ascoltare il libro dentro Scriptora ({audiobookListenModeLabel()}) e scaricare
                    il copione audiolibro pronto per narratore o TTS esterno.
                  </p>
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="mt-2 inline-flex h-11 min-h-[44px] cursor-not-allowed items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-white/45"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Voce premium richiesta
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Ascolto locale, anteprima, copione .txt e manifest .json: zero crediti.
            MP3/M4B scaleranno crediti solo con generazione audio reale via TTS backend.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-muted/20 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  hint,
  onClick,
  badge,
}: {
  icon: typeof Headphones;
  label: string;
  hint: string;
  onClick: () => void;
  badge?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full flex-col items-start rounded-xl border border-border bg-card/60 p-3 text-left transition-colors hover:bg-muted/30"
    >
      <div className="flex w-full items-center justify-between gap-2">
        <Icon className="h-4 w-4 text-sky-300" />
        {badge}
      </div>
      <span className="mt-2 text-sm font-semibold text-foreground">{label}</span>
      <span className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{hint}</span>
    </button>
  );
}
