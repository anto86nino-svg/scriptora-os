import { AlertTriangle, CheckCircle2, Fingerprint, Sparkles, Pencil } from "lucide-react";
import type { AuthorIdentity } from "@/types/book";
import {
  authorIdentityCompleteness,
  isUserAuthorIdentityConfigured,
} from "@/lib/author-identity";

interface AuthorIdentityHomeCardProps {
  identity: AuthorIdentity;
  onConfigure: () => void;
  onGenerateWithAi: () => void;
  onEdit: () => void;
}

export function AuthorIdentityHomeCard({
  identity,
  onConfigure,
  onGenerateWithAi,
  onEdit,
}: AuthorIdentityHomeCardProps) {
  const configured = isUserAuthorIdentityConfigured(identity);

  if (!configured) {
    return (
      <div className="mb-4 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-950/30 via-slate-950/40 to-slate-900/30 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-amber-100">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
              Identità autore non configurata
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
              Configura nome, pseudonimo e biografia prima di generare front matter, export e branding coerente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConfigure}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
            >
              <Fingerprint className="h-4 w-4" />
              Configura
            </button>
            <button
              type="button"
              onClick={onGenerateWithAi}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/12 px-4 py-2.5 text-sm font-semibold text-sky-100 hover:bg-sky-400/18"
            >
              <Sparkles className="h-4 w-4" />
              Genera con AI
            </button>
          </div>
        </div>
      </div>
    );
  }

  const completeness = authorIdentityCompleteness(identity);

  return (
    <div className="mb-4 rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-950/25 via-slate-950/40 to-slate-900/30 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-emerald-100">
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
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
        >
          <Pencil className="h-4 w-4" />
          Modifica
        </button>
      </div>
    </div>
  );
}
