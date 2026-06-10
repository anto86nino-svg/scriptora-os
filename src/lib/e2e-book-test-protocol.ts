export const E2E_BOOK_TEST_GENRES = [
  "Romance",
  "Thriller",
  "Fantasy",
  "Self Help",
  "Dark Romance",
] as const;

export const E2E_BOOK_TEST_CHECKLIST = [
  { id: "launch", label: "Avvio wizard percorso principale", critical: true },
  { id: "blueprint", label: "Blueprint generato senza skeleton", critical: true },
  { id: "chapter-1", label: "Primo capitolo generato e salvato", critical: true },
  { id: "diagnostic", label: "Diagnostica capitolo eseguita", critical: false },
  { id: "patch-undo", label: "Patch applicata e annullabile", critical: true },
  { id: "cover", label: "Cover creata", critical: false },
  { id: "export-block", label: "Export bloccato senza identità autore", critical: true },
  { id: "export-ok", label: "Export EPUB/PDF/DOCX completato", critical: true },
  { id: "mobile-pass", label: "Workflow completato su mobile", critical: true },
] as const;

export interface E2EBookTestRun {
  genre: (typeof E2E_BOOK_TEST_GENRES)[number];
  startedAt: string;
  completedAt?: string;
  blockers: string[];
  frictionNotes: string[];
  durationsMs: Record<string, number>;
}

export function createE2EBookTestRun(genre: (typeof E2E_BOOK_TEST_GENRES)[number]): E2EBookTestRun {
  return {
    genre,
    startedAt: new Date().toISOString(),
    blockers: [],
    frictionNotes: [],
    durationsMs: {},
  };
}

export function isE2ERunSuccessful(run: E2EBookTestRun): boolean {
  return run.blockers.length === 0 && !!run.completedAt;
}
