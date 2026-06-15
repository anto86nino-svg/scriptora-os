import type { CoverEffectsState } from "./cover-layers";
import type { CanvasRect } from "./cover-backgrounds";

export function applyCoverEffects(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  effects: CoverEffectsState,
) {
  if (effects.vignette > 0) {
    const g = ctx.createRadialGradient(
      rect.x + rect.w / 2,
      rect.y + rect.h / 2,
      rect.w * 0.2,
      rect.x + rect.w / 2,
      rect.y + rect.h / 2,
      rect.w * 0.75,
    );
    const a = effects.vignette / 100;
    g.addColorStop(0, "transparent");
    g.addColorStop(1, `rgba(0,0,0,${a * 0.75})`);
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  if (effects.darkOverlay > 0) {
    ctx.fillStyle = `rgba(0,0,0,${effects.darkOverlay / 200})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  if (effects.lightOverlay > 0) {
    ctx.fillStyle = `rgba(255,255,255,${effects.lightOverlay / 250})`;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  if (effects.spotlight > 0) {
    const g = ctx.createRadialGradient(
      rect.x + rect.w * 0.5,
      rect.y + rect.h * 0.35,
      0,
      rect.x + rect.w * 0.5,
      rect.y + rect.h * 0.35,
      rect.w * 0.55,
    );
    const a = effects.spotlight / 100;
    g.addColorStop(0, `rgba(255,255,255,${a * 0.25})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  if (effects.grain > 0 || effects.paperTexture > 0) {
    const intensity = Math.max(effects.grain, effects.paperTexture) / 100;
    ctx.save();
    for (let i = 0; i < 400 * intensity; i++) {
      const x = rect.x + Math.random() * rect.w;
      const y = rect.y + Math.random() * rect.h;
      ctx.globalAlpha = 0.04 * intensity;
      ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.restore();
  }

  if (effects.readabilityBoost > 0) {
    const g = ctx.createLinearGradient(rect.x, rect.y + rect.h * 0.55, rect.x, rect.y + rect.h);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, `rgba(0,0,0,${effects.readabilityBoost / 150})`);
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  if (effects.cinematicShadow > 0) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h * 0.35);
    g.addColorStop(0, `rgba(0,0,0,${effects.cinematicShadow / 200})`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
}

export const EFFECT_CONTROLS: { key: keyof CoverEffectsState; label: string; labelIt: string }[] = [
  { key: "vignette", label: "Vignette", labelIt: "Vignette" },
  { key: "grain", label: "Grain", labelIt: "Grana" },
  { key: "darkOverlay", label: "Dark overlay", labelIt: "Overlay scuro" },
  { key: "lightOverlay", label: "Light overlay", labelIt: "Overlay chiaro" },
  { key: "spotlight", label: "Spotlight", labelIt: "Spotlight" },
  { key: "paperTexture", label: "Paper texture", labelIt: "Texture carta" },
  { key: "cinematicShadow", label: "Cinematic shadow", labelIt: "Ombra cinematica" },
  { key: "readabilityBoost", label: "Readability boost", labelIt: "Boost leggibilità" },
];
