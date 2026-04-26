// src/lib/bookBrain.ts

export type Genre =
  | "fantasy"
  | "romance"
  | "self_help"
  | "thriller"
  | "general";

export interface BookInput {
  genre: Genre;
  subgenre?: string;
  title: string;
  length: "short" | "medium" | "long";
}

export interface BookDNA {
  coreEmotion: string;
  transformation: string;
  narrativePressure: number;
  pacing: "slow" | "medium" | "fast";
}

export function generateBookDNA(input: BookInput): BookDNA {
  const { genre } = input;

  let dna: BookDNA = {
    coreEmotion: "trasformazione",
    transformation: "inizio → cambiamento",
    narrativePressure: 6,
    pacing: "medium",
  };

  if (genre === "fantasy") {
    dna = {
      coreEmotion: "lotta interiore",
      transformation: "umano → potere oscuro",
      narrativePressure: 9,
      pacing: "medium",
    };
  }

  if (genre === "romance") {
    dna = {
      coreEmotion: "amore + perdita",
      transformation: "solitudine → connessione",
      narrativePressure: 7,
      pacing: "medium",
    };
  }

  if (genre === "self_help") {
    dna = {
      coreEmotion: "dolore reale",
      transformation: "problema → soluzione",
      narrativePressure: 8,
      pacing: "fast",
    };
  }

  return dna;
}

export interface ChapterPlan {
  chapter: number;
  purpose: string;
  tensionLevel: number;
}

export function generateChapterPlan(totalChapters: number): ChapterPlan[] {
  const plan: ChapterPlan[] = [];

  for (let i = 1; i <= totalChapters; i++) {
    let purpose = "sviluppo";
    let tension = 5;

    if (i === 1) {
      purpose = "hook iniziale";
      tension = 7;
    } else if (i === Math.floor(totalChapters / 2)) {
      purpose = "midpoint (cambio direzione)";
      tension = 9;
    } else if (i === totalChapters - 1) {
      purpose = "crisi totale";
      tension = 10;
    } else if (i === totalChapters) {
      purpose = "climax e conseguenze";
      tension = 10;
    }

    plan.push({
      chapter: i,
      purpose,
      tensionLevel: tension,
    });
  }

  return plan;
}
