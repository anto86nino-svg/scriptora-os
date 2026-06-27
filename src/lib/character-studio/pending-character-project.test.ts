import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { SCRIPTORA_CHARACTER_PROJECT_KEY } from "@/lib/character-studio-keys";
import { getPendingCharacterProject } from "./pending-character-project";

describe("getPendingCharacterProject", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("returns null when no character studio payload is stored", () => {
    expect(getPendingCharacterProject()).toBeNull();
  });

  it("reads preview payloads with idea only (must not auto-open Book Forge on dashboard mount)", () => {
    localStorage.setItem(
      SCRIPTORA_CHARACTER_PROJECT_KEY,
      JSON.stringify({ idea: "una storia d'amore", savedAsPreview: true }),
    );

    const pending = getPendingCharacterProject();
    expect(pending?.idea).toBe("una storia d'amore");
    expect(pending?.savedAsPreview).toBe(true);
  });

  it("prefers sessionStorage over localStorage", () => {
    localStorage.setItem(
      SCRIPTORA_CHARACTER_PROJECT_KEY,
      JSON.stringify({ idea: "local" }),
    );
    sessionStorage.setItem(
      SCRIPTORA_CHARACTER_PROJECT_KEY,
      JSON.stringify({ idea: "session", characterBible: "Nome: Anna" }),
    );

    expect(getPendingCharacterProject()?.idea).toBe("session");
  });
});
