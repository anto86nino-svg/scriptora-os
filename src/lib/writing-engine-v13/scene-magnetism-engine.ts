import type { V13Context, V13Result, V13Signal } from "./types";

export function runSceneMagnetismEngine(text: string, ctx: V13Context = {}): V13Result {
  const signals: V13Signal[] = [];

  const hasDesire = /\b(vuole|voleva|cerca|desidera|obiettivo|wants|wanted|seeks|goal)\b/i.test(text);
  const hasObstacle = /\b(ma|però|ostacolo|impossibile|paura|rischio|blocked|but|however)\b/i.test(text);
  const hasMicroSurprise = /\b(invece|non era|scoprì|all'improvviso|unexpected|instead|discovered)\b/i.test(text);

  if (!hasDesire) signals.push({ id: "missing_desire", score: 55, message: "Serve un desiderio o obiettivo percepibile." });
  if (!hasObstacle) signals.push({ id: "missing_obstacle", score: 50, message: "Serve un ostacolo o una frizione reale." });
  if (!hasMicroSurprise) signals.push({ id: "missing_micro_surprise", score: 57, message: "Serve una deviazione, scoperta o svolta micro." });

  const score = Math.max(38, 94 - signals.length * 11);

  return {
    score,
    signals,
    directives: [
      "Every scene/section needs: desire → obstacle → friction → micro surprise → consequence.",
      "If a paragraph only explains, make it reveal, test, demonstrate, or complicate.",
    ],
  };
}
