import { GenreProfile } from "./types";
import TravelGuideBrain from "./brains/TravelGuideBrain";
import CookbookBrain from "./brains/CookbookBrain";
import BaseBrain from "./brains/BaseBrain";

type BrainFactory = (profile: GenreProfile) => BaseBrain;

const registry: Record<string, BrainFactory> = {
  travel: (p) => new TravelGuideBrain(p),
  cookbook: (p) => new CookbookBrain(p),
  // other micro-genres can be registered dynamically
};

export function registerBrain(microGenre: string, factory: BrainFactory) {
  registry[microGenre] = factory;
}

export function getBrainForProfile(profile: GenreProfile): BaseBrain {
  const key = profile.micro || profile.format || "unknown";
  const factory = registry[key] || registry[profile.format] || ((p) => new TravelGuideBrain(p));
  return factory(profile);
}

export default { registerBrain, getBrainForProfile };
