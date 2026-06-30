export type NarrativeTimelineIssue = {
  type: "contradictory_day_sequence" | "stacked_deadline_markers" | "ambiguous_time_jump";
  excerpt: string;
  message: string;
};

export type NarrativeTimelineValidation = {
  valid: boolean;
  issues: NarrativeTimelineIssue[];
};

function normalizeHay(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function excerptAround(text: string, index: number, radius = 48): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function validateNarrativeTimeline(text: string): NarrativeTimelineValidation {
  const source = String(text || "").trim();
  const issues: NarrativeTimelineIssue[] = [];
  if (!source) return { valid: true, issues };

  const hay = normalizeHay(source);
  const hasTomorrowAppointment =
    /\bdomani\s+(?:e\s+)?l['']?appuntament\w*/.test(hay) ||
    /\bappuntament\w*.*\bdomani\b/.test(hay);
  const has24Hours = /\b24\s*ore\b/.test(hay);
  const hasMorningAfter = /\bmattina\s+dopo\b/.test(hay);
  const hasTomorrowGeneric = /\bdomani\b/.test(hay);

  if (hasTomorrowAppointment && has24Hours && hasMorningAfter) {
    const idx = hay.indexOf("mattina dopo");
    issues.push({
      type: "contradictory_day_sequence",
      excerpt: excerptAround(source, Math.max(0, idx)),
      message: "La sequenza temporale mescola domani, 24 ore e mattina dopo nello stesso arco.",
    });
  }

  const deadlineMarkers = [
    /\bdomani\b/g,
    /\b24\s*ore\b/g,
    /\btra\s+\d+\s+(?:giorni?|ore)\b/g,
    /\bmattina\s+dopo\b/g,
    /\bil\s+giorno\s+dopo\b/g,
  ];
  const markerHits = deadlineMarkers.reduce((sum, pattern) => {
    const matches = hay.match(pattern);
    return sum + (matches?.length || 0);
  }, 0);

  if (markerHits >= 4 && hasTomorrowGeneric && has24Hours) {
    issues.push({
      type: "stacked_deadline_markers",
      excerpt: source.slice(0, 120).replace(/\s+/g, " ").trim(),
      message: "Troppi marcatori temporali ravvicinati senza ancoraggio chiaro al giorno corrente.",
    });
  }

  if (/\bieri\b/.test(hay) && /\bdomani\b/.test(hay) && /\boggi\b/.test(hay) && source.length < 1800) {
    const idx = hay.indexOf("domani");
    issues.push({
      type: "ambiguous_time_jump",
      excerpt: excerptAround(source, Math.max(0, idx)),
      message: "Ieri, oggi e domani compaiono troppo vicini senza transizione esplicita.",
    });
  }

  return { valid: issues.length === 0, issues };
}

export function buildTimelineCoherencePromptBlock(issues: NarrativeTimelineIssue[], language = "Italian"): string {
  if (!issues.length) return "";
  const lines = issues.map((issue) => `- ${issue.message}`);
  const lang = String(language || "").toLowerCase().includes("ital") ? "italiano" : "the book language";
  return `NARRATIVE TIMELINE AUDIT — FIX BEFORE CLOSING:
The chapter text has temporal inconsistencies. Reconcile them in ${lang} without adding meta commentary.
${lines.join("\n")}
Keep one clear day/hour anchor. If an appointment is tomorrow, do not also claim 24 hours passed and a morning-after scene in the same unresolved span.`;
}
