import { useState, useRef, useCallback } from "react";
import { BookProject, SectionId } from "@/types/book";
import { Sparkles, Loader2, Heart, Lightbulb, LayoutList, X, PenLine, Check, AlertTriangle, ArrowUpCircle, RotateCcw, History, ChevronDown, ChevronUp, Zap, MessageCircle, Wand2 } from "lucide-react";
import { fetchSupabaseFunction, parseEdgeFunctionErrorBody } from "@/lib/supabase-function-auth";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { LiveCoachTab } from "@/components/LiveCoachTab";

interface AICoachPanelProps {
  project: BookProject;
  activeSection: SectionId | null;
  onClose: () => void;
  onApplyRewrite?: (chapterIndex: number, subIndex: number | null, text: string) => void;
}

interface PassResult {
  scoreBefore: number;
  scoreAfter: number;
  heartScore: number;
  issues: string[];
  fixesApplied: string[];
  text: string;
}

interface MultiPassResult {
  finalScore: number;
  finalHeartScore: number;
  passes: PassResult[];
  finalText: string;
  improvementSummary: string;
  originalText: string;
}

const UI_LANG_MAP: Record<string, string> = {
  en: "English", it: "Italian", es: "Spanish", fr: "French", de: "German",
};

export function AICoachPanel({ project, activeSection, onClose, onApplyRewrite }: AICoachPanelProps) {
  const [tab, setTab] = useState<"live" | "deep">("live");
  const [result, setResult] = useState<MultiPassResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [threshold, setThreshold] = useState(4.5);
  const [maxPasses, setMaxPasses] = useState(3);
  const [autoApply, setAutoApply] = useState(false);
  const [currentPass, setCurrentPass] = useState(0);
  const [expandedPass, setExpandedPass] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const abortRef = useRef(false);

  const getActiveContent = useCallback((): { title: string; content: string; chapterIdx: number; subIdx: number | null } | null => {
    if (!activeSection) return null;
    const chMatch = activeSection.match(/^chapter-(\d+)$/);
    if (chMatch) {
      const idx = parseInt(chMatch[1]);
      const ch = project.chapters[idx];
      if (ch?.content) return { title: ch.title, content: ch.content, chapterIdx: idx, subIdx: null };
    }
    const subMatch = activeSection.match(/^chapter-(\d+)-sub-(\d+)$/);
    if (subMatch) {
      const ci = parseInt(subMatch[1]);
      const si = parseInt(subMatch[2]);
      const sub = project.chapters[ci]?.subchapters?.[si];
      if (sub?.content) return { title: sub.title, content: sub.content, chapterIdx: ci, subIdx: si };
    }
    return null;
  }, [activeSection, project]);

  const callCoachAI = async (text: string, title: string, passNumber: number): Promise<{ score: number; heartScore: number; issues: string[]; fixesApplied: string[]; improvedText: string; summary: string }> => {
    // Use BOOK language for coach responses, not UI language
    const bookLang = project.config.language;
    const res = await fetchSupabaseFunction("generate-book", {
      method: "POST",
      json: {
        systemPrompt: `You are an elite editorial AI and bestseller writing coach performing pass #${passNumber}.
You MUST: 1) Score the text (craft quality) 2) Give a Heart Score (emotional impact) 3) List specific issues 4) Rewrite the FULL text at a higher level 5) List fixes applied.

LANGUAGE RULE: Respond ENTIRELY in ${bookLang}. Every word of your response, issues, fixes, summary, and the rewritten text MUST be in ${bookLang}. No exceptions.

REWRITE RULES:
- KEEP original meaning, UPGRADE everything else
- VARY sentence structure for rhythm
- ADD sensory detail, REMOVE generic phrases
- Each pass must make REAL improvements — no superficial changes
- Genre: ${project.config.genre} — adapt style accordingly
- Include 2-3 highlight-worthy sentences that readers would screenshot

Respond ONLY with valid JSON.`,
        userPrompt: `Pass #${passNumber} — Analyze and rewrite this chapter.

Title: "${title}"
Genre: ${project.config.genre} | Tone: ${project.config.tone} | Style: ${project.config.authorStyle}
Language: ${bookLang} — ALL output MUST be in ${bookLang}

Text (first 3000 chars):
${text.substring(0, 3000)}

Return this exact JSON (ALL values in ${bookLang}):
{
  "score": <1-5, use decimals like 3.5>,
  "heartScore": <1-5, emotional impact score>,
  "issues": ["issue1", "issue2", ...],
  "fixesApplied": ["fix1", "fix2", ...],
  "improvedText": "<FULL rewritten version in ${bookLang}>",
  "summary": "<what changed and why, in ${bookLang}>"
}

Respond in ${bookLang}. Return ONLY valid JSON.`,
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(parseEdgeFunctionErrorBody(text) || `AI error ${res.status}`);
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    const marker = buffer.lastIndexOf("__RESULT__");
    if (marker === -1) throw new Error("Empty response");
    const data = JSON.parse(buffer.slice(marker + "__RESULT__".length).trim());
    const parsed = JSON.parse((data.content || "{}").replace(/```json\n?|```/g, "").trim());
    return { heartScore: parsed.heartScore || parsed.score, ...parsed };
  };

  const runMultiPass = async () => {
    const content = getActiveContent();
    if (!content) return;
    setLoading(true);
    setApplied(false);
    setResult(null);
    setCurrentPass(0);
    setSelectedVersion(null);
    abortRef.current = false;

    const passes: PassResult[] = [];
    let currentText = content.content;
    const originalText = content.content;
    let lastScore = 0;
    let finalSummary = "";

    try {
      for (let i = 0; i < maxPasses; i++) {
        if (abortRef.current) break;
        setCurrentPass(i + 1);

        const res = await callCoachAI(currentText, content.title, i + 1);
        const scoreBefore = i === 0 ? res.score : lastScore;

        // Re-evaluate the rewritten text to get scoreAfter
        const scoreAfter = Math.min(5, res.score + (i > 0 ? 0.3 : 0)); // approximate improvement

        passes.push({
          scoreBefore,
          scoreAfter: res.score,
          heartScore: res.heartScore || res.score,
          issues: res.issues || [],
          fixesApplied: res.fixesApplied || [],
          text: res.improvedText || currentText,
        });

        currentText = res.improvedText || currentText;
        lastScore = res.score;
        finalSummary = res.summary || "";

        // Update result progressively
        setResult({
          finalScore: lastScore,
          finalHeartScore: res.heartScore || lastScore,
          passes: [...passes],
          finalText: currentText,
          improvementSummary: finalSummary,
          originalText,
        });

        // Stop: threshold reached
        if (lastScore >= threshold) break;

        // Stop: improvement < 0.1 (no meaningful gain)
        if (i > 0) {
          const delta = passes[i].scoreAfter - passes[i - 1].scoreAfter;
          if (delta < 0.1) break;
        }
      }

      // Auto-apply if enabled
      if (autoApply && onApplyRewrite && currentText !== originalText) {
        onApplyRewrite(content.chapterIdx, content.subIdx, currentText);
        setApplied(true);
      }
    } catch (e: any) {
      console.error("AI Coach multi-pass error:", e);
    } finally {
      setLoading(false);
      setCurrentPass(0);
    }
  };

  const handleApplyVersion = (passIndex: number) => {
    const content = getActiveContent();
    if (!content || !result || !onApplyRewrite) return;
    const text = passIndex === -1 ? result.originalText : result.passes[passIndex].text;
    onApplyRewrite(content.chapterIdx, content.subIdx, text);
    setApplied(true);
    setSelectedVersion(passIndex);
  };

  const activeContent = getActiveContent();
  const progressPercent = loading ? (currentPass / maxPasses) * 100 : result ? 100 : 0;

  return (
    <div className="w-80 border-l border-border bg-card/50 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="h-10 border-b border-border/50 flex items-center justify-between px-3">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">{t("ai_coach")}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/40 bg-card/30 shrink-0">
        <button
          onClick={() => setTab("live")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
            tab === "live" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="h-3 w-3" /> Live
        </button>
        <button
          onClick={() => setTab("deep")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium transition-colors ${
            tab === "deep" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Wand2 className="h-3 w-3" /> Multi-pass
        </button>
      </div>

      {tab === "live" ? (
        <LiveCoachTab project={project} activeSection={activeSection} />
      ) : (
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
        {!activeContent ? (
          <p className="text-xs text-muted-foreground/50 text-center py-8">{t("select_chapter_to_analyze")}</p>
        ) : (
          <>
            {/* Controls */}
            <div className="space-y-3 p-3 rounded-xl bg-muted/10 border border-border/30">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("quality_threshold")}</span>
                  <span className="text-xs font-bold text-primary">{threshold}/5</span>
                </div>
                <Slider value={[threshold]} onValueChange={([v]) => setThreshold(v)} min={3} max={5} step={0.5} className="w-full" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("max_passes")}</span>
                <div className="flex items-center gap-1">
                  {[3, 4, 5].map(n => (
                    <button key={n} onClick={() => setMaxPasses(n)}
                      className={`w-6 h-6 rounded text-[10px] font-bold transition-colors ${maxPasses === n ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("auto_apply")}</span>
                <Switch checked={autoApply} onCheckedChange={setAutoApply} />
              </div>
            </div>

            {/* Run Button */}
            <button onClick={runMultiPass} disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors">
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("pass")} {currentPass}/{maxPasses}
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  {t("run_multi_pass")}
                </>
              )}
            </button>

            {/* Progress */}
            {(loading || result) && (
              <div className="space-y-1">
                <Progress value={progressPercent} className="h-1.5" />
                {loading && <p className="text-[10px] text-muted-foreground text-center">{t("processing_pass")} {currentPass}...</p>}
              </div>
            )}

            {/* Results */}
            {result && (
              <>
                {/* Scores */}
                <div className="p-3 rounded-xl bg-muted/15 border border-border/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("final_score")}</span>
                    </div>
                    <span className={`text-sm font-black ${result.finalScore >= threshold ? "text-primary" : "text-[hsl(var(--warning))]"}`}>
                      {result.finalScore}/5
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Heart Score</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Heart key={`stable-${i}`} className={`h-3.5 w-3.5 ${i < Math.round(result.finalHeartScore) ? "text-destructive fill-destructive" : "text-muted-foreground/20"}`} />
                      ))}
                      <span className="text-[10px] font-bold text-muted-foreground ml-1">{result.finalHeartScore}/5</span>
                    </div>
                  </div>
                  {result.finalScore >= threshold && (
                    <p className="text-[10px] text-primary font-medium">✓ {t("threshold_reached")}</p>
                  )}
                </div>

                {/* Improvement Summary */}
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("improvement_summary")}</span>
                  </div>
                  <p className="text-xs text-foreground/70 leading-relaxed">{result.improvementSummary}</p>
                </div>

                {/* Pass History */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 px-1">
                    <History className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{t("version_history")}</span>
                  </div>

                  {/* Original version */}
                  <VersionRow
                    label={t("original")}
                    score={result.passes[0]?.scoreBefore || 0}
                    isSelected={selectedVersion === -1}
                    onSelect={() => handleApplyVersion(-1)}
                    isApplied={applied && selectedVersion === -1}
                  />

                  {result.passes.map((pass, i) => (
                    <div key={`stable-${i}`}>
                      <VersionRow
                        label={`${t("pass")} ${i + 1}`}
                        score={pass.scoreAfter}
                        isSelected={selectedVersion === i}
                        onSelect={() => handleApplyVersion(i)}
                        isApplied={applied && selectedVersion === i}
                        isFinal={i === result.passes.length - 1}
                      />
                      <button onClick={() => setExpandedPass(expandedPass === i ? null : i)}
                        className="w-full flex items-center gap-1 px-2 py-0.5 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                        {expandedPass === i ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                        {t("details")}
                      </button>
                      {expandedPass === i && (
                        <div className="mx-1 p-2 rounded-lg bg-muted/5 border border-border/20 space-y-1.5 text-[10px]">
                          {pass.issues.length > 0 && (
                            <div>
                              <span className="font-semibold text-destructive/70">{t("issues_found")}:</span>
                              <ul className="list-disc list-inside text-foreground/60 mt-0.5">
                                {pass.issues.map((issue, j) => <li key={j}>{issue}</li>)}
                              </ul>
                            </div>
                          )}
                          {pass.fixesApplied.length > 0 && (
                            <div>
                              <span className="font-semibold text-primary/70">{t("fixes_applied")}:</span>
                              <ul className="list-disc list-inside text-foreground/60 mt-0.5">
                                {pass.fixesApplied.map((fix, j) => <li key={j}>{fix}</li>)}
                              </ul>
                            </div>
                          )}
                          <div className="max-h-32 overflow-y-auto mt-1 p-1.5 rounded bg-accent/5 border border-accent/10">
                            <p className="text-foreground/60 whitespace-pre-line leading-relaxed">{pass.text.substring(0, 500)}{pass.text.length > 500 ? "…" : ""}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Final text preview */}
                <div className="p-3 rounded-xl bg-accent/10 border border-accent/30 max-h-48 overflow-y-auto">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{t("final_version")}</span>
                  <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-line">{result.finalText.substring(0, 800)}{result.finalText.length > 800 ? "…" : ""}</p>
                </div>

                {/* Apply final */}
                {onApplyRewrite && !applied && (
                  <button onClick={() => handleApplyVersion(result.passes.length - 1)}
                    className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">
                    <PenLine className="h-3.5 w-3.5" />
                    {t("apply_final_version")}
                  </button>
                )}
                {applied && (
                  <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-primary font-medium">
                    <Check className="h-3.5 w-3.5" /> {t("applied")}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      )}
    </div>
  );
}

function VersionRow({ label, score, isSelected, onSelect, isApplied, isFinal }: {
  label: string; score: number; isSelected: boolean; onSelect: () => void; isApplied: boolean; isFinal?: boolean;
}) {
  return (
    <button onClick={onSelect}
      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
        isSelected ? "bg-primary/15 border border-primary/30" : "bg-muted/5 border border-border/20 hover:bg-muted/15"
      }`}>
      <div className="flex items-center gap-1.5">
        {isApplied ? <Check className="h-3 w-3 text-primary" /> : isFinal ? <Sparkles className="h-3 w-3 text-primary" /> : <RotateCcw className="h-3 w-3 text-muted-foreground/50" />}
        <span className={`font-medium ${isFinal ? "text-primary" : "text-foreground/70"}`}>{label}</span>
      </div>
      <span className="text-[10px] font-bold text-muted-foreground">{score}/5</span>
    </button>
  );
}
