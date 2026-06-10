export function buildSubtextEngineBlock(intensity: "light" | "balanced" | "heavy" = "balanced"): string {
  const ratio = intensity === "heavy" ? "70/30" : intensity === "light" ? "40/60" : "55/45";
  return `SUBTEXT ENGINE:
Show/don't-tell ratio target: ${ratio} (shown/subtext vs explicit).
Reduce direct emotional statements. Increase:
• Gestures, pauses, broken sentences, subject changes
• Body language that contradicts speech
• Objects and environment reflecting inner state
• What characters avoid saying

FORBID in prose:
• "She felt sad because..."
• "He realized that..."
• Explaining the reader what emotion to feel
Make the reader infer. Trust their intelligence.`;
}
