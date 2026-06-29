import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, PencilLine, Users } from "lucide-react";
import type { BookBlueprint } from "@/types/book";
import { BlueprintTheater } from "@/components/blueprint-theater/BlueprintTheater";
import type { AuthorProposal } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";

type Props = {
  proposal: AuthorProposal;
  blueprint: BookBlueprint | null;
  generatingBlueprint?: boolean;
  approving?: boolean;
  onApprove: () => void;
  onModify: () => void;
  onApplyEdit: (text: string) => void;
  onDeepenCharacters?: () => void;
};

export function AuthorProposalScreen({
  proposal,
  blueprint,
  generatingBlueprint = false,
  approving = false,
  onApprove,
  onModify,
  onApplyEdit,
  onDeepenCharacters,
}: Props) {
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [editText, setEditText] = useState("");
  const busy = generatingBlueprint || approving;

  const handleModify = () => {
    onModify();
    window.requestAnimationFrame(() => editRef.current?.focus());
  };

  const handleApplyEdit = () => {
    const text = editText.trim();
    if (!text) return;
    onApplyEdit(text);
    setEditText("");
  };

  return (
    <div className="mx-auto flex max-h-[min(92vh,920px)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-violet-300/25 bg-[linear-gradient(160deg,rgba(88,28,135,0.22),rgba(15,23,42,0.94)_42%,rgba(14,165,233,0.08))] shadow-[0_28px_100px_rgba(0,0,0,0.35)]">
      <header className="shrink-0 border-b border-white/8 px-5 py-4 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/75">Proposta editoriale</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Il tuo libro, pronto da approvare</h2>
        <p className="mt-1 text-sm text-white/55">
          Una sola schermata — titolo, promessa, personaggi e blueprint. Approva per aprire il Writer.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
        <dl className="grid gap-3 sm:grid-cols-2">
          <ProposalRow label="Titolo" value={proposal.title} />
          <ProposalRow label="Sottotitolo" value={proposal.subtitle} />
          <ProposalRow label="Promessa" value={proposal.promise} className="sm:col-span-2" />
          <ProposalRow label="Target lettore" value={proposal.targetReader} />
          <ProposalRow label="Tono" value={proposal.tone} />
          <ProposalRow label="Personaggi" value={proposal.characters} className="sm:col-span-2" />
          <ProposalRow label="Premessa" value={proposal.premise} className="sm:col-span-2" />
        </dl>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3 sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Blueprint</p>
          {generatingBlueprint ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
              <p className="mt-3 text-sm font-semibold text-white/75">Scriptora costruisce la struttura capitoli…</p>
            </div>
          ) : blueprint ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/8">
              <BlueprintTheater
                mode="forge"
                title={proposal.title}
                subtitle={proposal.subtitle}
                genre={proposal.genre}
                blueprint={blueprint}
                italianUi
                chapterCount={blueprint.chapterOutlines.length}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/50">Anteprima blueprint in preparazione…</p>
          )}
        </div>

        <div className="mt-5">
          <label htmlFor="one-flow-edit" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            <PencilLine className="h-3.5 w-3.5" />
            Modifica la proposta…
          </label>
          <textarea
            id="one-flow-edit"
            ref={editRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Es. tono più oscuro, titolo più commerciale, meno personaggi, più tensione…"
            rows={3}
            disabled={busy}
            className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/30 focus:border-violet-300/40 focus:ring-2 focus:ring-violet-400/15 disabled:opacity-60"
          />
          {editText.trim() && (
            <button
              type="button"
              onClick={handleApplyEdit}
              disabled={busy}
              className="mt-2 inline-flex min-h-10 items-center justify-center rounded-xl border border-white/12 bg-white/[0.07] px-4 text-xs font-bold text-white/82 transition hover:bg-white/[0.12] disabled:opacity-50"
            >
              Applica modifica
            </button>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-white/8 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy || !blueprint}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Approva
          </button>
          <button
            type="button"
            onClick={handleModify}
            disabled={busy}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.06] px-4 text-sm font-bold text-white/85 transition hover:bg-white/[0.10] disabled:opacity-50"
          >
            <ArrowRight className="h-4 w-4" />
            Modifica
          </button>
        </div>
        {onDeepenCharacters && (
          <button
            type="button"
            onClick={onDeepenCharacters}
            disabled={busy}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <Users className="h-4 w-4" />
            Approfondisci personaggi
          </button>
        )}
      </footer>
    </div>
  );
}

function ProposalRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 ${className}`}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-white/88">{value || "—"}</dd>
    </div>
  );
}
