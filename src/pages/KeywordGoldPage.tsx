import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, KeyRound, Loader2, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { fetchPlan, type PlanTier } from "@/lib/plan";
import { keywordGold, type KeywordGoldResult } from "@/lib/kdp/money-engine";
import { useFeatureGate } from "@/components/PaywallGuard";
import { MarketDataStatusBadge, MarketDataStatusNotice } from "@/components/market-intelligence/MarketDataStatusBadge";
import { statusFromGrounding } from "@/lib/market-intelligence/marketDataStatus";
import { t, tt, useUILanguage, getScriptoraLanguage } from "@/lib/i18n";

function copyText(value: string, successLabel: string) {
  navigator.clipboard?.writeText(value).then(
    () => toast.success(successLabel),
    () => toast.error(t("copy_failed")),
  );
}

export default function KeywordGoldPage() {
  useUILanguage();
  const navigate = useNavigate();
  const gate = useFeatureGate("kdp_market_base");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [genre, setGenre] = useState("Self-help");
  const [language, setLanguage] = useState(() => getScriptoraLanguage());
  const [marketplace, setMarketplace] = useState("amazon.it");
  const [result, setResult] = useState<KeywordGoldResult | null>(null);

  async function getPlan(): Promise<PlanTier> {
    return await fetchPlan().catch(() => "free");
  }

  const run = gate.guard(async () => {
    if (!title.trim()) return toast.error(t("keyword_gold_need_title"));
    setLoading(true);
    setResult(null);

    try {
      const plan = await getPlan();
      const out = await keywordGold(
        {
          title: title.trim(),
          subtitle: subtitle.trim(),
          genre: genre.trim(),
          language: language.trim(),
          marketplace: marketplace.trim(),
        },
        plan,
      );
      setResult(out);
      toast.success(out.fallbackReason ? t("keyword_gold_fallback") : t("keyword_gold_success"));
    } catch (e: any) {
      toast.error(e?.message || t("keyword_gold_failed"));
    } finally {
      setLoading(false);
    }
  });

  const backendLine = result?.backendKeywords?.join("; ") || "";

  return (
    <div className="scriptora-feature-page bg-background">
      <main className="scriptora-feature-scroll mx-auto max-w-4xl space-y-6 p-6">
        <header className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-3 gap-2">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Button>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <KeyRound className="h-7 w-7 text-primary" />
              Keyword Gold
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {t("keyword_gold_subtitle")}
            </p>
          </div>
          {result ? (
            <MarketDataStatusBadge status={statusFromGrounding(result.groundingUsed)} />
          ) : null}
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("keyword_gold_book_data")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("keyword_gold_field_title")}</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("keyword_gold_title_ph")} />
            </div>

            <div>
              <Label>{t("keyword_gold_subtitle_label")}</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={t("keyword_gold_subtitle_ph")} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>{t("kdp_genre")}</Label>
                <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
              </div>
              <div>
                <Label>{t("kdp_language")}</Label>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>
              <div>
                <Label>{t("keyword_gold_marketplace")}</Label>
                <Input value={marketplace} onChange={(e) => setMarketplace(e.target.value)} placeholder="amazon.it" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={run} disabled={loading || !title.trim()} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t("keyword_gold_generate")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            {result.fallbackReason && (
              <MarketDataStatusNotice status="estimated" extra={result.fallbackReason} />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  {t("keyword_gold_backend_title")}
                  <Button size="sm" variant="outline" onClick={() => copyText(backendLine, t("keyword_gold_backend_copied"))} className="gap-2">
                    <Copy className="h-3.5 w-3.5" /> {t("copy_label")}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea readOnly rows={3} value={backendLine} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("keyword_gold_backend_hint")}
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">{t("keyword_gold_bisac")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {result.bisacCategories?.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="font-semibold text-sm">{c.path}</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.reason}</div>
                      <Badge variant="secondary" className="mt-2">{Math.round(c.confidence)}%</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">{t("keyword_gold_categories")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {result.kdpBrowseCategories?.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border p-3">
                      <div className="font-semibold text-sm">{c.path}</div>
                      <div className="text-xs text-muted-foreground mt-1">{c.reason}</div>
                      <Badge variant="secondary" className="mt-2">{Math.round(c.confidence)}%</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">{t("keyword_gold_gold_keywords")}</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                {result.goldKeywords?.map((k, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm">{k.keyword}</strong>
                      <Badge variant={k.competitionRisk === "low" ? "default" : "secondary"}>{k.strength}/100</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tt("keyword_gold_intent_risk", { intent: k.intent, risk: k.competitionRisk })}
                    </div>
                    <p className="text-xs mt-2 leading-relaxed">{k.why}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t("keyword_gold_positioning")}</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><span className="text-muted-foreground">{t("keyword_gold_audience")}</span><br />{result.positioning?.mainAudience}</p>
                <p><span className="text-muted-foreground">{t("keyword_gold_promise")}</span><br />{result.positioning?.commercialPromise}</p>
                <p><span className="text-muted-foreground">{t("keyword_gold_angle")}</span><br />{result.positioning?.strongestAngle}</p>
                <p><span className="text-muted-foreground">{t("keyword_gold_saturation")}</span><br />{result.positioning?.saturationWarning}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t("keyword_gold_checklist")}</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  {result.finalChecklist?.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
