import type { Language } from "@/types/book";
import { generateShadowTitleSet, type ShadowTitleCandidate } from "@/lib/title-shadow";

export interface KdpSeriesPlan {
  id: string;
  name: string;
  promise: string;
  order: number;
  bookCount: number;
}

export interface KdpBookPlan {
  id: string;
  title: string;
  subtitle: string;
  seriesName: string;
  priority: number;
  format: string;
  readerPromise: string;
  kdpAngle: string;
  keywords: string[];
  shadowTitles: ShadowTitleCandidate[];
}

export interface KdpEditorialMap {
  id: string;
  niche: string;
  genre: string;
  language: Language;
  targetAudience: string;
  positioning: string;
  series: KdpSeriesPlan[];
  books: KdpBookPlan[];
  shadowTitles: ShadowTitleCandidate[];
  createdAt: string;
}

export interface KdpEditorialMapInput {
  niche: string;
  genre?: string;
  language?: Language;
  targetAudience?: string;
}

function clean(value?: string, fallback = ""): string {
  return String(value || fallback).replace(/\s+/g, " ").trim();
}

function mapId(): string {
  try {
    return `kdp-map-${crypto.randomUUID()}`;
  } catch {
    return `kdp-map-${Date.now()}`;
  }
}

function isFiction(genre?: string): boolean {
  const value = String(genre || "").toLowerCase();
  return ["romance", "dark", "thriller", "fantasy", "horror", "sci", "historical"].some((item) => value.includes(item));
}

function keywordSeed(niche: string, genre: string): string[] {
  const words = `${niche} ${genre}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
  return Array.from(new Set(words)).slice(0, 8);
}

export function generateKdpEditorialMap(input: KdpEditorialMapInput): KdpEditorialMap {
  const language = input.language || "Italian";
  const italian = language === "Italian";
  const niche = clean(input.niche, italian ? "self-help pratico per ansia quotidiana" : "practical self-help for everyday anxiety");
  const genre = clean(input.genre, "self-help");
  const targetAudience = clean(input.targetAudience, italian ? "lettori che cercano una soluzione chiara e applicabile" : "readers looking for a clear, applicable solution");
  const fiction = isFiction(genre);
  const keys = keywordSeed(niche, genre);

  const series: KdpSeriesPlan[] = fiction
    ? [
        { id: "main-saga", name: italian ? "Saga principale" : "Main Saga", promise: italian ? "La linea narrativa centrale con personaggi e conflitto forte" : "The central story line with strong characters and conflict", order: 1, bookCount: 4 },
        { id: "bridge-novellas", name: italian ? "Novelle ponte" : "Bridge Novellas", promise: italian ? "Libri brevi per tenere viva la serie tra un volume e l'altro" : "Short books that keep the series alive between main volumes", order: 2, bookCount: 3 },
        { id: "spin-offs", name: italian ? "Spin-off personaggi" : "Character Spin-offs", promise: italian ? "Storie focalizzate sui personaggi secondari piu amati" : "Stories focused on the strongest secondary characters", order: 3, bookCount: 3 },
      ]
    : [
        { id: "starter", name: italian ? "Collana Starter" : "Starter Series", promise: italian ? "Libri brevi per intercettare lettori nuovi e keyword semplici" : "Short books for new readers and simple keywords", order: 1, bookCount: 3 },
        { id: "method", name: italian ? "Collana Metodo" : "Method Series", promise: italian ? "Guide complete con promessa forte e struttura passo passo" : "Complete guides with a strong promise and step-by-step structure", order: 2, bookCount: 4 },
        { id: "deep-dive", name: italian ? "Collana Deep Dive" : "Deep Dive Series", promise: italian ? "Approfondimenti verticali per dominare sotto-nicchie precise" : "Vertical deep dives to dominate precise sub-niches", order: 3, bookCount: 3 },
        { id: "workbook", name: italian ? "Workbook e Planner" : "Workbooks and Planners", promise: italian ? "Quaderni operativi da vendere come companion book" : "Operational companion books that expand the catalog", order: 4, bookCount: 2 },
      ];

  const bookAngles = fiction
    ? [
        "origin story", "forbidden desire", "secret revealed", "revenge arc", "second chance",
        "enemy alliance", "dark turning point", "final reckoning", "prequel", "box set",
      ]
    : [
        "beginner entry", "30-day plan", "mistakes to avoid", "advanced method", "daily routine",
        "case studies", "checklists", "workbook", "quick wins", "complete handbook", "problem-solution", "companion planner",
      ];

  const books: KdpBookPlan[] = bookAngles.map((angle, index) => {
    const seriesName = series[index % series.length].name;
    const idea = fiction
      ? `${niche} ${angle}`
      : `${niche} ${angle} for ${targetAudience}`;
    const shadowTitles = generateShadowTitleSet({
      idea,
      genre,
      subcategory: niche,
      targetAudience,
      readerPromise: italian
        ? `Aiutare ${targetAudience} con un angolo ${angle}`
        : `Help ${targetAudience} through a ${angle} angle`,
      language,
    }, 4);
    const best = shadowTitles[0];

    return {
      id: `book-${index + 1}`,
      title: best.title,
      subtitle: best.subtitle,
      seriesName,
      priority: index + 1,
      format: index < 3 ? (italian ? "Libro breve KDP" : "Short KDP book") : index < 8 ? (italian ? "Guida completa" : "Complete guide") : (italian ? "Companion / workbook" : "Companion / workbook"),
      readerPromise: best.subtitle,
      kdpAngle: angle,
      keywords: Array.from(new Set([...keys, ...best.keywords])).slice(0, 8),
      shadowTitles,
    };
  });

  const shadowTitles = generateShadowTitleSet({
    idea: niche,
    genre,
    subcategory: niche,
    targetAudience,
    language,
  }, 8);

  return {
    id: mapId(),
    niche,
    genre,
    language,
    targetAudience,
    positioning: italian
      ? `Dominare "${niche}" con una sequenza di libri brevi, guide complete e companion book collegati tra loro.`
      : `Dominate "${niche}" with a sequence of short books, complete guides, and connected companion books.`,
    series,
    books,
    shadowTitles,
    createdAt: new Date().toISOString(),
  };
}
