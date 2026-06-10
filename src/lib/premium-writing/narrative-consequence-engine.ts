import type { Chapter } from "@/types/book";

export type NarrativeDebtType = "lie" | "promise" | "secret" | "threat" | "conflict" | "emotional_debt";

export interface NarrativeDebt {
  type: NarrativeDebtType;
  summary: string;
  chapterIntroduced: number;
  unresolved: boolean;
}

const DEBT_PATTERNS: Array<{ type: NarrativeDebtType; patterns: RegExp[] }> = [
  {
    type: "lie",
    patterns: [
      /\b(mentì|mentito|bugia|non disse la verità|lasciò credere|fece finta|lied|lied to|pretended)\b/i,
    ],
  },
  {
    type: "promise",
    patterns: [
      /\b(promis[se]|giurò|jurò|prometto|ti prometto|promised|swore|I swear)\b/i,
    ],
  },
  {
    type: "secret",
    patterns: [
      /\b(segret[oi]|non doveva saperlo|taci[òu]|nascose|secret|hid(e|ing) the truth)\b/i,
    ],
  },
  {
    type: "threat",
    patterns: [
      /\b(minacci[ao]|se lo scopre|prima che|deadline|ultimatum|threaten|or else)\b/i,
    ],
  },
  {
    type: "conflict",
    patterns: [
      /\b(non parlano più|litig[ao]|tradimento|tradì|betrayed|broke up|rupture)\b/i,
    ],
  },
  {
    type: "emotional_debt",
    patterns: [
      /\b(deve ancora|non ha perdonato|deve spiegare|owes an apology|unfinished business)\b/i,
    ],
  },
];

export function extractNarrativeDebts(chapters: Chapter[]): NarrativeDebt[] {
  const debts: NarrativeDebt[] = [];
  chapters.forEach((ch, idx) => {
    const text = [ch.content, ...(ch.subchapters || []).map((s) => s.content)].join("\n");
    for (const { type, patterns } of DEBT_PATTERNS) {
      if (patterns.some((p) => p.test(text))) {
        const snippet = text.match(patterns[0])?.[0] || type;
        debts.push({
          type,
          summary: `${type}: "${snippet}" (cap. ${idx + 1})`,
          chapterIntroduced: idx + 1,
          unresolved: true,
        });
      }
    }
  });
  return debts.slice(-12);
}

export function buildNarrativeConsequenceBlock(previousChapters: Chapter[], chapterIndex: number): string {
  const debts = extractNarrativeDebts(previousChapters);
  if (!debts.length) return "";

  const openDebts = debts
    .filter((d) => d.chapterIntroduced < chapterIndex + 1)
    .map((d) => `- ${d.summary}`)
    .join("\n");

  if (!openDebts) return "";

  return `
NARRATIVE CONSEQUENCE ENGINE (MANDATORY):
Every prior choice must have consequences. Do not reset emotional or plot debts.

OPEN NARRATIVE DEBTS — at least one must advance or pay off in this chapter:
${openDebts}

RULES:
- A lie told in chapter N must create friction, exposure risk, or guilt before it vanishes
- Promises and threats must escalate or resolve — never ignore them
- Secrets have a cost when approached — do not let characters forget what they hid
- If no debt pays off here, introduce a NEW consequence from a prior action (ripple effect)
`.trim();
}
