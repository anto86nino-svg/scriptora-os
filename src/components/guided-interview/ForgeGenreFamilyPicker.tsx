import { useState } from "react";
import {
  FORGE_GENRE_CATALOG,
  FORGE_GENRE_FAMILIES,
  catalogEntryToChip,
  type ForgeGenreFamilyId,
} from "@/lib/guided-interview/forge-genre-catalog";
import { cn } from "@/lib/utils";

type ForgeGenreFamilyPickerProps = {
  onSelect: (value: string) => void;
};

export function ForgeGenreFamilyPicker({ onSelect }: ForgeGenreFamilyPickerProps) {
  const [family, setFamily] = useState<ForgeGenreFamilyId>("narrativa");

  const items = FORGE_GENRE_CATALOG.filter((entry) => entry.family === family);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {FORGE_GENRE_FAMILIES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFamily(f.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
              family === f.id
                ? "border-violet-300/50 bg-violet-500/25 text-violet-50"
                : "border-white/12 bg-white/[0.05] text-white/70 hover:border-violet-300/35",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((entry) => {
          const chip = catalogEntryToChip(entry);
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(chip.value)}
              className="rounded-2xl border border-white/12 bg-white/[0.05] px-3.5 py-2.5 text-left text-[11px] font-medium text-white/85 transition hover:border-violet-300/40 hover:bg-violet-500/15 active:scale-[0.98]"
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
