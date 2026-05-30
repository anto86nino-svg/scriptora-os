import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, CloudRain, Flame, Moon, Music2, Pause, Play, Volume2, Waves } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { t, useUILanguage } from "@/lib/i18n";

type PresetId = "rain" | "waves" | "deep-focus" | "fireplace" | "library";

interface MusicPreset {
  id: PresetId;
  label: string;
  description: string;
  icon: "rain" | "waves" | "moon" | "fire" | "book";
  chord: number[];
  padVolume: number;
  textureVolume: number;
  filter: number;
  filterDrift: number;
  pulse: number;
  wave: OscillatorType;
}

interface AmbientHandle {
  context: AudioContext;
  master: GainNode;
  stop: () => void;
  setVolume: (volume: number) => void;
}

const STORAGE_KEY = "scriptora-focus-music-v1";
const STORAGE_VERSION = 2;
const DEFAULT_VOLUME = 0.075;
const MAX_VOLUME = 0.18;

const PRESETS: MusicPreset[] = [
  {
    id: "rain",
    label: "Pioggia calma",
    description: "Rumore soffice e pad caldo per scrivere senza distrazioni.",
    icon: "rain",
    chord: [98, 146.83],
    padVolume: 0.006,
    textureVolume: 0.085,
    filter: 620,
    filterDrift: 35,
    pulse: 0.018,
    wave: "sine",
  },
  {
    id: "waves",
    label: "Onde lente",
    description: "Movimento ampio, respiri lunghi, ritmo da revisione profonda.",
    icon: "waves",
    chord: [82.41, 123.47],
    padVolume: 0.007,
    textureVolume: 0.06,
    filter: 430,
    filterDrift: 55,
    pulse: 0.028,
    wave: "sine",
  },
  {
    id: "deep-focus",
    label: "Deep focus",
    description: "Drone pulito e stabile per capitoli lunghi.",
    icon: "moon",
    chord: [65.41, 98],
    padVolume: 0.008,
    textureVolume: 0.018,
    filter: 360,
    filterDrift: 18,
    pulse: 0.012,
    wave: "sine",
  },
  {
    id: "fireplace",
    label: "Camino notte",
    description: "Texture morbida, calda, quasi analogica.",
    icon: "fire",
    chord: [87.31, 130.81],
    padVolume: 0.006,
    textureVolume: 0.07,
    filter: 520,
    filterDrift: 28,
    pulse: 0.022,
    wave: "sine",
  },
  {
    id: "library",
    label: "Biblioteca",
    description: "Silenzio vivo, basso leggero e presenza discreta.",
    icon: "book",
    chord: [73.42, 110],
    padVolume: 0.0045,
    textureVolume: 0.026,
    filter: 300,
    filterDrift: 16,
    pulse: 0.01,
    wave: "sine",
  },
];

const PRESET_I18N: Record<PresetId, { label: string; desc: string }> = {
  rain: { label: "focus_preset_rain", desc: "focus_preset_rain_desc" },
  waves: { label: "focus_preset_waves", desc: "focus_preset_waves_desc" },
  "deep-focus": { label: "focus_preset_deep_focus", desc: "focus_preset_deep_focus_desc" },
  fireplace: { label: "focus_preset_fireplace", desc: "focus_preset_fireplace_desc" },
  library: { label: "focus_preset_library", desc: "focus_preset_library_desc" },
};

function readInitialSettings(): { presetId: PresetId; volume: number } {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const presetId = PRESETS.some((preset) => preset.id === parsed.presetId) ? parsed.presetId as PresetId : "rain";
    const savedVolume = Number(parsed.volume);
    const volume = parsed.version === STORAGE_VERSION
      ? Math.max(0.01, Math.min(MAX_VOLUME, Number.isFinite(savedVolume) ? savedVolume : DEFAULT_VOLUME))
      : DEFAULT_VOLUME;
    return { presetId, volume };
  } catch {
    return { presetId: "rain", volume: DEFAULT_VOLUME };
  }
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const seconds = 8;
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const output = buffer.getChannelData(0);
  let brown = 0;
  let pinkA = 0;
  let pinkB = 0;
  for (let index = 0; index < output.length; index += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.018 * white) / 1.018;
    pinkA = 0.997 * pinkA + white * 0.003;
    pinkB = 0.985 * pinkB + white * 0.015;
    output[index] = Math.max(-0.8, Math.min(0.8, brown * 2.2 + pinkA * 0.9 + pinkB * 0.35));
  }
  return buffer;
}

function createSlowTremolo(context: AudioContext, target: AudioParam, depth: number, speed: number) {
  const now = context.currentTime;
  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.type = "sine";
  lfo.frequency.setValueAtTime(speed, now);
  lfoGain.gain.setValueAtTime(depth, now);
  lfo.connect(lfoGain);
  lfoGain.connect(target);
  lfo.start();
  return lfo;
}

function createAmbientTrack(preset: MusicPreset, volume: number): AmbientHandle {
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) throw new Error("Audio non supportato da questo browser");

  const context = new AudioContextCtor();
  const master = context.createGain();
  const textureFilter = context.createBiquadFilter();
  const textureHighpass = context.createBiquadFilter();
  const padFilter = context.createBiquadFilter();
  const safety = context.createDynamicsCompressor();
  const activeSources: Array<OscillatorNode | AudioBufferSourceNode> = [];
  const now = context.currentTime;

  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(volume, now + 1.6);
  safety.threshold.setValueAtTime(-28, now);
  safety.knee.setValueAtTime(22, now);
  safety.ratio.setValueAtTime(3, now);
  safety.attack.setValueAtTime(0.12, now);
  safety.release.setValueAtTime(0.8, now);
  master.connect(safety);
  safety.connect(context.destination);

  textureHighpass.type = "highpass";
  textureHighpass.frequency.setValueAtTime(35, now);
  textureFilter.type = "lowpass";
  textureFilter.frequency.setValueAtTime(preset.filter, now);
  textureFilter.Q.setValueAtTime(0.25, now);
  textureHighpass.connect(textureFilter);
  textureFilter.connect(master);

  padFilter.type = "lowpass";
  padFilter.frequency.setValueAtTime(520, now);
  padFilter.Q.setValueAtTime(0.18, now);
  padFilter.connect(master);

  preset.chord.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = preset.wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.detune.setValueAtTime((index - 0.5) * 1.8, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(preset.padVolume / Math.max(1, preset.chord.length), now + 2.4 + index * 0.4);
    oscillator.connect(gain);
    gain.connect(padFilter);
    oscillator.start();
    activeSources.push(oscillator);
  });

  const noise = context.createBufferSource();
  const noiseGain = context.createGain();
  noise.buffer = createNoiseBuffer(context);
  noise.loop = true;
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.linearRampToValueAtTime(preset.textureVolume, now + 1.8);
  noise.connect(noiseGain);
  noiseGain.connect(textureHighpass);
  noise.start();
  activeSources.push(noise);

  const drift = context.createOscillator();
  const driftGain = context.createGain();
  drift.type = "sine";
  drift.frequency.setValueAtTime(preset.pulse, now);
  driftGain.gain.setValueAtTime(preset.filterDrift, now);
  drift.connect(driftGain);
  driftGain.connect(textureFilter.frequency);
  drift.start();
  activeSources.push(drift);

  const tremolo = createSlowTremolo(context, noiseGain.gain, preset.textureVolume * 0.18, preset.pulse * 0.55);
  activeSources.push(tremolo);

  return {
    context,
    master,
    setVolume(nextVolume) {
      const at = context.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(Math.max(0.01, Math.min(MAX_VOLUME, nextVolume)), at, 0.18);
    },
    stop() {
      const at = context.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setTargetAtTime(0.0001, at, 0.12);
      window.setTimeout(() => {
        activeSources.forEach((source) => {
          try {
            source.stop();
          } catch {
            /* already stopped */
          }
        });
        context.close().catch(() => undefined);
      }, 420);
    },
  };
}

function PresetIcon({ icon, className = "h-3.5 w-3.5" }: { icon: MusicPreset["icon"]; className?: string }) {
  if (icon === "rain") return <CloudRain className={className} />;
  if (icon === "waves") return <Waves className={className} />;
  if (icon === "fire") return <Flame className={className} />;
  if (icon === "book") return <BookOpenCheck className={className} />;
  return <Moon className={className} />;
}

export function FocusMusicControl() {
  useUILanguage();
  const initial = useMemo(readInitialSettings, []);
  const [presetId, setPresetId] = useState<PresetId>(initial.presetId);
  const [volume, setVolume] = useState(initial.volume);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const audioRef = useRef<AmbientHandle | null>(null);

  const activePreset = PRESETS.find((preset) => preset.id === presetId) || PRESETS[0];
  const activePresetLabel = t(PRESET_I18N[activePreset.id].label);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, presetId, volume }));
    } catch {
      /* local persistence is optional */
    }
  }, [presetId, volume]);

  useEffect(() => {
    audioRef.current?.setVolume(volume);
  }, [volume]);

  useEffect(() => () => {
    audioRef.current?.stop();
    audioRef.current = null;
  }, []);

  const stop = () => {
    audioRef.current?.stop();
    audioRef.current = null;
    setPlaying(false);
  };

  const start = async (nextPreset = activePreset) => {
    stop();
    const handle = createAmbientTrack(nextPreset, volume);
    audioRef.current = handle;
    if (handle.context.state === "suspended") await handle.context.resume();
    setPlaying(true);
  };

  const toggle = () => {
    if (playing) {
      stop();
      return;
    }
    start().catch(() => setPlaying(false));
  };

  const selectPreset = (preset: MusicPreset) => {
    setPresetId(preset.id);
    if (playing) {
      start(preset).catch(() => setPlaying(false));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex shrink-0 items-center gap-2 rounded-full border border-sky-300/15 bg-slate-900/70 px-2 py-1 shadow-lg backdrop-blur-xl">
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`ios-toolbar-button h-9 px-3 text-xs font-semibold rounded-full ${playing ? "text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.45)]" : "text-muted-foreground hover:text-foreground"}`}
            title="Musica focus"
          >
            <Music2 className="h-4 w-4 text-sky-300" />
            <span className="hidden md:inline text-xs font-semibold tracking-wide">
              {activePresetLabel}
            </span>
          </button>
        </PopoverTrigger>
        <button
          type="button"
          onClick={toggle}
          className={`ios-toolbar-button h-8 w-8 justify-center px-0 ${playing ? "text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.45)]" : "text-muted-foreground hover:text-foreground"}`}
          title={playing ? t("focus_music_pause") : t("focus_music_play")}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      </div>
      <PopoverContent align="start" className="w-80 rounded-xl border-white/10 bg-slate-950/95 p-3 text-slate-100 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Focus Music</p>
            <p className="mt-1 text-sm font-semibold text-white">{activePresetLabel}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-400">Tracce ambient integrate, generate localmente da Scriptora.</p>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-sky-300/25 bg-sky-300/10 text-sky-100 transition-colors hover:bg-sky-300/20"
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-3 grid gap-2">
          {PRESETS.map((preset) => {
            const active = preset.id === presetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => selectPreset(preset)}
                className={`flex items-start gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                  active
                    ? "border-sky-300/35 bg-sky-300/12 text-white"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-sky-300/25 hover:bg-white/[0.07]"
                }`}
              >
                <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-sky-300/18 text-sky-100" : "bg-white/[0.06] text-slate-400"}`}>
                  <PresetIcon icon={preset.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{t(PRESET_I18N[preset.id].label)}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-400">{t(PRESET_I18N[preset.id].desc)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <Volume2 className="h-3.5 w-3.5" />
              Volume
            </span>
            <span className="text-[11px] font-semibold text-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.45)]">{Math.round((volume / MAX_VOLUME) * 100)}%</span>
          </div>
          <Slider
            value={[volume]}
            min={0.01}
            max={MAX_VOLUME}
            step={0.005}
            onValueChange={(value) => setVolume(value[0] ?? DEFAULT_VOLUME)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
