import { useState, type ComponentType } from "react";
import { ChevronDown, Plus, Trash2, User, PenLine, Users, BookOpen, SlidersHorizontal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  type BestsellerProConfig,
  type BestsellerCharacter,
  AUTHOR_VOICE_OPTIONS,
  DIALOGUE_STYLE_OPTIONS,
  CHARACTER_ROLE_OPTIONS,
  emptyBestsellerCharacter,
  generateSubtitleOptions,
} from "@/lib/bestseller-pro-config";
import type { AutoBestsellerInput } from "@/services/autoBestsellerService";

interface Props {
  pro: BestsellerProConfig;
  onChange: (next: BestsellerProConfig) => void;
  disabled?: boolean;
  brief: Pick<
    AutoBestsellerInput,
    "idea" | "genre" | "subcategory" | "targetAudience" | "tone" | "language" | "titleLanguage" | "readerPromise"
  >;
  title: string;
  subtitle: string;
  onTitleChange: (v: string) => void;
  onSubtitleChange: (v: string) => void;
}

function ProCard({
  icon: Icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border/60 bg-muted/20">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 border-t border-border/40 px-3 py-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function IntensitySlider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: "low" | "balanced" | "high";
  onChange: (v: "low" | "balanced" | "high") => void;
  disabled?: boolean;
}) {
  const idx = value === "low" ? 0 : value === "high" ? 2 : 1;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <input
        type="range"
        min={0}
        max={2}
        step={1}
        value={idx}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(n === 0 ? "low" : n === 2 ? "high" : "balanced");
        }}
        className="mt-1 w-full accent-primary"
      />
      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
        <span>Low</span>
        <span>Balanced</span>
        <span>High</span>
      </div>
    </div>
  );
}

function CharacterRow({
  character,
  index,
  disabled,
  onChange,
  onRemove,
}: {
  character: BestsellerCharacter;
  index: number;
  disabled?: boolean;
  onChange: (c: BestsellerCharacter) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-background/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Character {index + 1}</span>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={disabled} onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Name"
          value={character.name}
          disabled={disabled}
          onChange={(e) => onChange({ ...character, name: e.target.value })}
        />
        <Select
          value={character.role || "protagonist"}
          onValueChange={(v) => onChange({ ...character, role: v as BestsellerCharacter["role"] })}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            {CHARACTER_ROLE_OPTIONS.filter((r) => r.value).map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input placeholder="Fear" value={character.fear} disabled={disabled} onChange={(e) => onChange({ ...character, fear: e.target.value })} />
        <Input placeholder="Desire" value={character.desire} disabled={disabled} onChange={(e) => onChange({ ...character, desire: e.target.value })} />
        <Input placeholder="Secret" value={character.secret} disabled={disabled} onChange={(e) => onChange({ ...character, secret: e.target.value })} />
      </div>
      <Input
        placeholder="Optional personality note"
        value={character.note}
        disabled={disabled}
        onChange={(e) => onChange({ ...character, note: e.target.value })}
      />
    </div>
  );
}

export function BestsellerProPanel({
  pro,
  onChange,
  disabled,
  brief,
  title,
  subtitle,
  onTitleChange,
  onSubtitleChange,
}: Props) {
  const [subtitleOptions, setSubtitleOptions] = useState<string[]>([]);

  const patch = (partial: Partial<BestsellerProConfig>) => onChange({ ...pro, ...partial });

  const generateSubs = () => {
    const opts = generateSubtitleOptions({ ...brief, prefilledTitle: title }, 5);
    setSubtitleOptions(opts);
    if (!subtitle.trim() && opts[0]) onSubtitleChange(opts[0]);
  };

  const updateCharacter = (index: number, c: BestsellerCharacter) => {
    const next = [...pro.characters];
    next[index] = c;
    patch({ characters: next });
  };

  const addCharacter = () => {
    if (pro.characters.length >= 6) return;
    patch({ characters: [...pro.characters, emptyBestsellerCharacter()] });
  };

  const removeCharacter = (index: number) => {
    patch({ characters: pro.characters.filter((_, i) => i !== index) });
  };

  const showRomance = /romance|thriller|fantasy|dark-romance|literary/.test(String(brief.genre || "").toLowerCase());

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Bestseller Pro — few choices, big impact
      </p>

      <ProCard icon={PenLine} title="Author Identity" defaultOpen>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Author Voice</Label>
            <Select value={pro.authorVoice} onValueChange={(v) => patch({ authorVoice: v as BestsellerProConfig["authorVoice"] })} disabled={disabled}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTHOR_VOICE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Dialogue Style</Label>
            <Select value={pro.dialogueStyle} onValueChange={(v) => patch({ dialogueStyle: v as BestsellerProConfig["dialogueStyle"] })} disabled={disabled}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIALOGUE_STYLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <IntensitySlider label="Narrative Intensity" value={pro.narrativeIntensity} onChange={(v) => patch({ narrativeIntensity: v })} disabled={disabled} />
        <div>
          <Label className="text-xs">Custom Voice <span className="text-muted-foreground">(optional)</span></Label>
          <Textarea
            className="mt-1 min-h-[56px] resize-none text-xs"
            placeholder="How should Scriptora sound?"
            value={pro.customVoice}
            disabled={disabled}
            onChange={(e) => patch({ customVoice: e.target.value })}
          />
        </div>
      </ProCard>

      <ProCard icon={Users} title="Main Characters">
        {pro.characters.length === 0 && (
          <p className="text-xs text-muted-foreground">Optional — skip and Scriptora will seed a starter cast.</p>
        )}
        {pro.characters.map((c, i) => (
          <CharacterRow
            key={i}
            character={c}
            index={i}
            disabled={disabled}
            onChange={(next) => updateCharacter(i, next)}
            onRemove={() => removeCharacter(i)}
          />
        ))}
        <Button type="button" variant="secondary" size="sm" disabled={disabled || pro.characters.length >= 6} onClick={addCharacter}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add character
        </Button>
      </ProCard>

      <ProCard icon={SlidersHorizontal} title="Story Configuration">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Pacing</Label>
            <Select value={pro.pacing} onValueChange={(v) => patch({ pacing: v as BestsellerProConfig["pacing"] })} disabled={disabled}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="slow_burn">Slow Burn</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="fast">Fast</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ending Type</Label>
            <Select value={pro.endingType} onValueChange={(v) => patch({ endingType: v as BestsellerProConfig["endingType"] })} disabled={disabled}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="happy">Happy</SelectItem>
                <SelectItem value="bittersweet">Bittersweet</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="twist">Twist Ending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Violence</Label>
            <Select value={pro.violenceLevel} onValueChange={(v) => patch({ violenceLevel: v as BestsellerProConfig["violenceLevel"] })} disabled={disabled}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="strong">Strong</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Twist Density</Label>
            <Select value={pro.twistDensity} onValueChange={(v) => patch({ twistDensity: v as BestsellerProConfig["twistDensity"] })} disabled={disabled}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showRomance && (
            <div>
              <Label className="text-xs">Romance Level</Label>
              <Select value={pro.romanceLevel} onValueChange={(v) => patch({ romanceLevel: v as BestsellerProConfig["romanceLevel"] })} disabled={disabled}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="subplot">Subplot</SelectItem>
                  <SelectItem value="central">Central</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <IntensitySlider label="Emotional Intensity" value={pro.emotionalIntensity} onChange={(v) => patch({ emotionalIntensity: v })} disabled={disabled} />
      </ProCard>

      <ProCard icon={BookOpen} title="Title & Subtitle">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder="Title" value={title} disabled={disabled} onChange={(e) => onTitleChange(e.target.value)} />
          <Input placeholder="Subtitle / tagline" value={subtitle} disabled={disabled} onChange={(e) => onSubtitleChange(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["auto", "manual", "hybrid"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => patch({ subtitleMode: mode })}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium capitalize transition-colors disabled:opacity-50 ${
                pro.subtitleMode === mode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {mode}
            </button>
          ))}
          <Button type="button" variant="secondary" size="sm" disabled={disabled || brief.idea.trim().length < 8} onClick={generateSubs}>
            Generate subtitles
          </Button>
        </div>
        {subtitleOptions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {subtitleOptions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => onSubtitleChange(s)}
                className="rounded-md border border-border/60 bg-background/70 px-2 py-1 text-left text-[10px] text-foreground hover:border-primary/50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </ProCard>

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <User className="h-3 w-3" />
        Next: Scriptora creates your book blueprint.
      </p>
    </div>
  );
}
