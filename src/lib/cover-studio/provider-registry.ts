import { inferCoverArtDirection } from "./art-direction";
import type { CoverProvider, CoverProviderResult } from "./types";

export const scriptoraBuiltinProvider: CoverProvider = {
  id: "scriptora-builtin",
  label: "Scriptora Cover System",
  kind: "builtin",
  available: true,
  capabilities: ["generate"],

  async generate(input): Promise<CoverProviderResult> {
    const source = [input.genreBrief, input.prompt, input.title, input.subtitle].filter(Boolean).join(" ");
    const artDirection = inferCoverArtDirection(source || "literary fiction");

    return {
      ok: true,
      artDirection,
      metadata: {
        provider: "scriptora-builtin",
        procedural: true,
        width: input.width,
        height: input.height,
        seed: input.seed ?? artDirection.seed,
      },
    };
  },
};

function unavailableProvider(
  id: string,
  label: string,
): CoverProvider {
  const reject = async (): Promise<CoverProviderResult> => ({
    ok: false,
    error: `${label} is not configured. Connect an API key when ready — no refactor required.`,
  });

  return {
    id,
    label,
    kind: "external",
    available: false,
    capabilities: ["generate", "edit", "upscale"],
    generate: reject,
    edit: reject,
    upscale: reject,
  };
}

export const placeholderProviders: CoverProvider[] = [
  unavailableProvider("openai-images", "OpenAI Images"),
  unavailableProvider("ideogram", "Ideogram"),
  unavailableProvider("flux", "Flux"),
  unavailableProvider("stability", "Stability"),
  unavailableProvider("fal", "Fal"),
  unavailableProvider("replicate", "Replicate"),
  unavailableProvider("custom", "Custom Provider"),
];

export function getActiveCoverProvider(): CoverProvider {
  return scriptoraBuiltinProvider;
}

export function listCoverProviders(): CoverProvider[] {
  return [scriptoraBuiltinProvider, ...placeholderProviders];
}

export async function generateViaProvider(
  provider: CoverProvider,
  input: Parameters<CoverProvider["generate"]>[0],
): Promise<CoverProviderResult> {
  if (!provider.available) {
    return { ok: false, error: `${provider.label} is not available.` };
  }
  return provider.generate(input);
}
