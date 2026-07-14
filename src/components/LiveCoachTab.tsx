import { useState, useRef, useEffect, useCallback } from "react";
import { BookProject, SectionId } from "@/types/book";
import { Sparkles, Send, Loader2, MessageCircle, Heart, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId } from "@/services/storageService";

interface LiveCoachTabProps {
  project: BookProject;
  activeSection: SectionId | null;
}

interface Bubble {
  id: string;
  emoji: string;
  message: string;
  ts: number;
  kind: "live" | "user" | "assistant";
}

// Detect new text appended at the end (the most common writing pattern)
function detectNewText(prev: string, current: string): string | null {
  if (!current || current.length <= prev.length) return null;
  // Only fire if user added a meaningful chunk (>40 chars) and ended a sentence
  const added = current.slice(prev.length);
  if (added.length < 40) return null;
  if (!/[.!?\n][\s"'»"]*$/.test(added)) return null;
  return added.trim();
}

function getActiveContent(project: BookProject, activeSection: SectionId | null) {
  if (!activeSection) return null;
  const chMatch = activeSection.match(/^chapter-(\d+)$/);
  if (chMatch) {
    const idx = parseInt(chMatch[1]);
    const ch = project.chapters[idx];
    if (ch) return { title: ch.title, content: ch.content || "" };
  }
  const subMatch = activeSection.match(/^chapter-(\d+)-sub-(\d+)$/);
  if (subMatch) {
    const ci = parseInt(subMatch[1]);
    const si = parseInt(subMatch[2]);
    const sub = project.chapters[ci]?.subchapters?.[si];
    if (sub) return { title: sub.title, content: sub.content || "" };
  }
  return null;
}

export function LiveCoachTab({ project, activeSection }: LiveCoachTabProps) {
  const [enabled, setEnabled] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const lastSeenRef = useRef<string>("");
  const lastFiredAtRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const pendingTimerRef = useRef<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const active = getActiveContent(project, activeSection);
  const activeContent = active?.content || "";
  const activeTitle = active?.title || "";

  // Reset baseline when switching section
  useEffect(() => {
    lastSeenRef.current = activeContent;
    lastFiredAtRef.current = 0;
    lastActivityRef.current = Date.now();
  }, [activeSection]);

  const fireLiveComment = useCallback(async (recentText: string) => {
    if (!active) return;
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("live-coach", {
        body: {
          mode: "live",
          language: project.config.language,
          genre: project.config.genre,
          tone: project.config.tone,
          recentText,
          fullChapter: activeContent,
          chapterTitle: activeTitle,
          projectId: project.id,
          userId: getCurrentUserId(),
        },
      });
      if (error) throw error;
      if (data?.error === "rate_limited") {
        toast.error("Coach: troppi messaggi, aspetta un attimo");
        return;
      }
      if (data?.error === "credits_exhausted") {
        toast.error("Coach: crediti AI esauriti");
        return;
      }
      if (data?.message) {
        setBubbles((prev) => [
          ...prev.slice(-30),
          { id: crypto.randomUUID(), emoji: data.emoji || "💡", message: data.message, ts: Date.now(), kind: "live" },
        ]);
      }
    } catch (e) {
      console.error("live coach error", e);
    } finally {
      setThinking(false);
    }
  }, [active, activeContent, activeTitle, project.config]);

  // Spontaneous message (jokes, curiosities, motivation, news, questions)
  const fireSpontaneous = useCallback(async () => {
    setThinking(true);
    try {
      const kinds = ["joke", "curiosity", "motivation", "question", "news"];
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      const { data, error } = await supabase.functions.invoke("live-coach", {
        body: {
          mode: "spontaneous",
          spontaneousKind: kind,
          language: project.config.language,
          genre: project.config.genre,
          tone: project.config.tone,
          chapterTitle: activeTitle,
          bookTitle: project.config.title,
          projectId: project.id,
          userId: getCurrentUserId(),
        },
      });
      if (error) throw error;
      if (data?.error) return;
      if (data?.message) {
        setBubbles((prev) => [
          ...prev.slice(-30),
          { id: crypto.randomUUID(), emoji: data.emoji || "✨", message: data.message, ts: Date.now(), kind: "live" },
        ]);
      }
    } catch (e) {
      console.error("spontaneous coach error", e);
    } finally {
      setThinking(false);
    }
  }, [project.config, activeTitle]);

  // Watch content changes and fire after a short pause
  useEffect(() => {
    if (!enabled || !active) return;
    const newText = detectNewText(lastSeenRef.current, activeContent);
    if (!newText) return;
    lastActivityRef.current = Date.now();
    const now = Date.now();
    if (now - lastFiredAtRef.current < 12_000) return;

    if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = window.setTimeout(() => {
      lastSeenRef.current = activeContent;
      lastFiredAtRef.current = Date.now();
      fireLiveComment(newText);
    }, 1500);

    return () => {
      if (pendingTimerRef.current) window.clearTimeout(pendingTimerRef.current);
    };
  }, [activeContent, enabled, active, fireLiveComment]);

  // Auto-scroll
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [bubbles, thinking]);

  const sendChat = async () => {
    const q = input.trim();
    if (!q || chatLoading) return;
    setInput("");
    lastActivityRef.current = Date.now();
    setBubbles((prev) => [...prev, { id: crypto.randomUUID(), emoji: "🧑", message: q, ts: Date.now(), kind: "user" }]);
    setChatLoading(true);
    try {
      const history = bubbles
        .filter((b) => b.kind === "user" || b.kind === "assistant")
        .slice(-6)
        .map((b) => ({ role: b.kind as "user" | "assistant", content: b.message }));
      const { data, error } = await supabase.functions.invoke("live-coach", {
        body: {
          mode: "chat",
          language: project.config.language,
          genre: project.config.genre,
          tone: project.config.tone,
          question: `Contesto capitolo "${activeTitle}":\n${activeContent.substring(0, 2000)}\n\nDomanda autore: ${q}`,
          history,
          projectId: project.id,
          userId: getCurrentUserId(),
        },
      });
      if (error) throw error;
      if (data?.error === "rate_limited") {
        toast.error("Coach: troppi messaggi");
        return;
      }
      if (data?.error === "credits_exhausted") {
        toast.error("Coach: crediti esauriti");
        return;
      }
      setBubbles((prev) => [
        ...prev,
        { id: crypto.randomUUID(), emoji: "✨", message: data.message || "...", ts: Date.now(), kind: "assistant" },
      ]);
    } catch (e) {
      console.error("chat error", e);
      toast.error("Coach offline al momento");
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 border-b border-border/40 px-3 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">Coach AI</p>
            <p className="text-[10px] text-muted-foreground">Feedback su richiesta — niente ascolto automatico</p>
          </div>
        </div>
      </div>

      {/* Toggle live */}
      <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${enabled ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            {enabled ? "Ascolto attivo" : "Ascolto manuale"}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fireSpontaneous}
            disabled={thinking || chatLoading}
            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-accent/20 text-accent-foreground hover:bg-accent/30 disabled:opacity-40 transition-colors"
            title="Chiedi uno spunto al coach"
          >
            Spunto
          </button>
          <button
            onClick={() => setEnabled((v) => !v)}
            className="text-[10px] font-medium text-primary hover:underline"
          >
            {enabled ? "Pausa" : "Attiva ascolto"}
          </button>
        </div>
      </div>

      {/* Bubbles */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {!active ? (
          <div className="text-center py-8 space-y-2">
            <Heart className="h-6 w-6 text-muted-foreground/30 mx-auto" />
            <p className="text-xs text-muted-foreground/60">Apri un capitolo e richiama il coach quando ti serve.</p>
          </div>
        ) : bubbles.length === 0 && !thinking ? (
          <div className="text-center py-8 space-y-2">
            <Sparkles className="h-6 w-6 text-primary/40 mx-auto" />
            <p className="text-xs text-muted-foreground/70">
              Scrivi una domanda oppure attiva l'ascolto quando vuoi un feedback live.
            </p>
            <p className="text-[10px] text-muted-foreground/50">Resto in silenzio finche non mi richiami.</p>
          </div>
        ) : (
          <>
            {bubbles.map((b) => (
              <BubbleRow key={b.id} bubble={b} />
            ))}
            {thinking && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-muted-foreground/70">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="italic">Sto leggendo quello che hai scritto...</span>
              </div>
            )}
            {chatLoading && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-muted-foreground/70">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="italic">Ci penso...</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat input */}
      <div className="border-t border-border/30 p-2 bg-card/40">
        <div className="flex items-end gap-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
            placeholder="Chiedi al coach..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border/40 bg-background/60 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 max-h-24"
          />
          <button
            onClick={sendChat}
            disabled={!input.trim() || chatLoading}
            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
            title="Invia"
          >
            {chatLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </button>
        </div>
        <p className="text-[9px] text-muted-foreground/50 mt-1 px-1">
          <MessageCircle className="h-2.5 w-2.5 inline mr-0.5" />
          Enter per inviare, Shift+Enter per andare a capo
        </p>
      </div>
    </div>
  );
}

function BubbleRow({ bubble }: { bubble: Bubble }) {
  if (bubble.kind === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/15 border border-primary/25 px-3 py-1.5 text-xs text-foreground">
          {bubble.message}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-sm leading-none mt-0.5 shrink-0">{bubble.emoji}</span>
      <div
        className={`max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-1.5 text-xs leading-relaxed ${
          bubble.kind === "live"
            ? "bg-muted/30 text-foreground/90 border border-border/30"
            : "bg-accent/15 text-foreground border border-accent/25"
        }`}
      >
        {bubble.message}
      </div>
    </div>
  );
}
