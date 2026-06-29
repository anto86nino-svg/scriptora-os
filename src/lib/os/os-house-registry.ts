import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  FileDown,
  GraduationCap,
  ImagePlus,
  PenLine,
  Rocket,
  Settings,
  Sparkles,
  Users,
  Wrench,
  BarChart3,
  CreditCard,
  Fingerprint,
  NotebookPen,
  TrendingUp,
  Search,
  Key,
  ScanLine,
  Package,
} from "lucide-react";
import { getToolRoute } from "@/lib/one-flow/tool-registry";

export type OsHouseId = "scrittura" | "pubblicazione" | "mercato" | "studio" | "impostazioni";

export type OsHouseToolCard = {
  id: string;
  label: string;
  description: string;
  route: string;
  icon: LucideIcon;
  /** dashboard overlay tool id when route stays on /dashboard */
  dashboardTool?: string;
  feature?: string;
};

export type OsHouseDefinition = {
  id: OsHouseId;
  path: string;
  label: string;
  subtitle: string;
  accent: "scriptora" | "publishing" | "study" | "market" | "neutral";
  icon: LucideIcon;
  tools: OsHouseToolCard[];
};

export const OS_HOUSE_PATHS: Record<OsHouseId, string> = {
  scrittura: "/os/scrittura",
  pubblicazione: "/os/pubblicazione",
  mercato: "/os/mercato",
  studio: "/os/studio",
  impostazioni: "/os/impostazioni",
};

export const OS_HOUSES: OsHouseDefinition[] = [
  {
    id: "scrittura",
    path: OS_HOUSE_PATHS.scrittura,
    label: "Casa Scrittura",
    subtitle: "Creazione, personaggi, blueprint e writer",
    accent: "scriptora",
    icon: PenLine,
    tools: [
      {
        id: "book-forge",
        label: "Book Forge",
        description: "DNA, blueprint e avvio progetto",
        route: "/dashboard",
        dashboardTool: "book-forge",
        icon: Sparkles,
      },
      {
        id: "character",
        label: "Character Studio",
        description: "Cast, genere, tono e conflitto",
        route: getToolRoute("character"),
        icon: Users,
      },
      {
        id: "writer",
        label: "Writer Studio",
        description: "Scrivi e genera capitoli",
        route: getToolRoute("writer"),
        icon: PenLine,
      },
      {
        id: "manuscript",
        label: "Manuscript Lab",
        description: "Diagnostica e revisione editoriale",
        route: getToolRoute("manuscript"),
        icon: NotebookPen,
        feature: "chapter_improvement",
      },
      {
        id: "canon",
        label: "Canon Brain",
        description: "Coerenza narrativa nel Writer Studio",
        route: getToolRoute("writer"),
        icon: BookOpen,
      },
      {
        id: "advanced-tools",
        label: "Strumenti avanzati",
        description: "Audit, voice, continuità e qualità",
        route: "/dashboard",
        dashboardTool: "advanced-tools",
        icon: Wrench,
      },
      {
        id: "notepad",
        label: "Block Notes",
        description: "Appunti e idee rapide",
        route: getToolRoute("notepad"),
        icon: NotebookPen,
      },
    ],
  },
  {
    id: "pubblicazione",
    path: OS_HOUSE_PATHS.pubblicazione,
    label: "Casa Pubblicazione",
    subtitle: "Cover, packaging, export e KDP",
    accent: "publishing",
    icon: Package,
    tools: [
      {
        id: "cover",
        label: "Cover Studio",
        description: "Design copertina del libro attivo",
        route: getToolRoute("cover"),
        icon: ImagePlus,
        feature: "cover_studio_template",
      },
      {
        id: "publishing",
        label: "Packaging Center",
        description: "Percorso unificato verso la pubblicazione",
        route: getToolRoute("publishing"),
        icon: Package,
      },
      {
        id: "export",
        label: "Export Studio",
        description: "EPUB, DOCX e PDF",
        route: getToolRoute("export"),
        icon: FileDown,
        feature: "export_epub",
      },
      {
        id: "kdp",
        label: "KDP Launch",
        description: "Pubblicazione Amazon KDP",
        route: getToolRoute("kdp"),
        icon: Rocket,
        feature: "kdp_market_base",
      },
    ],
  },
  {
    id: "mercato",
    path: OS_HOUSE_PATHS.mercato,
    label: "Casa Mercato",
    subtitle: "Titolo, keyword, radar e intelligence",
    accent: "market",
    icon: TrendingUp,
    tools: [
      {
        id: "title",
        label: "Title Intelligence",
        description: "Ottimizza titolo e sottotitolo",
        route: getToolRoute("title"),
        icon: Search,
        feature: "title_intelligence_base",
      },
      {
        id: "keyword",
        label: "Keyword Gold",
        description: "Keyword Amazon ad alta conversione",
        route: getToolRoute("keyword"),
        icon: Key,
        feature: "kdp_market_base",
      },
      {
        id: "radar",
        label: "Bestseller Radar",
        description: "Nicchie e trend di mercato",
        route: getToolRoute("radar"),
        icon: ScanLine,
        feature: "trending_niches_limited",
      },
      {
        id: "market-mobile",
        label: "Market OS",
        description: "Hub mercato mobile e decisioni rapide",
        route: getToolRoute("market-mobile"),
        icon: BarChart3,
      },
    ],
  },
  {
    id: "studio",
    path: OS_HOUSE_PATHS.studio,
    label: "Casa Studio",
    subtitle: "Study OS e sessioni di formazione",
    accent: "study",
    icon: GraduationCap,
    tools: [
      {
        id: "study",
        label: "Study OS",
        description: "Riassunti, quiz, flashcard e mappe",
        route: getToolRoute("study"),
        icon: GraduationCap,
      },
      {
        id: "study-session",
        label: "Sessione studio",
        description: "Apri una sessione guidata",
        route: "/study-session",
        icon: BookOpen,
      },
    ],
  },
  {
    id: "impostazioni",
    path: OS_HOUSE_PATHS.impostazioni,
    label: "Casa Impostazioni",
    subtitle: "Profilo, aspetto, crediti e preferenze",
    accent: "neutral",
    icon: Settings,
    tools: [
      {
        id: "settings-hub",
        label: "Impostazioni Scriptora",
        description: "Hub centrale preferenze e account",
        route: "/dashboard",
        dashboardTool: "settings-hub",
        icon: Settings,
      },
      {
        id: "identity",
        label: "Identità autore",
        description: "Nome, bio e voce editoriale",
        route: getToolRoute("identity"),
        icon: Fingerprint,
        feature: "book_engine_full",
      },
      {
        id: "usage",
        label: "Crediti e utilizzo",
        description: "Saldo crediti e acquisti",
        route: getToolRoute("usage"),
        icon: BarChart3,
      },
      {
        id: "pricing",
        label: "Piani e prezzi",
        description: "Confronta i piani autore",
        route: getToolRoute("pricing"),
        icon: CreditCard,
      },
      {
        id: "downloads",
        label: "Download",
        description: "App e asset scaricabili",
        route: getToolRoute("downloads"),
        icon: FileDown,
      },
    ],
  },
];

export function getOsHouse(id: OsHouseId): OsHouseDefinition {
  const house = OS_HOUSES.find((item) => item.id === id);
  if (!house) throw new Error(`Unknown OS house: ${id}`);
  return house;
}

export function getAllOsHousePaths(): string[] {
  return OS_HOUSES.map((house) => house.path);
}
