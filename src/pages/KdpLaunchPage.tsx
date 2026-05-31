import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Loader2, Rocket, Sparkles, TrendingUp, Trophy, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KdpScoreBadge } from "@/components/kdp/KdpScoreBadge";
import { KdpTitleDomination } from "@/components/kdp/KdpTitleDomination";
import { fetchPlan, type PlanTier } from "@/lib/plan";
import {
  analyzeMarket, generateTitleVariants, kdpPackaging, predictSuccess,
  type MarketAnalysis, type TitleVariants, type KDPPackaging, type SuccessPrediction,
} from "@/lib/kdp/money-engine";
import { useFeatureGate } from "@/components/PaywallGuard";
import { computeMarketPremiumScores } from "@/lib/market-intelligence-premium";
import { MarketDataStatusBadge } from "@/components/market-intelligence/MarketDataStatusBadge";
import { MarketConfidenceBadge } from "@/components/market-intelligence/MarketConfidenceBadge";
import { MarketExplainabilityCard } from "@/components/market-intelligence/MarketExplainabilityCard";
import { statusFromGrounding } from "@/lib/market-intelligence/marketDataStatus";
import { confidenceForLocalIntel, confidenceFromGrounding } from "@/lib/market-intelligence/marketConfidence";
import { buildKdpMarketExplanations } from "@/lib/market-intelligence/marketExplainability";
import { normalizeMarketCopy } from "@/lib/market-intelligence/marketCopyNormalizer";
import { t, tt, useUILanguage, getScriptoraLanguage } from "@/lib/i18n";

type Step = "idea" | "market" | "title" | "packaging" | "predict";

const KDP_PREFILL_KEY = "scriptora-kdp-prefill";

const STEPS: Step[] = ["idea", "market", "title", "packaging", "predict"];
const STEP_KEYS: Record<Step, string> = {
  idea: "kdp_step_idea",
  market: "kdp_step_market",
  title: "kdp_step_title",
  packaging: "kdp_step_packaging",
  predict: "kdp_step_predict",
};

function mapRadarGenre(genre: string): string {
  const map: Record<string, string> = {
    romance: "Romance",
    thriller: "Thriller",
    selfhelp: "Self-help",
  };
  return map[genre] || "Self-help";
}

function copyText(label: string, value: string) {
  if (!value?.trim()) return;
  void navigator.clipboard.writeText(value).then(
    () => toast.success(tt("kdp_toast_copied", { label })),
    () => toast.error(tt("kdp_toast_copy_failed", { label })),
  );
}

/** Inline badge for KDP steps grounded with external market search. */
function GroundingBadge({
  meta,
  itemCount = 0,
  avgScore = 0,
}: {
  meta: { groundingUsed?: boolean; groundingResultsCount?: number; fallbackReason?: string | null };
  itemCount?: number;
  avgScore?: number;
}) {
  const status = statusFromGrounding(meta?.groundingUsed);
  const confidence = confidenceFromGrounding({
    dataStatus: status,
    groundingUsed: meta?.groundingUsed,
    fallbackReason: meta?.fallbackReason,
    itemCount: itemCount || meta?.groundingResultsCount || 0,
    avgScore,
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <MarketDataStatusBadge status={status} />
      {confidence && <MarketConfidenceBadge level={confidence} />}
    </div>
  );
}

export default function KdpLaunchPage() {
  useUILanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("idea");
  const [loading, setLoading] = useState(false);
  const baseGate = useFeatureGate("kdp_market_base");
  const predictGate = useFeatureGate("bestseller_prediction");

  const [idea, setIdea] = useState("");
  const [genre, setGenre] = useState("Self-help");
  const [language, setLanguage] = useState(() => getScriptoraLanguage());

  const [market, setMarket] = useState<MarketAnalysis | null>(null);
  const [titles, setTitles] = useState<TitleVariants | null>(null);
  const [packaging, setPackaging] = useState<KDPPackaging | null>(null);
  const [prediction, setPrediction] = useState<SuccessPrediction | null>(null);
  const [chosenTitle, setChosenTitle] = useState<string>("");
  const [chosenSubtitle, setChosenSubtitle] = useState<string>("");

  const marketPremium = useMemo(() => {
    const content = [idea, market?.recommendedAngle, market?.subNiche].filter(Boolean).join("\n\n");
    if (content.split(/\s+/).filter(Boolean).length < 40) return null;
    return computeMarketPremiumScores({ content, genre, language });
  }, [idea, market?.recommendedAngle, market?.subNiche, genre, language]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KDP_PREFILL_KEY);
      if (!raw) return;
      sessionStorage.removeItem(KDP_PREFILL_KEY);
      const data = JSON.parse(raw) as { idea?: string; genre?: string; keyword?: string };
      const prefillIdea = [data.keyword, data.idea].filter(Boolean).join(" — ");
      if (prefillIdea) setIdea(prefillIdea);
      if (data.genre) setGenre(mapRadarGenre(data.genre));
      toast.info(t("kdp_toast_prefill"));
    } catch {
      // non-blocking
    }
  }, []);

  async function getPlan(): Promise<PlanTier> {
    return await fetchPlan().catch(() => "free");
  }

  const runMarket = baseGate.guard(async () => {
    if (!idea.trim()) return toast.error(t("kdp_toast_need_idea"));
    setLoading(true);
    try {
      const plan = await getPlan();
      const m = await analyzeMarket(idea, { genre, language, plan });
      setMarket(m);
      setStep("market");
    } catch (e: any) {
      toast.error(e?.message || t("kdp_toast_analysis_failed"));
    } finally { setLoading(false); }
  });

  const runTitles = baseGate.guard(async () => {
    setLoading(true);
    try {
      const plan = await getPlan();
      const titleResult = await generateTitleVariants(market?.recommendedAngle || idea, {
        genre,
        language,
        plan,
        subNiche: market?.subNiche,
        recommendedAngle: market?.recommendedAngle,
      });
      setTitles(titleResult);
      const top = titleResult.topPicks?.[0];
      if (top) { setChosenTitle(top.title); setChosenSubtitle(top.subtitle); }
      setStep("title");
    } catch (e: any) {
      toast.error(e?.message || t("kdp_toast_titles_failed"));
    } finally { setLoading(false); }
  });

  const runPackaging = baseGate.guard(async () => {
    if (!chosenTitle) return toast.error(t("kdp_toast_pick_title"));
    setLoading(true);
    try {
      const plan = await getPlan();
      const p = await kdpPackaging(
        { title: chosenTitle, subtitle: chosenSubtitle, promise: market?.recommendedAngle, genre, language },
        plan,
      );
      setPackaging(p);
      setStep("packaging");
    } catch (e: any) {
      toast.error(e?.message || t("kdp_toast_packaging_failed"));
    } finally { setLoading(false); }
  });

  const runPredict = predictGate.guard(async () => {
    setLoading(true);
    try {
      const plan = await getPlan();
      const pr = await predictSuccess(
        { title: chosenTitle, subtitle: chosenSubtitle, promise: market?.recommendedAngle, genre, language },
        plan,
      );
      setPrediction(pr);
      setStep("predict");
    } catch (e: any) {
      toast.error(e?.message || t("kdp_toast_predict_failed"));
    } finally { setLoading(false); }
  });

  return (
    <div className="scriptora-feature-page bg-background">
      <main className="scriptora-feature-scroll mx-auto max-w-3xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Rocket className="h-6 w-6 text-primary" /> KDP Launch
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("kdp_launch_subtitle")}
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate(-1)}>← {t("back")}</Button>
        </header>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full border ${step === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                {i + 1}. {t(STEP_KEYS[s])}
              </span>
              {i < 4 && <ArrowRight className="h-3 w-3" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {t("kdp_your_idea")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("kdp_genre")}</Label>
                <Input value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="Self-help, Romance…" />
              </div>
              <div>
                <Label>{t("kdp_language")}</Label>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Italian" />
              </div>
            </div>
            <div>
              <Label>{t("kdp_idea_promise")}</Label>
              <Textarea
                rows={3}
                placeholder={t("kdp_idea_placeholder")}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={runMarket} disabled={loading || !idea.trim()}>
                {loading && step === "idea" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                {t("kdp_analyze_market")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {market && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> {t("kdp_market")}</span>
                <div className="flex gap-2">
                  <KdpScoreBadge kind="profitability" score={market.profitabilityScore} />
                  <Badge variant="outline">{tt("kdp_niche_score", { score: market.nicheScore.toFixed(1) })}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">{t("kdp_demand")}</span> <Badge variant="secondary">{market.demandLevel}</Badge></div>
                <div><span className="text-muted-foreground">{t("kdp_competition")}</span> <Badge variant="secondary">{market.competitionLevel}</Badge></div>
              </div>
              {market.subNiche && <p><span className="text-muted-foreground">{t("kdp_sub_niche")}</span> <strong>{market.subNiche}</strong></p>}
              <p className="leading-relaxed"><span className="text-muted-foreground">{t("kdp_recommended_angle")}</span><br />{normalizeMarketCopy(market.recommendedAngle)}</p>
              {market.reasoning && <p className="text-xs text-muted-foreground italic">{normalizeMarketCopy(market.reasoning)}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <GroundingBadge meta={market} avgScore={market.nicheScore} itemCount={1} />
              </div>

              <MarketExplainabilityCard
                sections={buildKdpMarketExplanations({
                  groundingUsed: market.groundingUsed,
                  hasPremium: Boolean(marketPremium),
                })}
              />

              {marketPremium && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide">Market Intelligence Premium</p>
                      <MarketDataStatusBadge status="estimated" />
                      <MarketConfidenceBadge level={confidenceForLocalIntel()} />
                    </div>
                    <span className="text-sm font-black text-primary">{marketPremium.composite}/100</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      ["Hook strength", marketPremium.hookStrength],
                      ["Bingeability", marketPremium.bingeability],
                      ["Emotional momentum", marketPremium.emotionalMomentum],
                      ["Genre alignment", marketPremium.genreAlignment],
                      ...(marketPremium.bookTokPotential != null ? [["BookTok potential", marketPremium.bookTokPotential]] : []),
                    ].map(([label, score]) => (
                      <div key={label} className="rounded-lg bg-background/80 border border-border/50 px-2.5 py-2">
                        <p className="text-muted-foreground">{label}</p>
                        <p className="font-semibold">{score}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t("kdp_retention_risk")}{" "}
                    <span className={`font-semibold ${marketPremium.readerRetentionRisk === "high" ? "text-rose-500" : marketPremium.readerRetentionRisk === "medium" ? "text-amber-600" : "text-emerald-600"}`}>
                      {marketPremium.readerRetentionRisk}
                    </span>
                    {" · "}
                    {marketPremium.genreAlignmentNote}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={runTitles} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  {t("kdp_generate_titles")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {titles && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> {t("kdp_top_combos")}</span>
                <GroundingBadge meta={titles} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {titles.topPicks.map((p, i) => {
                const selected = chosenTitle === p.title;
                return (
                  <button
                    key={`stable-${i}`}
                    onClick={() => { setChosenTitle(p.title); setChosenSubtitle(p.subtitle); }}
                    className={`w-full text-left p-3 rounded-lg border transition ${selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                  >
                    <div className="font-semibold">{p.title}</div>
                    <div className="text-sm text-muted-foreground">{p.subtitle}</div>
                    <div className="text-xs text-muted-foreground italic mt-1">{p.reason}</div>
                  </button>
                );
              })}
              <Separator />
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  {tt("kdp_all_titles", { titles: titles.titles.length, subtitles: titles.subtitles.length })}
                </summary>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <ul className="space-y-1">{titles.titles.map((titleItem, i) => <li key={`stable-${i}`}>• {titleItem}</li>)}</ul>
                  <ul className="space-y-1">{titles.subtitles.map((s, i) => <li key={`stable-${i}`}>• {s}</li>)}</ul>
                </div>
              </details>
              <div className="flex justify-end">
                <Button onClick={runPackaging} disabled={loading || !chosenTitle}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
                  {t("kdp_create_packaging")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {packaging && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("kdp_packaging_amazon")}</span>
                <GroundingBadge meta={packaging} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("kdp_description")}</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText(t("kdp_description"), packaging.amazonDescription)}>
                    {t("copy_label")}
                  </Button>
                </div>
                <Textarea rows={8} readOnly value={packaging.amazonDescription} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t("kdp_backend_keywords")}</Label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText(t("kdp_backend_keywords"), packaging.backendKeywords.join(", "))}>
                      {t("copy_label")}
                    </Button>
                  </div>
                  <ul className="text-xs space-y-1 mt-1">{packaging.backendKeywords.map((k, i) => <li key={`stable-${i}`}>• {k}</li>)}</ul>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t("kdp_categories")}</Label>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText(t("kdp_categories"), packaging.categories.join(" · "))}>
                      {t("copy_label")}
                    </Button>
                  </div>
                  <ul className="text-xs space-y-1 mt-1">{packaging.categories.map((c, i) => <li key={`stable-${i}`}>• {c}</li>)}</ul>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("kdp_bullets")}</Label>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => copyText(t("kdp_bullets"), packaging.bulletPoints.join("\n"))}>
                    {t("copy_all_label")}
                  </Button>
                </div>
                <ul className="text-xs space-y-1 mt-1">{packaging.bulletPoints.map((b, i) => <li key={`stable-${i}`}>• {b}</li>)}</ul>
              </div>
              <div className="flex justify-end">
                <Button onClick={runPredict} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trophy className="h-4 w-4 mr-2" />}
                  {t("kdp_predict_bestseller")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {prediction && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t("kdp_bestseller_prediction")}</span>
                <KdpScoreBadge kind="bestseller" score={prediction.successScore} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-semibold text-primary mb-1">{t("kdp_strengths")}</div>
                  <ul className="space-y-1">{prediction.strengths.map((x, i) => <li key={`stable-${i}`}>✓ {x}</li>)}</ul>
                </div>
                <div>
                  <div className="text-xs font-semibold text-destructive mb-1">{t("kdp_weaknesses")}</div>
                  <ul className="space-y-1">{prediction.weaknesses.map((x, i) => <li key={`stable-${i}`}>✗ {x}</li>)}</ul>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-1">{t("kdp_improvements")}</div>
                  <ul className="space-y-1">{prediction.improvements.map((x, i) => <li key={`stable-${i}`}>→ {x}</li>)}</ul>
                </div>
              </div>
              <Separator />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("idea")}>{t("kdp_new_idea")}</Button>
                <Button onClick={() => navigate("/dashboard")}>{t("kdp_go_write")}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <KdpTitleDomination
          defaults={{
            idea,
            genre,
            language,
            mainProblem: market?.subNiche,
            desiredPromise: market?.recommendedAngle,
          }}
          onUseTitle={(titleValue, subtitleValue) => {
            setChosenTitle(titleValue);
            setChosenSubtitle(subtitleValue);
            if (step === "idea" || step === "market") setStep("title");
          }}
        />
      </main>
    </div>
  );
}
