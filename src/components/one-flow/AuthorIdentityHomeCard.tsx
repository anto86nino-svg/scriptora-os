import { AlertTriangle, CheckCircle2, Fingerprint, Sparkles, Pencil } from "lucide-react";
import type { AuthorIdentity } from "@/types/book";
import {
  authorIdentityCompleteness,
  isUserAuthorIdentityConfigured,
} from "@/lib/author-identity";
import { cn } from "@/lib/utils";

interface AuthorIdentityHomeCardProps {
  identity: AuthorIdentity;
  onConfigure: () => void;
  onGenerateWithAi: () => void;
  onEdit: () => void;
  className?: string;
}

export function AuthorIdentityHomeCard({
  identity,
  onConfigure,
  onGenerateWithAi,
  onEdit,
  className,
}: AuthorIdentityHomeCardProps) {
  const configured = isUserAuthorIdentityConfigured(identity);

  if (!configured) {
    return (
      <div
        className={cn(
          "mb-4 w-full max-w-full rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-950/30 via-slate-950/40 to-slate-900/30 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-5",
          className,
        )}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="w-full min-w-0">
            <p className="text-sm font-bold leading-snug text-amber-100">
              <span className="inline-flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>Identità autore non configurata</span>
              </span>
            </p>
            <p className="mt-2 text-sm leading-6 text-white/65 [overflow-wrap:break-word]">
              Aggiungi nome, pseudonimo, voce e promessa editoriale: Scriptora usa questa identità per scrittura, packaging, KDP, cover ed export.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:shrink-0 md:flex-wrap">
            <button
              type="button"
              onClick={onConfigure}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/15 sm:px-4"
            >
              <Fingerprint className="h-4 w-4 shrink-0" />
              Configura
            </button>
            <button
              type="button"
              onClick={onGenerateWithAi}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/12 px-3 py-2.5 text-sm font-semibold text-sky-100 hover:bg-sky-400/18 sm:px-4"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              Genera con AI
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completeness = authorIdentityCompleteness(identity);

  return (
    <div
      className={cn(
        "mb-4 w-full max-w-full rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950/25 via-slate-950/40 to-slate-900/30 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="w-full min-w-0">
          <p className="inline-flex flex-wrap items-center gap-2 text-sm font-bold text-emerald-100">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
            Identità autore attiva
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-200/90">
              {completeness}%
            </span>
          </p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/45">Nome autore</dt>
              <dd className="font-medium text-white/90">{identity.name || identity.penName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/45">Pseudonimo</dt>
              <dd className="font-medium text-white/90">{identity.penName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/45">Genere principale</dt>
              <dd className="line-clamp-2 text-white/78">{identity.archetype || identity.recurringThemes}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/45">Stile</dt>
              <dd className="line-clamp-2 text-white/78">{identity.voice}</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-50/70">
            Usata da Scriptora per coerenza voce, One Book Flow, packaging KDP, cover ed export.
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 md:w-auto"
        >
          <Pencil className="h-4 w-4" />
          Modifica
        </button>
      </div>
    </div>
  );
}
