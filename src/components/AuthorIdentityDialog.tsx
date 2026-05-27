import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Fingerprint, HelpCircle, PlusCircle, Save, ShieldCheck, Sparkles, Trash2, UserRound, X } from "lucide-react";
import type { AuthorIdentity } from "@/types/book";
import {
  DEFAULT_AUTHOR_IDENTITIES,
  deleteAuthorIdentity,
  getSelectedAuthorIdentity,
  loadAuthorIdentities,
  normalizeAuthorIdentity,
  saveAuthorIdentity,
  setSelectedAuthorIdentityId,
} from "@/lib/author-identity";
import { t, tt, useUILanguage } from "@/lib/i18n";
import { toast } from "sonner";

interface AuthorIdentityDialogProps {
  open: boolean;
  onClose: () => void;
}

function createBlankAuthor(): AuthorIdentity {
  const now = new Date().toISOString();
  return {
    id: `custom-${crypto.randomUUID()}`,
    name: "Nuovo autore",
    realName: "",
    penName: "",
    copyrightName: "",
    archetype: "",
    biography: "",
    authorNote: "",
    voice: "",
    signatureMoves: "",
    forbiddenMoves: "",
    recurringThemes: "",
    language: "Italian",
    createdAt: now,
    updatedAt: now,
  };
}

function completeness(identity: AuthorIdentity): number {
  const fields = [
    identity.name,
    identity.penName,
    identity.copyrightName || identity.realName,
    identity.archetype,
    identity.biography,
    identity.authorNote,
    identity.voice,
    identity.signatureMoves,
    identity.forbiddenMoves,
    identity.recurringThemes,
  ];
  return Math.round((fields.filter((value) => String(value || "").trim().length > 8).length / fields.length) * 100);
}

export function AuthorIdentityDialog({ open, onClose }: AuthorIdentityDialogProps) {
  useUILanguage();
  const [identities, setIdentities] = useState<AuthorIdentity[]>(() => loadAuthorIdentities());
  const [draft, setDraft] = useState<AuthorIdentity>(() => getSelectedAuthorIdentity());
  const [guideEnabled, setGuideEnabled] = useState(() => localStorage.getItem("scriptora-guided-flow") === "on");

  useEffect(() => {
    if (!open) return;
    const loaded = loadAuthorIdentities();
    const selected = getSelectedAuthorIdentity() || loaded[0] || DEFAULT_AUTHOR_IDENTITIES[0];
    setIdentities(loaded);
    setDraft(selected);
  }, [open]);

  useEffect(() => {
    const syncGuideToggle = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") setGuideEnabled(detail.enabled);
    };

    window.addEventListener("scriptora-guided-flow-change", syncGuideToggle as EventListener);
    return () => window.removeEventListener("scriptora-guided-flow-change", syncGuideToggle as EventListener);
  }, []);

  const score = useMemo(() => completeness(draft), [draft]);
  const selectedId = getSelectedAuthorIdentity().id;
  const isCustom = draft.id?.startsWith("custom-");
  const publicAuthor = normalizeAuthorIdentity(draft);

  if (!open) return null;

  const refresh = () => setIdentities(loadAuthorIdentities());

  const selectIdentity = (id: string) => {
    const identity = identities.find((item) => item.id === id);
    if (!identity) return;
    setDraft(identity);
    setSelectedAuthorIdentityId(identity.id);
    toast.success(tt("author_identity_selected", { name: identity.penName }));
  };

  const updateDraft = (patch: Partial<AuthorIdentity>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (patch.realName !== undefined && (!prev.copyrightName || prev.copyrightName === prev.realName || prev.copyrightName === prev.penName)) {
        next.copyrightName = patch.realName;
      }
      if (patch.penName !== undefined && !String(next.name || "").trim()) {
        next.name = patch.penName || "";
      }
      return next;
    });
  };

  const toggleGuide = () => {
    const next = !guideEnabled;
    localStorage.setItem("scriptora-guided-flow", next ? "on" : "off");
    setGuideEnabled(next);
    window.dispatchEvent(new CustomEvent("scriptora-guided-flow-change", { detail: { enabled: next } }));
  };

  const saveDraft = () => {
    if (!draft.penName.trim()) {
      toast.error("Inserisci almeno il pen name pubblico.");
      return;
    }
    const saved = saveAuthorIdentity(draft);
    setSelectedAuthorIdentityId(saved.id);
    refresh();
    setDraft(saved);
    toast.success(tt("author_identity_selected", { name: saved.penName }));
  };

  const createIdentity = () => {
    const fresh = createBlankAuthor();
    setDraft(fresh);
  };

  const deleteIdentity = () => {
    if (!isCustom) return;
    deleteAuthorIdentity(draft.id);
    const loaded = loadAuthorIdentities();
    const fallback = loaded[0] || DEFAULT_AUTHOR_IDENTITIES[0];
    setSelectedAuthorIdentityId(fallback.id);
    setIdentities(loaded);
    setDraft(fallback);
    toast.success("Identità autore eliminata.");
  };

  const applyPreset = (kind: "fiction" | "nonfiction" | "premium") => {
    if (kind === "fiction") {
      updateDraft({
        archetype: "Autore narrativo ad alta tensione emotiva, con controllo di scena, desiderio e conseguenze.",
        voice: "Voce sensoriale, cinematografica, con frasi pulite, sottotesto emotivo e ritmo da pagina-giro.",
        signatureMoves: "Aperture in scena; dettagli fisici precisi; cliffhanger emotivi; simboli ricorrenti; dialoghi con sottotesto.",
        forbiddenMoves: "Non spiegare troppo. Non cambiare nomi canonici. Non risolvere conflitti senza costo emotivo.",
        recurringThemes: "Desiderio, colpa, identità, memoria, potere, scelta irreversibile.",
      });
      return;
    }

    if (kind === "nonfiction") {
      updateDraft({
        archetype: "Autore esperto, chiaro, pratico e trasformativo.",
        voice: "Voce autorevole ma umana: principio, esempio, framework, azione concreta.",
        signatureMoves: "Framework numerati; checklist; domande diagnostiche; esempi quotidiani; chiusure operative.",
        forbiddenMoves: "Non usare motivazione vaga, gergo inutile, promesse non dimostrate o ripetizioni.",
        recurringThemes: "Metodo, identità, abitudini, decisioni, risultati misurabili.",
      });
      return;
    }

    updateDraft({
      archetype: "Author brand premium, coerente tra voce, copertina, bio, copyright e promessa editoriale.",
      voice: "Voce riconoscibile, controllata e memorabile: ogni capitolo deve sembrare scritto dallo stesso autore.",
      signatureMoves: "Hook forte; ritmo editoriale; immagini proprietarie; payoff emotivo; chiusura che spinge al capitolo successivo.",
      forbiddenMoves: "Non inventare autori alternativi. Non cambiare identità. Non usare tono generico da AI.",
      recurringThemes: "Promessa, trasformazione, autorità, desiderio del lettore, continuità di brand.",
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-card shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-card/95 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t("author_identity")}</h2>
              <p className="text-xs text-muted-foreground">
                Profilo autore globale: Scriptora lo usa per libri, voce, front/back matter, copertine ed export.
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground" aria-label={t("close")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Author Vault</p>
              <div className="mt-3 space-y-2">
                {identities.map((identity) => (
                  <button
                    key={identity.id}
                    type="button"
                    onClick={() => selectIdentity(identity.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      draft.id === identity.id
                        ? "border-primary/40 bg-primary/10"
                        : "border-white/10 bg-background/40 hover:border-primary/25 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{identity.penName}</p>
                      {selectedId === identity.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">{identity.name || identity.archetype}</p>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={createIdentity}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] text-xs font-bold text-foreground transition-colors hover:bg-white/[0.12]"
              >
                <PlusCircle className="h-4 w-4" />
                Nuova identità
              </button>
            </div>

            <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-cyan-100">Completezza Pro</p>
                <span className="text-sm font-bold text-cyan-100">{score}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-fuchsia-300" style={{ width: `${score}%` }} />
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                Più campi compili, più Scriptora mantiene coerenza di autore, voce e metadata.
              </p>
            </div>
          </aside>

          <main className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Identity Core</p>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">{publicAuthor?.penName || "Pen name non impostato"}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Copyright: {draft.copyrightName || draft.realName || draft.penName || "da impostare"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => applyPreset("fiction")} className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/[0.12]">
                    Fiction DNA
                  </button>
                  <button type="button" onClick={() => applyPreset("nonfiction")} className="rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/[0.12]">
                    Non-fiction DNA
                  </button>
                  <button type="button" onClick={() => applyPreset("premium")} className="rounded-lg border border-primary/30 bg-primary/15 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20">
                    Pro Voice Lock
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <AuthorField label="Nome profilo">
                <input value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} className="author-input" placeholder="Es. Penna romance, Saggista chiaro..." />
              </AuthorField>
              <AuthorField label="Pen name pubblico">
                <input value={draft.penName} onChange={(e) => updateDraft({ penName: e.target.value })} className="author-input" placeholder="Nome in copertina" />
              </AuthorField>
              <AuthorField label="Nome reale / società">
                <input value={draft.realName || ""} onChange={(e) => updateDraft({ realName: e.target.value })} className="author-input" placeholder="Privato, usato se vuoi per copyright" />
              </AuthorField>
              <AuthorField label="Nome copyright">
                <input value={draft.copyrightName || ""} onChange={(e) => updateDraft({ copyrightName: e.target.value })} className="author-input" placeholder="Nome legale o pen name" />
              </AuthorField>
            </section>

            <section className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <AuthorField label="Archetipo autore">
                <textarea value={draft.archetype} onChange={(e) => updateDraft({ archetype: e.target.value })} rows={4} className="author-textarea" placeholder="Che tipo di autore è? Cosa promette al lettore?" />
              </AuthorField>
              <AuthorField label="Voce / Voice DNA">
                <textarea value={draft.voice} onChange={(e) => updateDraft({ voice: e.target.value })} rows={4} className="author-textarea" placeholder="Ritmo, tono, fraseggio, lessico, energia emotiva..." />
              </AuthorField>
            </section>

            <section className="grid gap-3 lg:grid-cols-2">
              <AuthorField label="Biografia pubblica">
                <textarea value={draft.biography} onChange={(e) => updateDraft({ biography: e.target.value })} rows={4} className="author-textarea" placeholder="Bio autore per back matter, profilo e pagine libro..." />
              </AuthorField>
              <AuthorField label="Nota autore">
                <textarea value={draft.authorNote || ""} onChange={(e) => updateDraft({ authorNote: e.target.value })} rows={4} className="author-textarea" placeholder="Nota personale, missione o messaggio finale al lettore..." />
              </AuthorField>
            </section>

            <section className="grid gap-3 lg:grid-cols-3">
              <AuthorField label="Firma stilistica">
                <textarea value={draft.signatureMoves} onChange={(e) => updateDraft({ signatureMoves: e.target.value })} rows={4} className="author-textarea" placeholder="Aperture, immagini, finali, struttura..." />
              </AuthorField>
              <AuthorField label="Divieti">
                <textarea value={draft.forbiddenMoves} onChange={(e) => updateDraft({ forbiddenMoves: e.target.value })} rows={4} className="author-textarea" placeholder="Cose che Scriptora non deve mai fare con questa voce..." />
              </AuthorField>
              <AuthorField label="Temi ricorrenti">
                <textarea value={draft.recurringThemes} onChange={(e) => updateDraft({ recurringThemes: e.target.value })} rows={4} className="author-textarea" placeholder="Ossessioni creative, valori, temi, tensioni..." />
              </AuthorField>
            </section>

            <section className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Guida Scriptora</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Mostra istruzioni step-by-step nelle funzioni di Scriptora.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleGuide}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${guideEnabled ? "bg-primary/20 text-primary border border-primary/30" : "bg-white/[0.07] text-foreground hover:bg-white/[0.12] border border-white/10"}`}
                  aria-pressed={guideEnabled}
                >
                  {guideEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Global Author Lock</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    L'autore attivo viene salvato nel cofano di Scriptora e applicato ai nuovi libri, a Bestseller Engine, front matter, back matter, copertine, export e voce di generazione. Nessun autore casuale.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-white/10 bg-card/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            Autore attivo: <span className="font-semibold text-foreground">{publicAuthor?.penName || "non impostato"}</span>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {isCustom && (
              <button type="button" onClick={deleteIdentity} className="inline-flex h-10 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-4 w-4" />
                Elimina
              </button>
            )}
            <button type="button" onClick={saveDraft} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90">
              <Save className="h-4 w-4" />
              Salva e rendi attivo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <span className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <UserRound className="h-3 w-3" />
        {label}
      </span>
      {children}
    </label>
  );
}
