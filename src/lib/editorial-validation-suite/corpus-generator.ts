import type { ValidationGenre } from "./types";

const ROMANCE_OPENERS = [
  "Elena stared at Marco across the café table.",
  "The elevator stopped between floors.",
  "Rain hit the window like punctuation.",
  "Marco's text had only three words.",
  "She shouldn't have come back to this city.",
  "The wedding invitation was still unopened.",
  "Heat rose in the kitchen — not from the stove.",
  "He said her name like it cost him something.",
  "Midnight on the bridge, and neither moved.",
  "Her phone lit up. His name. No message.",
];

const THRILLER_OPENERS = [
  "The key on her desk had no matching lock.",
  "Who killed Sofia? The question had followed Detective Russo for weeks.",
  "The warehouse smelled of bleach and old secrets.",
  "Three minutes before the call, the timestamp was wrong.",
  "Someone had rearranged her apartment by inches.",
  "The autopsy report omitted page four.",
  "He lied about the alibi. She wrote it down anyway.",
  "The camera in the hall blinked off at 2:17.",
  "Unknown number. No voice. Only breathing.",
  "The witness disappeared between floors.",
];

const FANTASY_OPENERS = [
  "The forbidden seal on the vault had been scratched.",
  "Kael still wore the oath-brand from the Ash War.",
  "Lyra heard the second bell — the elders said it was a myth.",
  "Magic was forbidden east of the Salt Bridge.",
  "The prophecy named a name no one spoke aloud.",
  "The coin rang wrong when dropped on stone.",
  "The ward flickered at dusk, as if tired.",
  "In the archive, the map showed a city that shouldn't exist.",
  "The dragon's scale was warm, though the beast was dead.",
  "She crossed the threshold the Pact forbade.",
];

const SELF_HELP_OPENERS = [
  "Most people fail at habit change because they optimize motivation.",
  "In this chapter we will explore how to overcome fear.",
  "Step 1: name the fear without judging it.",
  "Your environment beats willpower — here is why.",
  "Anxiety is not the enemy; avoidance is.",
  "The reader came here for one concrete shift.",
  "Try this exercise before reading further.",
  "Perfectionism masquerades as preparation.",
  "Small wins compound when tracked honestly.",
  "The goal is not confidence — it is contact with action.",
];

const WEAK_EMOTION = [
  'She was sad because she felt abandoned and alone.',
  '"I understand exactly how you feel," he said. They hugged and made up immediately.',
  'He felt happy because everything was finally fine.',
  'Era triste perché si sentiva abbandonata.',
  '"I love you," he said. "Me too," she answered. Believe in yourself, she thought.',
];

const THRILLER_WEAK = [
  "It was a normal day. Nothing happened. Then something happened.",
  "Time was running out. He knew he had to act.",
  "No one was who they seemed. The killer was closer than they thought.",
];

const FANTASY_WEAK = [
  "The chosen one would save them all. Dark magic surged through the land.",
  "It was all worth it in the end. I finally understood who I was.",
];

const SELF_HELP_WEAK = [
  "Believe in yourself. Everything happens for a reason.",
  "The crack is where the light gets in. You are enough.",
  "Trust the process. Manifest your dreams with gratitude.",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function padWords(base: string, target: number): string {
  const filler =
    " The scene held its breath. Details accumulated — sound, light, the weight of what was not said. " +
    "Someone moved. Someone waited. The moment stretched without offering easy meaning.";
  let text = base;
  while (text.split(/\s+/).length < target) {
    text += filler;
  }
  return text.trim();
}

export function generateValidationChapter(genre: ValidationGenre, chapterIndex: number): { title: string; content: string } {
  const n = chapterIndex;
  switch (genre) {
    case "romance":
      return {
        title: `Chapter ${n + 1}`,
        content: padWords(
          `${pick(ROMANCE_OPENERS, n)} ${pick(WEAK_EMOTION, n)} ` +
            `Marco promised he would tell her the truth before midnight. Why does he avoid her? ` +
            `${n === 3 ? 'In chapter 3 Marco said "I never lie." ' : ""}` +
            `${n === 7 ? "Marco lied without guilt and changed the subject. " : ""}` +
            `Trust flickered between them like a wire about to snap.`,
          130,
        ),
      };
    case "thriller":
      return {
        title: `Chapter ${n + 1}`,
        content: padWords(
          `${pick(THRILLER_OPENERS, n)} ${pick(THRILLER_WEAK, n)} ` +
            `Secret about the warehouse remained unanswered. ` +
            `She noticed the scratched lock on the inner door — a setup with no answer yet.`,
          130,
        ),
      };
    case "fantasy":
      return {
        title: `Chapter ${n + 1}`,
        content: padWords(
          `${pick(FANTASY_OPENERS, n)} ${pick(FANTASY_WEAK, n)} ` +
            `The Iron Pact forbade crossing the Salt Bridge after the Ash War. ` +
            `Lyra promised she would return before the seal broke.`,
          130,
        ),
      };
    case "self-help":
      return {
        title: `Chapter ${n + 1}`,
        content: padWords(
          `${pick(SELF_HELP_OPENERS, n)} ${pick(SELF_HELP_WEAK, n)} ` +
            `How to overcome fear starts with naming what you avoid. ` +
            `Practice one behavior for seven days before adding another.`,
          130,
        ),
      };
  }
}

export function generateValidationCorpus(): Array<{ genre: ValidationGenre; chapterIndex: number; title: string; content: string }> {
  const genres: ValidationGenre[] = ["romance", "thriller", "fantasy", "self-help"];
  const out: Array<{ genre: ValidationGenre; chapterIndex: number; title: string; content: string }> = [];
  for (const genre of genres) {
    for (let i = 0; i < 10; i++) {
      const ch = generateValidationChapter(genre, i);
      out.push({ genre, chapterIndex: i, ...ch });
    }
  }
  return out;
}
