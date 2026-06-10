export type MollyMood = "playful" | "calm" | "tired" | "sad";
export type MollyVisual = "idle" | "play" | "eat" | "sleep";

interface Props {
  visual: MollyVisual;
  mood: MollyMood;
  size?: number;
}

// CSS-only animated dog. No emoji. Tail wags, head tilts, blinks, breathes.
// In-room only — no horizontal wandering.
export function MollySprite({ visual, mood, size = 140 }: Props) {
  const bodyColor =
    mood === "sad" ? "hsl(28 25% 50%)"
    : mood === "tired" ? "hsl(30 22% 56%)"
    : mood === "playful" ? "hsl(32 65% 60%)"
    : "hsl(30 55% 58%)";
  const bellyColor = "hsl(40 50% 82%)";

  const isSleeping = visual === "sleep";
  const isPlaying = visual === "play";
  const isEating = visual === "eat";

  const motionClass = isSleeping
    ? "molly-sleep"
    : isPlaying
    ? "molly-bounce"
    : isEating
    ? "molly-eat"
    : "molly-idle";

  const tailClass = isSleeping
    ? "molly-tail-still"
    : isPlaying || mood === "playful"
    ? "molly-tail-fast"
    : "molly-tail-wag";

  const eyeClosed = isSleeping || mood === "tired";
  const headClass = isEating ? "molly-head-eat" : isPlaying ? "molly-head-tilt" : "molly-head-base";

  // Mood-driven filters: sad → desaturate, tired → slow + slight desaturate
  const moodFilter =
    mood === "sad" ? "grayscale(0.7) brightness(0.85)"
    : mood === "tired" ? "grayscale(0.35) brightness(0.92)"
    : "none";
  const moodSpeedMultiplier = mood === "tired" ? 1.8 : 1;

  return (
    <div
      className={`molly-sprite ${motionClass}`}
      style={{
        width: size,
        height: size,
        filter: moodFilter,
        transition: "filter 1.2s ease",
        ["--molly-speed" as string]: moodSpeedMultiplier,
      }}
      aria-label={`Molly the dog, ${mood}`}
    >
      {/* Tail */}
      <div className={`molly-tail-wrap ${tailClass}`}>
        <div className="molly-tail-bone" style={{ background: bodyColor }} />
      </div>

      {/* Body */}
      <div className="molly-body" style={{ background: bodyColor }}>
        <div className="molly-belly" style={{ background: bellyColor }} />
      </div>

      {/* Legs */}
      <div className="molly-leg molly-leg-fl" style={{ background: bodyColor }} />
      <div className="molly-leg molly-leg-fr" style={{ background: bodyColor }} />
      <div className="molly-leg molly-leg-bl" style={{ background: bodyColor }} />
      <div className="molly-leg molly-leg-br" style={{ background: bodyColor }} />

      {/* Head */}
      <div className={`molly-head ${headClass}`} style={{ background: bodyColor }}>
        <div className="molly-ear molly-ear-l" style={{ background: bodyColor }} />
        <div className="molly-ear molly-ear-r" style={{ background: bodyColor }} />
        <div className={`molly-eye molly-eye-l ${eyeClosed ? "closed" : "molly-blink"}`} />
        <div className={`molly-eye molly-eye-r ${eyeClosed ? "closed" : "molly-blink"}`} />
        <div className="molly-snout" style={{ background: bellyColor }}>
          <div className="molly-nose" />
          <div className="molly-mouth" />
        </div>
        {isSleeping && <div className="molly-zzz">z</div>}
        {isEating && <div className="molly-bowl" />}
      </div>

      <style>{`
        .molly-sprite { position: relative; display: inline-block; }
        .molly-body {
          position: absolute; left: 18%; top: 42%;
          width: 64%; height: 38%;
          border-radius: 45% 45% 40% 40% / 50% 50% 45% 45%;
          box-shadow: 0 6px 14px -6px rgba(0,0,0,0.4);
        }
        .molly-belly {
          position: absolute; left: 22%; top: 38%;
          width: 56%; height: 55%;
          border-radius: 50%; opacity: 0.85;
        }
        .molly-head {
          position: absolute; left: 4%; top: 18%;
          width: 44%; height: 44%;
          border-radius: 50% 55% 45% 50% / 55% 50% 50% 45%;
          z-index: 2;
          transform-origin: 70% 80%;
        }
        .molly-head-base { animation: molly-head-tilt-soft 5s ease-in-out infinite; }
        .molly-head-tilt { animation: molly-head-tilt-strong 1.2s ease-in-out infinite; }
        .molly-head-eat  { animation: molly-head-eat-bob 0.6s ease-in-out infinite; }

        .molly-ear {
          position: absolute; width: 28%; height: 50%;
          border-radius: 50% 60% 60% 40%; top: -22%;
        }
        .molly-ear-l { left: 4%; transform: rotate(-25deg); }
        .molly-ear-r { right: 4%; transform: rotate(25deg); }

        .molly-eye {
          position: absolute; width: 11%; height: 11%;
          background: #1a1a1a; border-radius: 50%;
          top: 42%;
          transition: height 0.2s ease;
        }
        .molly-eye-l { left: 26%; }
        .molly-eye-r { right: 26%; }
        .molly-eye.closed { height: 2px; border-radius: 1px; top: 47%; }
        .molly-blink { animation: molly-blink 5.4s ease-in-out infinite; }

        .molly-snout {
          position: absolute; left: 28%; top: 56%;
          width: 44%; height: 32%;
          border-radius: 50% 50% 45% 45%;
        }
        .molly-nose {
          position: absolute; left: 38%; top: 18%;
          width: 24%; height: 22%;
          background: #1a1a1a; border-radius: 50%;
        }
        .molly-mouth {
          position: absolute; left: 42%; top: 60%;
          width: 16%; height: 6%;
          border-bottom: 2px solid #1a1a1a;
          border-radius: 0 0 8px 8px;
        }
        .molly-zzz {
          position: absolute; right: -18%; top: -10%;
          font-size: 18px; font-weight: 700;
          color: hsl(220 35% 60%);
          animation: molly-zzz 1.6s ease-in-out infinite;
        }
        .molly-bowl {
          position: absolute; right: -34%; top: 78%;
          width: 38%; height: 22%;
          background: hsl(0 70% 55%);
          border-radius: 0 0 50% 50%;
          box-shadow: inset 0 -3px 0 hsl(0 70% 38%);
        }

        .molly-leg {
          position: absolute; width: 10%; height: 22%;
          border-radius: 30% 30% 40% 40%;
          bottom: 4%;
        }
        .molly-leg-fl { left: 28%; }
        .molly-leg-fr { left: 42%; }
        .molly-leg-bl { right: 28%; }
        .molly-leg-br { right: 18%; }

        .molly-tail-wrap {
          position: absolute; right: 8%; top: 44%;
          width: 22%; height: 22%;
          transform-origin: 0% 50%;
        }
        .molly-tail-bone {
          width: 100%; height: 30%;
          border-radius: 4px 8px 8px 4px;
          transform-origin: 0% 50%;
        }

        @keyframes molly-breath {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1px) scale(1.015); }
        }
        @keyframes molly-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes molly-eat-bob-sprite {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(2px); }
        }
        @keyframes molly-head-tilt-soft {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes molly-head-tilt-strong {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes molly-head-eat-bob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(4px) rotate(4deg); }
        }
        @keyframes molly-tail-wag-anim {
          0%, 100% { transform: rotate(-15deg); }
          50% { transform: rotate(25deg); }
        }
        @keyframes molly-tail-fast-anim {
          0%, 100% { transform: rotate(-30deg); }
          50% { transform: rotate(40deg); }
        }
        @keyframes molly-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95%, 98% { transform: scaleY(0.1); }
        }
        @keyframes molly-zzz {
          0% { opacity: 0; transform: translateY(0); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-8px); }
        }

        .molly-idle  { animation: molly-breath calc(3.2s * var(--molly-speed, 1)) ease-in-out infinite; }
        .molly-bounce{ animation: molly-bounce calc(0.6s * var(--molly-speed, 1)) ease-in-out infinite; }
        .molly-eat   { animation: molly-eat-bob-sprite calc(0.7s * var(--molly-speed, 1)) ease-in-out infinite; }
        .molly-sleep { animation: molly-breath calc(4.6s * var(--molly-speed, 1)) ease-in-out infinite; }

        .molly-tail-wag .molly-tail-bone  { animation: molly-tail-wag-anim 0.85s ease-in-out infinite; }
        .molly-tail-fast .molly-tail-bone { animation: molly-tail-fast-anim 0.32s ease-in-out infinite; }
        .molly-tail-still .molly-tail-bone { animation: none; transform: rotate(-10deg); }
      `}</style>
    </div>
  );
}
