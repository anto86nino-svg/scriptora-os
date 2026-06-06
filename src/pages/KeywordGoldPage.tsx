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

function copyText(value: string, label = "Copiato") {
  navigator.clipboard?.writeText(value).then(
    () => toast.success(label),
    () => toast.error("Copia non riuscita"),
  );
}

export default function KeywordGoldPage() {
  const navigate = useNavigate();
  const gate = useFeatureGate("kdp_market_base");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [genre, setGenre] = useState("Self-help");
  const [language, setLanguage] = useState("Italian");
  const [marketplace, setMarketplace] = useState("amazon.it");
  const [result, setResult] = useState<KeywordGoldResult | null>(null);

  async function getPlan(): Promise<PlanTier> {
    return await fetchPlan().catch(() => "free");
  }

  const run = gate.guard(async () => {
    if (!title.trim()) return toast.error("Inserisci almeno il titolo");
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
      toast.success(out.fallbackReason ? "Analisi base generata" : "Keyword Gold generato");
    } catch (e: any) {
      toast.error(e?.message || "Keyword Gold fallito");
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
              Inserisci titolo e sottotitolo. Scriptora genera keyword KDP, BISAC, categorie e posizionamento usando segnali pubblici di mercato.
            </p>
          </div>
          {result?.groundingUsed ? (
            <Badge variant="outline" className="border-primary/40 text-primary">
              Brave live · {result.groundingResultsCount || 0}
            </Badge>
          ) : (
            <Badge variant="secondary">Analisi base</Badge>
          )}
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Dati libro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Titolo</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. La versione di te che non hai mai smesso di nascondere" />
            </div>

            <div>
              <Label>Sottotitolo</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Es. Un viaggio per ritrovare la parte più vera di te" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>Genere</Label>
                <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
              </div>
              <div>
                <Label>Lingua</Label>
                <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>
              <div>
                <Label>Marketplace</Label>
                <Input value={marketplace} onChange={(e) => setMarketplace(e.target.value)} placeholder="amazon.it" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={run} disabled={loading || !title.trim()} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Genera Keyword Gold
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            {result.fallbackReason && (
              <Card className="border-amber-500/30 bg-amber-500/10">
                <CardContent className="py-3 text-sm text-amber-950 dark:text-amber-100">
                  {result.fallbackReason}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  Backend Keywords KDP
                  <Button size="sm" variant="outline" onClick={() => copyText(backendLine, "Backend keyword copiate")} className="gap-2">
                    <Copy className="h-3.5 w-3.5" /> Copia
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea readOnly rows={3} value={backendLine} />
                <p className="mt-2 text-xs text-muted-foreground">
                  Usa queste come base. Prima di pubblicare, controlla sempre che non ripetano titolo/sottotitolo e che non contengano claim ingannevoli.
                </p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">BISAC consigliate</CardTitle></CardHeader>
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
                <CardHeader><CardTitle className="text-base">Categorie KDP</CardTitle></CardHeader>
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
              <CardHeader><CardTitle className="text-base">Gold Keywords</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                {result.goldKeywords?.map((k, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm">{k.keyword}</strong>
                      <Badge variant={k.competitionRisk === "low" ? "default" : "secondary"}>{k.strength}/100</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Intento: {k.intent} · Rischio: {k.competitionRisk}
                    </div>
                    <p className="text-xs mt-2 leading-relaxed">{k.why}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Posizionamento</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><span className="text-muted-foreground">Pubblico:</span><br />{result.positioning?.mainAudience}</p>
                <p><span className="text-muted-foreground">Promessa commerciale:</span><br />{result.positioning?.commercialPromise}</p>
                <p><span className="text-muted-foreground">Angolo più forte:</span><br />{result.positioning?.strongestAngle}</p>
                <p><span className="text-muted-foreground">Rischio saturazione:</span><br />{result.positioning?.saturationWarning}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Checklist finale</CardTitle></CardHeader>
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
