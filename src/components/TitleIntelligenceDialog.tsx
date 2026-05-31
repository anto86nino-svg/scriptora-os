import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTitleIntelligence, TitleCard, Level } from "@/hooks/useTitleIntelligence";
import { supabase } from "@/integrations/supabase/client";
import { getGenreProfile, resolveGenreKey } from "@/lib/genre-intelligence";
import { NicheTrendingPlaylist, type NicheImport } from "@/components/kdp/NicheTrendingPlaylist";
import { MarketDataStatusBadge, MarketDataStatusNotice } from "@/components/market-intelligence/MarketDataStatusBadge";
import { statusFromTitleFallback } from "@/lib/market-intelligence/marketDataStatus";
import { getScriptoraLanguage, t } from "@/lib/i18n";
import { X, Sparkles, RefreshCw, Check, Copy, Zap, Target, Brain, TrendingUp, Loader2, Flame, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useFeatureGate } from "@/components/PaywallGuard";
import { getCurrentUserId } from "@/services/storageService";
import { AUTHOR_IDENTITY_CHANGED_EVENT, getSelectedAuthorIdentity } from "@/lib/author-identity";

interface Props {
  open: boolean;
  onClose: () => void;
  initialTitle?: string;
  initialGenre?: string;
  onSelect?: (title: string, subtitle: string) => void;
}

export function TitleIntelligenceDialog({ open, onClose, initialTitle, initialGenre, onSelect }: Props) {
  const navigate = useNavigate();
  const [bookTitle, setBookTitle] = useState(initialTitle || "");
  const [bookGenre, setBookGenre] = useState(initialGenre || "");
  const [targetAudience, setTargetAudience] = useState("");
  const [bookPromise, setBookPromise] = useState("");
  const [authorIdentity, setAuthorIdentity] = useState(() => getSelectedAuthorIdentity());
  const [tone, setTone] = useState<"professionale" | "emotivo" | "aggressivo">("professionale");
  const [language, setLanguage] = useState<string>(() => getScriptoraLanguage());
  const [autoFilling, setAutoFilling] = useState(false);

  const { data, loading, error, generate, regenerate, reset } = useTitleIntelligence();
  // Gate: needs at least Pro (title_intelligence_base). Free users see paywall instead.
  const gate = useFeatureGate("title_intelligence_base");

  useEffect(() => {
    if (!open) return;
    setLanguage(getScriptoraLanguage());
    const refreshAuthor = () => setAuthorIdentity(getSelectedAuthorIdentity());
    refreshAuthor();
    window.addEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refreshAuthor);
    window.addEventListener("storage", refreshAuthor);
    return () => {
      window.removeEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refreshAuthor);
      window.removeEventListener("storage", refreshAuthor);
    };
  }, [open]);

  const canSubmit = bookGenre.trim() && targetAudience.trim() && bookPromise.trim() && !loading;

  const handleAutoFill = gate.guard(async () => {
    setAutoFilling(true);
    try {
      // Invisible routing: pass plan so the edge function picks the cheapest viable mode.
      const { fetchPlan } = await import("@/lib/plan");
      const plan = await fetchPlan();
      const { data: res, error: err } = await supabase.functions.invoke("title-autofill", {
        body: {
          bookGenre: bookGenre || "Self-help",
          language,
          seed: Math.floor(Math.random() * 1000000),
          currentTitle: bookTitle,
          plan,
          userId: getCurrentUserId(),
        },
      });
      if (err) throw new Error(err.message);
      if ((res as any)?.error) throw new Error((res as any).error);
      const r = res as { bookTitle: string; subtitle: string; bookPromise: string; targetAudience: string };
      setBookTitle(r.bookTitle);
      setBookPromise(r.bookPromise);
      setTargetAudience(r.targetAudience);
      toast.success(bookTitle ? "Nuova variante generata" : "Concept generato");
    } catch (e: any) {
      toast.error(e?.message || "Generazione fallita");
    } finally {
      setAutoFilling(false);
    }
  });

  const buildGenrePayload = () => {
    if (!bookGenre.trim()) return null;
    const key = resolveGenreKey(bookGenre);
    const p = getGenreProfile(bookGenre);
    return {
      key,
      tone: p.tone,
      vocabulary: p.vocabulary,
      readerPromise: p.readerPromise,
      authorsDNA: p.authorsDNA,
      hookTypes: p.hookTypes,
      dos: p.dos,
      donts: p.donts,
    };
  };

  const handleGenerate = gate.guard(async () => {
    try {
      await generate({ bookTitle, bookGenre, targetAudience, bookPromise, tone, language, genreProfile: buildGenrePayload() } as any);
    } catch (e: any) {
      toast.error(e?.message || "Generazione fallita");
    }
  });

  const openPostConfigurationFromNiche = (n: NicheImport) => {
    const ideaParts = [
      n.name,
      n.genre ? `Categoria: ${n.genre}` : "",
      n.bookPromise ? `Promessa: ${n.bookPromise}` : "",
      n.angle ? `Angolo editoriale: ${n.angle}` : "",
      n.keywords?.length ? `Keyword: ${n.keywords.join(", ")}` : "",
    ].filter(Boolean);

    sessionStorage.setItem("nexora-auto-brief", JSON.stringify({
      idea: ideaParts.join("\n"),
      genre: n.genre || bookGenre || "Self-help",
      subcategory: n.name || "",
      targetAudience: n.targetAudience || targetAudience || "",
      tone,
      language,
      numberOfChapters: 8,
      level: "intermediate",
      readerPromise: n.bookPromise || bookPromise || "",
      prefilledTitle: "",
      prefilledSubtitle: "",
      authorName: authorIdentity.penName,
      authorIdentityId: authorIdentity.id,
      authorIdentity,
      autoStart: false,
    }));

    onClose();
    navigate("/auto-bestseller");
  };


  const handleRegenerate = async () => {
    try {
      await regenerate();
      toast.success("Nuove varianti generate");
    } catch (e: any) {
      toast.error(e?.message || "Rigenerazione fallita");
    }
  };

  const handleSelect = (card: TitleCard) => {
    if (onSelect) {
      onSelect(card.title, card.subtitle);
      toast.success(`Titolo selezionato: ${card.title}`);
      return;
    }

    sessionStorage.setItem("nexora-auto-brief", JSON.stringify({
      idea: bookPromise || bookTitle || card.title,
      genre: bookGenre || "Self-help",
      subcategory: bookGenre || "",
      targetAudience: targetAudience || "Lettori interessati a questo argomento",
      tone,
      language,
      numberOfChapters: 8,
      level: "intermediate",
      readerPromise: bookPromise || card.subtitle,
      prefilledTitle: card.title,
      prefilledSubtitle: card.subtitle,
      authorName: authorIdentity.penName,
      authorIdentityId: authorIdentity.id,
      authorIdentity,
      autoStart: false,
    }));

    reset();
    onClose();
    toast.success("Progetto preparato — completa il brief e avvia la scrittura");
    navigate("/auto-bestseller");
  };

  const copyTitle = (card: TitleCard) => {
    navigator.clipboard.writeText(`${card.title}\n${card.subtitle}`);
    toast.success("Copiato negli appunti");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="scriptora-modal-overlay">
      <div className="scriptora-modal-panel scriptora-mobile-work-panel max-w-4xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Title Domination Studio™</h2>
                {data && (
                  <MarketDataStatusBadge status={statusFromTitleFallback(data.fallbackReason)} />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{t("title_intelligence_desc")}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scriptora-modal-body space-y-5 p-5">
          {/* INPUT FORM */}
          {!data && (
            <div className="space-y-4">
              {/* TRENDING NICHES PLAYLIST — multi-market discovery.
                  Uses the SYSTEM UI language so the user understands what to pick,
                  independent of the book's output language. */}
              <NicheTrendingPlaylist
                language={getScriptoraLanguage()}
                initialFocus={bookGenre}
                onImport={(n: NicheImport) => {
                  openPostConfigurationFromNiche(n);
                }}
              />

              {/* AUTO-FILL BUTTON */}
              <button onClick={handleAutoFill} disabled={autoFilling}
                className="w-full h-10 rounded-lg border-2 border-dashed border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-500/60 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {autoFilling ? <><Loader2 className="h-4 w-4 animate-spin" /> Generazione concept…</> :
                  bookTitle ? <><RefreshCw className="h-3.5 w-3.5" /> Cambia titolo, sottotitolo, promessa e audience</> :
                  <><Wand2 className="h-3.5 w-3.5" /> Genera automaticamente titolo + promessa + audience</>}
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Titolo attuale (opzionale)">
                  <input value={bookTitle} onChange={e => setBookTitle(e.target.value)}
                    placeholder="Es. Il potere delle abitudini"
                    className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border focus:border-primary outline-none" />
                </Field>
                <Field label="Genere / categoria *">
                  <input value={bookGenre} onChange={e => setBookGenre(e.target.value)}
                    placeholder="Es. Self-help, Crescita personale"
                    className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border focus:border-primary outline-none" />
                </Field>
              </div>

              <Field label="Target audience *">
                <input value={targetAudience} onChange={e => setTargetAudience(e.target.value)}
                  placeholder="Es. Professionisti 30-45 anni che vogliono cambiare carriera"
                  className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border focus:border-primary outline-none" />
              </Field>

              <Field label="Promessa centrale del libro *">
                <textarea value={bookPromise} onChange={e => setBookPromise(e.target.value)}
                  placeholder="Es. Aiutare il lettore a costruire abitudini durature in 30 giorni"
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border focus:border-primary outline-none resize-none" />
              </Field>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Author Identity Lock</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{authorIdentity.penName}</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  Title Intelligence usa l'autore globale attivo. Cambialo dalla funzione Identità autore nella home.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tono">
                  <select value={tone} onChange={e => setTone(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border focus:border-primary outline-none">
                    <option value="professionale">Professionale</option>
                    <option value="emotivo">Emotivo</option>
                    <option value="aggressivo">Aggressivo / Commerciale</option>
                  </select>
                </Field>
                <Field label="Lingua del libro">
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md bg-background border border-border focus:border-primary outline-none">
                    <option value="English">English</option>
                    <option value="Italian">Italiano</option>
                    <option value="Spanish">Español</option>
                    <option value="French">Français</option>
                    <option value="German">Deutsch</option>
                  </select>
                </Field>
              </div>

              <button onClick={handleGenerate} disabled={!canSubmit}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("radar_loading_niche")}</> : <><Sparkles className="h-4 w-4" /> {t("title_intelligence")}</>}
              </button>

              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                {t("market_data_status_estimated_desc")}
              </p>

              {error && <p className="text-xs text-destructive text-center">{error}</p>}
            </div>
          )}

          {/* RESULTS */}
          {data && (
            <div className="space-y-6">
              {data.fallbackReason && (
                <MarketDataStatusNotice
                  status="estimated"
                  extra={t("title_intel_estimated_microcopy")}
                />
              )}

              {!data.fallbackReason && (
                <MarketDataStatusNotice status="live" />
              )}

              {/* Market snapshot */}
              {data.marketSnapshot && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-cyan-400" />
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Market Snapshot</p>
                      </div>
                      <div className="flex gap-1">
                        {data.marketSnapshot.platformsAnalyzed?.map(p => (
                          <span key={p} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">{p}</span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">{data.marketSnapshot.marketInsight}</p>
                  </div>

                  {/* Sub-niches */}
                  {data.marketSnapshot.topSubNiches?.length > 0 && (
                    <div>
                      <SectionLabel icon={<Flame className="h-3.5 w-3.5" />} label="🎯 Sotto-nicchie ad alta opportunità" color="text-amber-400" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {data.marketSnapshot.topSubNiches.map((n, i) => (
                          <div key={`stable-${i}`} className="p-2.5 rounded-lg bg-card border border-border">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-xs font-semibold text-foreground leading-tight">{n.name}</p>
                              <OpportunityBadge score={n.opportunityScore} />
                            </div>
                            <div className="flex gap-1.5 mb-1">
                              <LevelChip label="Domanda" level={n.demandLevel} positive="high" />
                              <LevelChip label="Concorrenza" level={n.competitionLevel} positive="low" />
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-snug">{n.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Top titles */}
              <div>
                <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5" />} label="🔥 Top Titoli (ordinati per opportunità)" color="text-orange-400" />
                <div className="grid grid-cols-1 gap-2.5">
                  {data.topTitles.map((c, i) => (
                    <TitleCardView key={`stable-${i}`} card={c} accent="primary" onSelect={() => handleSelect(c)} onCopy={() => copyTitle(c)} />
                  ))}
                </div>
              </div>

              {/* Shadow titles */}
              {data.shadowTitles?.length > 0 && (
                <div>
                  <SectionLabel icon={<Zap className="h-3.5 w-3.5" />} label="⚡ Shadow Titles (commerciali)" color="text-purple-400" />
                  <div className="grid grid-cols-1 gap-2.5">
                    {data.shadowTitles.map((c, i) => (
                      <TitleCardView key={`stable-${i}`} card={c} accent="purple" onSelect={() => handleSelect(c)} onCopy={() => copyTitle(c)} />
                    ))}
                  </div>
                </div>
              )}

              {/* Core keywords */}
              {data.coreKeywords?.length > 0 && (
                <div>
                  <SectionLabel icon={<Target className="h-3.5 w-3.5" />} label="🎯 Core Keywords (domanda vs concorrenza)" color="text-emerald-400" />
                  <div className="flex flex-wrap gap-1.5">
                    {data.coreKeywords.map((k, i) => (
                      <KeywordChip key={`stable-${i}`} kw={k} />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={handleRegenerate} disabled={loading}
                  className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Rigenera analisi
                </button>
                <button onClick={() => reset()}
                  className="flex-1 h-10 rounded-lg border border-border hover:bg-muted text-sm font-medium">
                  Nuova analisi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {gate.modal}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SectionLabel({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 mb-2 ${color}`}>
      {icon}
      <p className="text-[11px] font-bold uppercase tracking-wider">{label}</p>
    </div>
  );
}

function OpportunityBadge({ score }: { score: number }) {
  const cls = score >= 85 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
              score >= 70 ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" :
              "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${cls} shrink-0`}>
      OPP {score}
    </span>
  );
}

function LevelChip({ label, level, positive }: { label: string; level: Level; positive: Level }) {
  const isGood = level === positive;
  const isBad = (positive === "high" && level === "low") || (positive === "low" && level === "high");
  const cls = isGood ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
              isBad ? "bg-rose-500/10 text-rose-300 border-rose-500/20" :
              "bg-muted text-muted-foreground border-border";
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] border ${cls}`}>
      {label}: {level}
    </span>
  );
}

function KeywordChip({ kw }: { kw: { keyword: string; demand: Level; competition: Level } }) {
  const opp = kw.demand === "high" && kw.competition === "low";
  const bad = kw.demand === "low" && kw.competition === "high";
  const cls = opp ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" :
              bad ? "bg-muted border-border text-muted-foreground" :
              "bg-cyan-500/10 border-cyan-500/20 text-cyan-300";
  return (
    <span className={`px-2.5 py-1 rounded-md border text-[11px] font-medium flex items-center gap-1 ${cls}`} title={`Domanda: ${kw.demand} · Concorrenza: ${kw.competition}`}>
      {opp && <Flame className="h-2.5 w-2.5" />}
      {kw.keyword}
      <span className="opacity-60 text-[9px]">D:{kw.demand[0].toUpperCase()}/C:{kw.competition[0].toUpperCase()}</span>
    </span>
  );
}

function TitleCardView({
  card, accent, onSelect, onCopy,
}: { card: TitleCard; accent: "primary" | "purple"; onSelect: () => void; onCopy: () => void; }) {
  const accentBg = accent === "purple" ? "from-purple-500/5 to-pink-500/5 border-purple-500/20" : "from-card to-card border-border";
  const convCls = card.conversionScore >= 90 ? "text-emerald-400 bg-emerald-500/10" : card.conversionScore >= 80 ? "text-cyan-400 bg-cyan-500/10" : "text-amber-400 bg-amber-500/10";

  return (
    <div className={`p-3.5 rounded-xl bg-gradient-to-br ${accentBg} border hover:border-primary/40 transition-colors group`}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight">{card.title}</h3>
          {card.subNiche && (
            <p className="text-[9px] uppercase tracking-wider text-cyan-400/80 font-semibold mt-0.5">↳ {card.subNiche}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <OpportunityBadge score={card.opportunityScore} />
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${convCls}`}>CTR {card.conversionScore}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic mb-2 leading-snug">{card.subtitle}</p>
      <div className="flex gap-1.5 mb-2">
        <LevelChip label="Domanda" level={card.demandLevel} positive="high" />
        <LevelChip label="Concorrenza" level={card.competitionLevel} positive="low" />
      </div>
      <p className="text-[11px] text-foreground/70 leading-relaxed mb-2.5">{card.rationale}</p>
      <div className="flex gap-1.5">
        <button onClick={onSelect}
          className="flex-1 h-7 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors">
          <Check className="h-3 w-3" /> Seleziona
        </button>
        <button onClick={onCopy}
          className="h-7 px-2 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1 transition-colors">
          <Copy className="h-3 w-3" /> Copia
        </button>
      </div>
    </div>
  );
}
