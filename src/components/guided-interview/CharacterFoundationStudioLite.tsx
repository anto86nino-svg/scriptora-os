import { Plus, RefreshCw, Trash2 } from "lucide-react";
import type { FoundationCharacter, FoundationCharacterRole } from "@/lib/guided-interview/character-foundation-studio";
import {
  FOUNDATION_CHARACTER_ROLES,
  createEmptyFoundationCharacter,
  foundationCastToForge,
} from "@/lib/guided-interview/character-foundation-studio";
import type { BookFoundationLock } from "@/lib/guided-interview/book-foundation-lock";
import type { FoundationGeneratorInput } from "@/lib/guided-interview/book-foundation-lock";
import { generateFoundationCast } from "@/lib/guided-interview/book-foundation-lock";
import { regenerateFoundationCharacter } from "@/lib/guided-interview/character-foundation-studio";
import { cn } from "@/lib/utils";

export type CharacterFoundationStudioLiteProps = {
  foundation: BookFoundationLock;
  input: FoundationGeneratorInput;
  onUpdate: (foundation: BookFoundationLock) => void;
  className?: string;
};

export function CharacterFoundationStudioLite({
  foundation,
  input,
  onUpdate,
  className,
}: CharacterFoundationStudioLiteProps) {
  const characters = foundation.foundationCharacters ?? [];

  const syncCharacters = (nextChars: FoundationCharacter[]) => {
    onUpdate({
      ...foundation,
      foundationCharacters: nextChars.map((c, i) => ({ ...c, roleIndex: i + 1 })),
      characters: foundationCastToForge(nextChars),
    });
  };

  const updateCharacter = (id: string, patch: Partial<FoundationCharacter>) => {
    syncCharacters(
      characters.map((c) =>
        c.id === id ? { ...c, ...patch, source: "user" as const } : c,
      ),
    );
  };

  const handleRegenerateOne = (character: FoundationCharacter) => {
    if (character.locked) return;
    const fresh = regenerateFoundationCharacter(input, character, generateFoundationCast);
    syncCharacters(characters.map((c) => (c.id === character.id ? fresh : c)));
  };

  const handleDelete = (id: string) => {
    syncCharacters(characters.filter((c) => c.id !== id));
  };

  const handleAdd = () => {
    syncCharacters([...characters, createEmptyFoundationCharacter()]);
  };

  const handleGenerateCast = () => {
    syncCharacters(generateFoundationCast(input));
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-1.5">
        <ActionBtn label="Genera cast" onClick={handleGenerateCast} />
        <ActionBtn label="Aggiungi personaggio" icon={<Plus className="h-3 w-3" />} onClick={handleAdd} />
        <ActionBtn label="Rigenera personaggi" icon={<RefreshCw className="h-3 w-3" />} onClick={handleGenerateCast} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {characters.map((character) => (
          <article
            key={character.id}
            className={cn(
              "rounded-xl border p-3",
              character.locked
                ? "border-amber-300/35 bg-amber-500/10"
                : "border-white/10 bg-black/20",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <select
                value={character.role}
                onChange={(e) =>
                  updateCharacter(character.id, { role: e.target.value as FoundationCharacterRole })
                }
                className="rounded-lg border border-white/12 bg-white/[0.06] px-2 py-1 text-[10px] text-white/80"
              >
                {FOUNDATION_CHARACTER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <div className="flex gap-1">
                <button
                  type="button"
                  title={character.locked ? "Sblocca" : "Blocca"}
                  onClick={() => updateCharacter(character.id, { locked: !character.locked })}
                  className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-white/50"
                >
                  {character.locked ? "🔒" : "○"}
                </button>
                {!character.locked && (
                  <button
                    type="button"
                    title="Rigenera"
                    onClick={() => handleRegenerateOne(character)}
                    className="rounded-md border border-white/10 px-1.5 py-0.5 text-white/50"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  title="Elimina"
                  onClick={() => handleDelete(character.id)}
                  className="rounded-md border border-white/10 px-1.5 py-0.5 text-white/50"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <input
              value={character.name}
              onChange={(e) => updateCharacter(character.id, { name: e.target.value })}
              placeholder="Nome"
              className="mt-2 w-full rounded-lg border border-white/12 bg-white/[0.06] px-2 py-1.5 text-sm font-semibold text-white"
            />

            <textarea
              value={character.shortDescription ?? character.narrativeFunction ?? ""}
              onChange={(e) =>
                updateCharacter(character.id, {
                  shortDescription: e.target.value,
                  narrativeFunction: e.target.value,
                })
              }
              placeholder="Descrizione / funzione narrativa"
              rows={2}
              className="mt-2 w-full rounded-lg border border-white/12 bg-white/[0.06] px-2 py-1.5 text-[11px] text-white/70"
            />

            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              <TraitField
                label="Ferita"
                value={character.innerWound ?? ""}
                onChange={(v) => updateCharacter(character.id, { innerWound: v })}
              />
              <TraitField
                label="Desiderio"
                value={character.desire ?? ""}
                onChange={(v) => updateCharacter(character.id, { desire: v })}
              />
              <TraitField
                label="Paura"
                value={character.fear ?? ""}
                onChange={(v) => updateCharacter(character.id, { fear: v })}
              />
              <TraitField
                label="Segreto"
                value={character.secret ?? ""}
                onChange={(v) => updateCharacter(character.id, { secret: v })}
              />
            </div>

            {character.arcDirection && (
              <p className="mt-2 text-[10px] text-white/40">Arco: {character.arcDirection}</p>
            )}
            <p className="mt-1 text-[9px] uppercase tracking-wider text-white/30">
              {character.source === "auto" ? "Generato" : "Manuale"} · #{character.roleIndex}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function TraitField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-wider text-white/35">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/65"
      />
    </label>
  );
}

function ActionBtn({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-amber-300/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-medium text-amber-100"
    >
      {icon}
      {label}
    </button>
  );
}
