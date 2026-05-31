export type ClicheSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ClicheCategory =
  | "Dialogue"
  | "Motivation"
  | "Self Help"
  | "Romance"
  | "Fantasy"
  | "Thriller"
  | "Business"
  | "Character Emotion"
  | "Ending";

export type ClicheEntry = {
  pattern: RegExp;
  label: string;
  severity: ClicheSeverity;
  category: ClicheCategory;
  /** Replacement template — $1 preserves capture groups when present */
  rewrite?: string;
};

export type ClicheHit = {
  label: string;
  matched: string;
  category: ClicheCategory;
  severity: ClicheSeverity;
  excerpt: string;
  startIndex: number;
};

export type ClicheScanResult = {
  hits: ClicheHit[];
  density: number;
  criticalCount: number;
  highCount: number;
  requiresRewrite: boolean;
};
