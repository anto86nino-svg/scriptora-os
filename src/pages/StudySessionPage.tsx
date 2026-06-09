import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Brain, CheckCircle2, FileText, GraduationCap, Loader2, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { analyzeStudyMaterial, readStudyFile, type StudySessionResult } from "@/lib/study-session";
import { generateStudySessionWithAI } from "@/lib/study-ai";

const STORAGE_KEY = "scriptora-study-session-v1";

function saveResult(result: StudySessionResult, rawText: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ result, rawText, updatedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

function loadSaved(): { result: StudySessionResult; rawText: string } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (parsed?.result) return { result: parsed.result, rawText: parsed.rawText || "" };
  } catch {
    /* ignore */
  }
  return null;
}

export default function StudySessionPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saved = useMemo(loadSaved, []);

  const [rawText, setRawText] = useState(saved?.rawText || "");
  const [sourceName, setSourceName] = useState(saved?.result?.sourceName || "testo-incollato.txt");
  const [result, setResult] = useState<StudySessionResult | null>(saved?.result || null);
  const [reading, setReading] = useState(false);
  const [aiMode, setAiMode] = useState<"idle" | "deepseek" | "local">("idle");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  const wordCount = useMemo(() => rawText.trim().split(/\s+/).filter(Boolean).length, [rawText]);
  const canAnalyze = wordCount >= 40 && !reading;

  const analyze = async () => {
    if (!canAnalyze) {
      toast.error("Materiale troppo breve", { description: "Carica o incolla almeno 40 parole." });
      return;
    }

    setReading(true);
    setAiMode("deepseek");

    try {
      const next = await generateStudySessionWithAI({
        text: rawText,
        sourceName,
        language: "Italian",
      });
      setResult(next);
      setQuizAnswers({});
      saveResult(next, rawText);
      toast.success("Sessione Studio AI generata", { description: "DeepSeek ha creato riassunti, parole difficili, flashcard e quiz." });
    } catch (error) {
      console.warn("[StudySession] DeepSeek fallback locale", error);
      const local = analyzeStudyMaterial(rawText, sourceName);
      setResult(local);
      setQuizAnswers({});
      saveResult(local, rawText);
      setAiMode("local");
      toast.warning("AI non disponibile: uso analisi locale", {
        description: error instanceof Error ? error.message.slice(0, 120) : "Fallback locale attivato.",
      });
    } finally {
      setReading(false);
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setReading(true);
    try {
      const text = await readStudyFile(file);
      setRawText(text);
      setSourceName(file.name);
      setAiMode("deepseek");

      try {
        const next = await generateStudySessionWithAI({
          text,
          sourceName: file.name,
          language: "Italian",
        });
        setResult(next);
        setQuizAnswers({});
        saveResult(next, text);
        toast.success("Materiale analizzato con AI", { description: file.name });
      } catch (error) {
        console.warn("[StudySession] DeepSeek file fallback locale", error);
        const local = analyzeStudyMaterial(text, file.name);
        setResult(local);
        setQuizAnswers({});
        saveResult(local, text);
        setAiMode("local");
        toast.warning("AI non disponibile: analisi locale attivata", {
          description: error instanceof Error ? error.message.slice(0, 120) : file.name,
        });
      }
    } catch (error) {
      toast.error("File non leggibile", { description: error instanceof Error ? error.message : "Formato non supportato." });
    } finally {
      setReading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="scriptora-ios-screen scriptora-app-surface min-h-screen px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Torna alla dashboard
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200/80">Scriptora Study OS</p>
                <h1 className="text-2xl font-semibold text-foreground">Sessione Studio</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Carica dispense, capitoli o manoscritti. Scriptora li trasforma in riassunti, parole difficili, flashcard e quiz finale.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ios-toolbar-button h-11 justify-center px-4 text-sm font-semibold text-emerald-100"
          >
            {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Carica file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
        </header>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Materiale da studiare</h2>
                <p className="text-xs text-muted-foreground">TXT, Markdown e DOCX già attivi. PDF in arrivo.</p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-muted-foreground">
                {wordCount.toLocaleString()} parole
              </span>
            </div>

            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Incolla qui capitoli, appunti, dispense o una parte del libro..."
              className="min-h-[420px] w-full resize-y rounded-2xl border border-white/10 bg-background/70 p-4 text-sm leading-6 text-foreground outline-none focus:border-emerald-300/40"
            />

            <button
              type="button"
              onClick={analyze}
              disabled={!canAnalyze}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {reading ? "DeepSeek sta preparando la sessione..." : "Genera Sessione Studio"}
            </button>
          </section>

          <section className="space-y-4">
            {!result ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
                <Brain className="mb-4 h-10 w-10 text-emerald-200/70" />
                <h2 className="text-lg font-semibold">Nessuna sessione generata</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Carica un file o incolla un testo. Scriptora preparerà tre livelli di riassunto, parole difficili, flashcard e quiz.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">Analisi</p>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-100">
                      Motore: {aiMode === "local" ? "Locale fallback" : "DeepSeek AI"}
                    </span>
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{result.title}</h2>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <MiniStat icon={<FileText className="h-4 w-4" />} label="Parole" value={result.words.toLocaleString()} />
                    <MiniStat icon={<BookOpen className="h-4 w-4" />} label="Tema" value={result.detectedSubject || "Studio"} />
                    <MiniStat icon={<CheckCircle2 className="h-4 w-4" />} label="Livello" value={result.difficulty.toUpperCase()} />
                  </div>
                </div>

                <StudyBlock title="Riassunto leggero" text={result.lightSummary} />
                <StudyBlock title="Riassunto medio" text={result.mediumSummary} />
                <StudyBlock title="Riassunto Pro" text={result.proSummary} />
                <StudyBlock title="Scheda Studio Pro" text={result.studyNotesPro} />

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
                  <h3 className="font-semibold">Domande aperte da interrogazione</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Usa queste domande per allenare esposizione orale, esame o verifica scritta.
                  </p>
                  <div className="mt-3 space-y-3">
                    {result.openQuestions.map((item, index) => (
                      <details key={index} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                        <summary className="cursor-pointer text-sm font-semibold leading-6">
                          {index + 1}. {item.question}
                        </summary>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.answerGuide}</p>
                      </details>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
                  <h3 className="font-semibold">Parole difficili spiegate</h3>
                  <div className="mt-3 space-y-3">
                    {result.difficultWords.map((item) => (
                      <div key={item.word} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                        <p className="font-semibold text-emerald-100">{item.word}</p>
                        <p className="mt-1 text-sm text-foreground/85">{item.simple}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.technical}</p>
                        <p className="mt-1 text-xs italic text-emerald-100/75">{item.example}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
                  <h3 className="font-semibold">Flashcard</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {result.flashcards.map((card, index) => (
                      <div key={index} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                        <p className="text-sm font-semibold">{card.front}</p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{card.back}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold">Quiz finale interattivo</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Rispondi alle domande, controlla gli errori e usa la spiegazione per ripassare.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-background/50 px-4 py-2 text-sm">
                      <span className="text-muted-foreground">Voto: </span>
                      <span className="font-bold text-emerald-200">
                        {Object.keys(quizAnswers).length === result.quiz.length
                          ? `${Math.round((result.quiz.filter((q, i) => quizAnswers[i] === q.answer).length / Math.max(1, result.quiz.length)) * 100)}/100`
                          : `${Object.keys(quizAnswers).length}/${result.quiz.length}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {result.quiz.map((q, index) => {
                      const selected = quizAnswers[index];
                      const answered = selected !== undefined;
                      const correct = answered && selected === q.answer;

                      return (
                        <div key={index} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold leading-6">
                              {index + 1}. {q.question}
                            </p>
                            {answered && (
                              <span className={correct ? "rounded-full bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-200" : "rounded-full bg-rose-400/10 px-2 py-1 text-[11px] font-semibold text-rose-200"}>
                                {correct ? "Corretta" : "Da ripassare"}
                              </span>
                            )}
                          </div>

                          <div className="mt-3 grid gap-2">
                            {q.options.map((option, optionIndex) => {
                              const isSelected = selected === optionIndex;
                              const isCorrect = q.answer === optionIndex;
                              const showCorrect = answered && isCorrect;
                              const showWrong = answered && isSelected && !isCorrect;

                              return (
                                <button
                                  key={optionIndex}
                                  type="button"
                                  onClick={() => setQuizAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                                  className={[
                                    "rounded-2xl border px-3 py-2 text-left text-sm leading-5 transition",
                                    showCorrect
                                      ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                                      : showWrong
                                        ? "border-rose-300/40 bg-rose-400/10 text-rose-100"
                                        : isSelected
                                          ? "border-white/25 bg-white/10 text-foreground"
                                          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                                  ].join(" ")}
                                >
                                  <span className="mr-2 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                                  {option}
                                </button>
                              );
                            })}
                          </div>

                          {answered && (
                            <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/80">Spiegazione</p>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {result.quiz.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuizAnswers({})}
                      className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Rifai il quiz
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/45 p-3">
      <div className="mb-2 text-emerald-200">{icon}</div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function StudyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
      <h3 className="font-semibold">{title}</h3>
      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-foreground/85">{text}</pre>
    </div>
  );
}
