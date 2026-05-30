import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Download,
  FilePlus2,
  NotebookPen,
  Pin,
  PinOff,
  Save,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  countNoteWords,
  createScriptoraNote,
  getNotePreview,
  loadScriptoraNotes,
  saveScriptoraNotes,
  sortScriptoraNotes,
  type ScriptoraNote,
  type ScriptoraNoteTextColor,
} from "@/lib/notepad";

interface NotepadDialogProps {
  open: boolean;
  ownerId?: string | null;
  onClose: () => void;
}

const NOTE_TEXT_COLORS: Array<{ id: ScriptoraNoteTextColor; label: string; hex: string }> = [
  { id: "black", label: "Nero", hex: "#111827" },
  { id: "red", label: "Rosso", hex: "#dc2626" },
  { id: "green", label: "Verde", hex: "#15803d" },
  { id: "blue", label: "Blu", hex: "#1d4ed8" },
  { id: "violet", label: "Viola", hex: "#7c3aed" },
  { id: "amber", label: "Ambra", hex: "#b45309" },
];

function formatNoteDate(value: string): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function NotepadDialog({ open, ownerId, onClose }: NotepadDialogProps) {
  const [notes, setNotes] = useState<ScriptoraNote[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [savedAt, setSavedAt] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    const loaded = loadScriptoraNotes(ownerId);
    const initialNotes = loaded.length > 0 ? loaded : [
      createScriptoraNote({
        title: "Idee libro",
        content: "",
        pinned: true,
      }),
    ];

    if (loaded.length === 0) saveScriptoraNotes(initialNotes, ownerId);
    setNotes(initialNotes);
    setActiveId(initialNotes[0]?.id || "");
    setSavedAt(new Date().toISOString());
  }, [open, ownerId]);

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeId) || notes[0] || null,
    [activeId, notes],
  );

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortScriptoraNotes(notes);
    return sortScriptoraNotes(notes.filter((note) => {
      return `${note.title} ${note.content}`.toLowerCase().includes(q);
    }));
  }, [notes, query]);

  if (!open) return null;

  const persist = (next: ScriptoraNote[]) => {
    const sorted = sortScriptoraNotes(next);
    setNotes(sorted);
    saveScriptoraNotes(sorted, ownerId);
    setSavedAt(new Date().toISOString());
  };

  const createNote = () => {
    const note = createScriptoraNote();
    persist([note, ...notes]);
    setActiveId(note.id);
  };

  const updateActiveNote = (patch: Partial<ScriptoraNote>) => {
    if (!activeId) return;
    const now = new Date().toISOString();
    setNotes((current) => {
      const next = sortScriptoraNotes(current.map((note) => (
        note.id === activeId ? { ...note, ...patch, updatedAt: now } : note
      )));
      saveScriptoraNotes(next, ownerId);
      return next;
    });
    setSavedAt(now);
  };

  const deleteNote = (id: string) => {
    const target = notes.find((note) => note.id === id);
    if (!target) return;

    if (notes.length <= 1) {
      const fresh = createScriptoraNote({ title: "Nuovo appunto" });
      persist([fresh]);
      setActiveId(fresh.id);
      toast.success("Appunto svuotato.");
      return;
    }

    const next = notes.filter((note) => note.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id || "");
    toast.success("Appunto eliminato.");
  };

  const copyActiveNote = async () => {
    if (!activeNote) return;
    const text = `${activeNote.title}\n\n${activeNote.content}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Appunto copiato.");
    } catch {
      toast.error("Copia non riuscita.");
    }
  };

  const exportActiveNote = () => {
    if (!activeNote) return;
    const safeTitle = activeNote.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "appunto";
    downloadTextFile(`${safeTitle}.txt`, `${activeNote.title}\n\n${activeNote.content}`.trim());
    toast.success("Appunto esportato.");
  };

  const exportAllNotes = () => {
    const content = sortScriptoraNotes(notes)
      .map((note) => `# ${note.title}\nAggiornato: ${formatNoteDate(note.updatedAt)}\n\n${note.content}`.trim())
      .join("\n\n---\n\n");
    downloadTextFile("scriptora-block-notes.txt", content);
    toast.success("Block Notes esportato.");
  };

  const wordCount = activeNote ? countNoteWords(activeNote.content) : 0;
  const charCount = activeNote?.content.length || 0;
  const activeTextColor = NOTE_TEXT_COLORS.find((item) => item.id === activeNote?.textColor) || NOTE_TEXT_COLORS[0];

  return (
    <div className="scriptora-modal-overlay" onClick={onClose}>
      <div
        className="scriptora-modal-panel ios-panel max-w-6xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="ios-icon ios-icon-yellow h-10 w-10 shrink-0 rounded-[16px]">
              <NotebookPen className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-foreground">Block Notes</h2>
              <p className="text-[11px] text-muted-foreground">
                {notes.length} appunti · {savedAt ? `salvato ${formatNoteDate(savedAt)}` : "salvataggio attivo"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={createNote}
              className="ios-toolbar-button h-9 px-3 text-xs font-semibold"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Nuovo
            </button>
            <button
              type="button"
              onClick={exportAllNotes}
              className="ios-toolbar-button hidden h-9 px-3 text-xs font-semibold sm:inline-flex"
            >
              <Download className="h-3.5 w-3.5" />
              Tutto
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ios-toolbar-button h-9 w-9"
              aria-label="Chiudi Block Notes"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-white/10 bg-white/[0.035] p-3 md:border-b-0 md:border-r">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca appunti"
                className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.07] pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {filteredNotes.map((note) => {
                const active = note.id === activeNote?.id;
                const preview = getNotePreview(note.content);
                return (
                  <div
                    key={note.id}
                    className={`group flex items-start gap-2 rounded-lg border p-3 transition-colors ${
                      active
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/10 bg-white/[0.055] hover:border-white/20 hover:bg-white/[0.085]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(note.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-foreground">
                        <span
                          className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle ring-1 ring-white/30"
                          style={{ backgroundColor: (NOTE_TEXT_COLORS.find((item) => item.id === note.textColor) || NOTE_TEXT_COLORS[0]).hex }}
                        />
                        {note.pinned && <Pin className="mr-1 inline h-3 w-3 text-amber-300" />}
                        {note.title || "Senza titolo"}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase text-muted-foreground">
                        {formatNoteDate(note.updatedAt)} · {countNoteWords(note.content)} parole
                      </p>
                      <p className="mt-2 line-clamp-2 min-h-[32px] text-xs leading-4 text-muted-foreground">
                        {preview || "Pagina vuota"}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNote(note.id)}
                      className="rounded-md p-1 text-muted-foreground opacity-60 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      title="Elimina appunto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          <main className="flex min-h-0 flex-col bg-gradient-to-br from-white/[0.05] via-transparent to-amber-300/[0.035]">
            {activeNote ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <StickyNote className="h-4 w-4 shrink-0 text-amber-300" />
                    <input
                      value={activeNote.title}
                      onInput={(event) => updateActiveNote({ title: event.currentTarget.value })}
                      onChange={(event) => updateActiveNote({ title: event.target.value })}
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-base font-semibold text-foreground outline-none transition focus:border-white/10 focus:bg-white/[0.06]"
                      placeholder="Titolo appunto"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="mr-1 hidden items-center gap-1 rounded-lg border border-white/10 bg-white/[0.055] px-2 py-1 sm:flex">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">Penna</span>
                      {NOTE_TEXT_COLORS.map((item) => {
                        const selected = item.id === activeTextColor.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateActiveNote({ textColor: item.id })}
                            className={`h-5 w-5 rounded-full transition ${
                              selected ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "ring-1 ring-white/25 hover:ring-white/70"
                            }`}
                            style={{ backgroundColor: item.hex }}
                            title={item.label}
                            aria-label={`Penna ${item.label}`}
                          />
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateActiveNote({ pinned: !activeNote.pinned })}
                      className="ios-toolbar-button h-8 px-2 text-xs"
                      title={activeNote.pinned ? "Rimuovi pin" : "Fissa appunto"}
                    >
                      {activeNote.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={copyActiveNote}
                      className="ios-toolbar-button h-8 px-2 text-xs"
                      title="Copia"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={exportActiveNote}
                      className="ios-toolbar-button h-8 px-2 text-xs"
                      title="Esporta TXT"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.035] px-4 py-2 sm:hidden">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Penna</span>
                  {NOTE_TEXT_COLORS.map((item) => {
                    const selected = item.id === activeTextColor.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateActiveNote({ textColor: item.id })}
                        className={`h-6 w-6 rounded-full transition ${
                          selected ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "ring-1 ring-white/25"
                        }`}
                        style={{ backgroundColor: item.hex }}
                        title={item.label}
                        aria-label={`Penna ${item.label}`}
                      />
                    );
                  })}
                </div>

                <textarea
                  value={activeNote.content}
                  onInput={(event) => updateActiveNote({ content: event.currentTarget.value })}
                  onChange={(event) => updateActiveNote({ content: event.target.value })}
                  placeholder="Appunto..."
                  spellCheck
                  className="scriptora-writing-surface min-h-0 flex-1 resize-none border-0 px-5 py-5 text-[15px] leading-8 outline-none placeholder:text-slate-400 sm:px-8"
                  style={{
                    backgroundColor: "#fffdf7",
                    backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.11) 1px, transparent 1px)",
                    backgroundSize: "100% 32px",
                    color: activeTextColor.hex,
                    caretColor: activeTextColor.hex,
                  }}
                />

                <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Save className="h-3.5 w-3.5 text-emerald-300" />
                    Salvato automaticamente
                  </span>
                  <span>{wordCount.toLocaleString()} parole · {charCount.toLocaleString()} caratteri</span>
                </footer>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6">
                <button
                  type="button"
                  onClick={createNote}
                  className="ios-toolbar-button h-11 px-4 text-sm font-semibold"
                >
                  <FilePlus2 className="h-4 w-4" />
                  Nuovo appunto
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
