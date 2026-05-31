export {
  GREATNESS_ENGINE_VERSION,
  GREATNESS_ELEVATION_FLOOR,
  type GreatnessLevel,
  type GreatnessScore,
  type GreatnessDimensions,
  type GreatnessAnalysisSnapshot,
  type ElevationPassResult,
  type SceneElevationReport,
  type MemorabilityReport,
  type CinematicImageryReport,
  type BingeabilityReport,
  type HookIntensityReport,
  type EmotionalResonanceReport,
} from "./types";

export {
  runGreatnessElevationPass,
  computeGreatnessScore,
  analyzeGreatness,
  analyzeSceneElevation,
  analyzeMemorability,
  analyzeCinematicImagery,
  analyzeBingeability,
  applyBingeabilityMicroRewrite,
  analyzeHookIntensity,
  applyHookMicroRewrite,
  analyzeEmotionalResonance,
} from "./elevation-pass";

export { applySceneElevations } from "./scene-elevator";
