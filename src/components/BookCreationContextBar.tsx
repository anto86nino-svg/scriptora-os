import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Fingerprint, Mic2, Users, BookOpen, Sparkles } from "lucide-react";
import { AUTHOR_IDENTITY_CHANGED_EVENT, type AuthorIdentity } from "@/lib/author-identity";
import type { AuthorVoice, BestsellerProConfig } from "@/lib/bestseller-pro-config";
import { getBookCreationContextSnapshot } from "@/lib/book-creation-coherence";
import { cn } from "@/lib/utils";

interface BookCreationContextBarProps {
  authorIdentity?: AuthorIdentity | null;
  authorVoice?: AuthorVoice;
  bestsellerPro?: BestsellerProConfig | null;
  genre?: string;
  variant?: "default" | "dashboard";
  className?: string;
}

function ContextPill({
  icon: Icon,
  label,
  value,
  active = true,
  variant,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  active?: boolean;
  variant: "default" | "dashboard";
}) {
  if (!active || !value) return null;

  const dashboard = variant === "dashboard";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium",
        dashboard
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
          : "border-primary/20 bg-primary/8 text-foreground/90",
      )}
    >
      <Icon className={cn("h-3 w-3 shrink-0", dashboard ? "text-emerald-300" : "text-primary")} />
      <span className="shrink-0 uppercase tracking-wide opacity-70">{label}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

/** Shows what Scriptora will use before generation — cast, author, voice. */
export function BookCreationContextBar({
  authorIdentity,
  authorVoice,
  bestsellerPro,
  genre,
  variant = "default",
  className,
}: BookCreationContextBarProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    window.addEventListener("scriptora-character-bible-change", refresh);
    window.addEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("scriptora-character-bible-change", refresh);
      window.removeEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refresh);
    };
  }, []);

  const snapshot = useMemo(
    () => getBookCreationContextSnapshot({ authorIdentity, authorVoice, bestsellerPro, genre }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authorIdentity, authorVoice, bestsellerPro, genre, tick],
  );

  const castLabel = snapshot.castLinked
    ? snapshot.castSource === "studio"
      ? `Cast collegato · ${snapshot.castCount} personaggi`
      : snapshot.castSource === "both"
        ? `Cast collegato · ${snapshot.castCount} (Studio + brief)`
        : `Cast brief · ${snapshot.castCount} personaggi`
    : "";

  const dashboard = variant === "dashboard";

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        dashboard ? "border-white/10 bg-white/[0.04]" : "border-border/60 bg-muted/20",
        className,
      )}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Sparkles className={cn("h-3 w-3", dashboard ? "text-emerald-300" : "text-primary")} />
        <p className={cn("text-[10px] font-semibold uppercase tracking-wider", dashboard ? "text-muted-foreground" : "text-muted-foreground")}>
          Contesto attivo per la scrittura
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <ContextPill icon={Fingerprint} label="Autore" value={snapshot.authorName} variant={variant} />
        <ContextPill icon={Mic2} label="Voice" value={snapshot.authorVoiceLabel} variant={variant} />
        <ContextPill icon={Users} label="Cast" value={castLabel} active={snapshot.castLinked} variant={variant} />
        {snapshot.genreLabel && isNarrativeGenre(snapshot.genreLabel) && (
          <ContextPill
            icon={BookOpen}
            label="Genere"
            value={`${snapshot.genreLabel} · ${snapshot.pacingLabel}`}
            variant={variant}
          />
        )}
      </div>
      {!snapshot.castLinked && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Nessun cast collegato — Scriptora userà smart defaults. Aggiungi personaggi in Character Studio o nel brief.
        </p>
      )}
    </div>
  );
}

function isNarrativeGenre(genre: string): boolean {
  return /romance|thriller|fantasy|horror|fiction|memoir|historical|sci-fi|mystery|crime|dark-romance/i.test(genre);
}
