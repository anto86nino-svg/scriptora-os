import type { Language } from "@/types/book";
import { studioGenresFromRegistry } from "@/lib/book-type-engine";

export const STUDIO_STEPS = [
  "Crea libro",
  "Identità autore",
  "Configurazione",
  "Personaggi",
  "Stile e tono",
  "Validazione",
  "Blueprint",
  "Approvazione",
] as const;

export const AMAZON_MARKETPLACES = [
  { id: "amazon.it", label: "Amazon.it" },
  { id: "amazon.com", label: "Amazon.com" },
  { id: "amazon.co.uk", label: "Amazon.co.uk" },
  { id: "amazon.de", label: "Amazon.de" },
  { id: "amazon.fr", label: "Amazon.fr" },
  { id: "amazon.es", label: "Amazon.es" },
] as const;

export const STUDIO_GENRES = studioGenresFromRegistry();

export const STUDIO_LANGUAGES: Language[] = ["Italian", "English", "Spanish", "French", "German"];
