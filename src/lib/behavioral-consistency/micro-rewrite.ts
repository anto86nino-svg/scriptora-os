import type { BehavioralConsistencyReport } from "./types";

const VIOLATION_REWRITES: Array<[RegExp, string]> = [
  [
    /\bMarco lied without guilt and changed the subject\.?/gi,
    "Marco's answer arrived a beat late — shaped to dodge, not clarify.",
  ],
  [
    /\b(?:He|She|They|Marco|Elena) lied (?:without guilt|about the alibi)[^.!?]*[.!?]/gi,
    "The words landed sideways — true enough to pass, false enough to sting.",
  ],
  [/\b(?:lied|lied to|lied about|mentì|mentito|ha mentito)\b/gi, "The story shifted under careful wording."],
];

/** Rewrites explicit lie verbs that contradict prior value locks (Character Supremacy path). */
export function applyBehavioralMicroRewrite(
  text: string,
  report: BehavioralConsistencyReport,
): string {
  const critical = report.violations.filter(v => v.severity === "critical");
  if (!critical.length) return text;

  let next = text;
  for (const [pattern, replacement] of VIOLATION_REWRITES) {
    pattern.lastIndex = 0;
    if (pattern.test(next)) {
      pattern.lastIndex = 0;
      next = next.replace(pattern, replacement);
    }
  }

  return next.replace(/\s{2,}/g, " ").trim();
}
