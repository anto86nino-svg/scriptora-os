import type { AuthorIdentity } from "@/types/book";
import {
  AUTHOR_PRESENCE_OPTIONS,
  READER_EMOTIONAL_GOAL_OPTIONS,
  hasAuthorVoiceMemory,
  normalizeAuthorPresence,
  normalizeReaderEmotionalGoals,
  toggleChipSelection,
} from "@/lib/author-brain/voice-memory";
import { t } from "@/lib/i18n";

interface AuthorVoiceMemoryPanelProps {
  draft: AuthorIdentity;
  onChange: (patch: Partial<AuthorIdentity>) => void;
}

function presenceLabel(id: string): string {
  return t(`author_voice_presence_${id.replace(/-/g, "_")}`);
}

function goalLabel(id: string): string {
  return t(`author_voice_goal_${id.replace(/-/g, "_")}`);
}

function ChipGrid({
  options,
  selected,
  onToggle,
  labelFor,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (id: string) => void;
  labelFor: (id: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((id) => {
        const active = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => onToggle(id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              active
                ? "border-violet-300/50 bg-violet-400/20 text-violet-100 shadow-sm shadow-violet-500/10"
                : "border-white/10 bg-white/[0.05] text-muted-foreground hover:border-violet-300/30 hover:bg-white/[0.09] hover:text-foreground"
            }`}
            aria-pressed={active}
          >
            {labelFor(id)}
          </button>
        );
      })}
    </div>
  );
}

export function AuthorVoiceMemoryPanel({ draft, onChange }: AuthorVoiceMemoryPanelProps) {
  const presence = normalizeAuthorPresence(draft.authorPresence);
  const goals = normalizeReaderEmotionalGoals(draft.readerEmotionalGoals);

  const togglePresence = (id: string) => {
    onChange({ authorPresence: toggleChipSelection(presence, id) });
  };

  const toggleGoal = (id: string) => {
    onChange({ readerEmotionalGoals: toggleChipSelection(goals, id) });
  };

  return (
    <section className="rounded-2xl border border-violet-300/20 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-indigo-500/[0.06] p-4">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/90">Author Voice Memory</p>
        <h3 className="mt-1 text-base font-semibold text-foreground">{t("author_voice_section_title")}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("author_voice_section_desc")}</p>
      </div>

      <div className="mt-5 space-y-5">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("author_voice_presence_question")}</p>
          <div className="mt-3">
            <ChipGrid options={AUTHOR_PRESENCE_OPTIONS} selected={presence} onToggle={togglePresence} labelFor={presenceLabel} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("author_voice_goals_question")}</p>
          <div className="mt-3">
            <ChipGrid options={READER_EMOTIONAL_GOAL_OPTIONS} selected={goals} onToggle={toggleGoal} labelFor={goalLabel} />
          </div>
        </div>

        <label className="block rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{t("author_voice_message_question")}</span>
          <textarea
            value={draft.authorMessage || ""}
            onChange={(e) => onChange({ authorMessage: e.target.value })}
            rows={3}
            className="author-textarea mt-3"
            placeholder={t("author_voice_message_placeholder")}
          />
        </label>
        {hasAuthorVoiceMemory(draft) && (
          <p className="mt-3 text-[11px] leading-4 text-muted-foreground">{t("author_brain_passive_memory_note")}</p>
        )}
      </div>
    </section>
  );
}
