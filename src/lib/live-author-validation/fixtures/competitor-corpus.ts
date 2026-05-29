/**
 * Simulated competitor outputs for blind testing (offline).
 * Represents typical ChatGPT / Claude patterns — NOT live API calls.
 * Live API runner can replace these when keys are available.
 */

export const GENERIC_CHATGPT_PATTERNS = {
  romance: `
It was a normal day when Elena woke up thinking about love.
"I understand now," she said calmly. "I love you. Everything will be fine."
Marco smiled. "Me too. I'm not afraid anymore."
In this chapter we explore their emotions and why connection matters.
`.trim(),
  thriller: `
John woke up on a normal morning and ate breakfast.
He thought about the mystery but felt calm.
At the end of the day everything seemed fine and safe.
It is important to note that tension can build slowly in stories.
`.trim(),
  fantasy: `
Kael walked through the kingdom. The world was beautiful and magical.
He felt many emotions about his journey and destiny.
In this chapter we delve into the themes of courage and friendship.
Everything was connected in the tapestry of fate.
`.trim(),
  memoir: `
In that moment I felt a profound wave of emotion wash over my soul.
I realized that healing is a journey and love is the answer.
Everything was beautiful and my heart understood the universe.
`.trim(),
  selfHelp: `
Believe in yourself and the universe will align with your dreams.
You are enough. You are worthy. Manifest abundance with gratitude.
In this chapter we will explore how to unlock your inner power.
`.trim(),
  business: `
Success starts with mindset. Believe in your vision and stay positive.
When we embrace growth, opportunities appear naturally.
It is important to note that leadership is about inspiring others emotionally.
`.trim(),
  horticultural: `
Growing tomatoes teaches us patience and inner growth.
Like life, each plant reminds us that abundance comes when we believe.
In this chapter you will discover the emotional journey of cultivation.
`.trim(),
};

/** Claude-style: eloquent, structured, but often over-explained and commercially flat */
export const CLAUDE_STYLE_PATTERNS = {
  romance: `
Elena stood at the window, considering the weight of what had passed between them.
There was, she thought, a certain clarity that arrived when one stopped running from feeling.
"I care about you," she said, choosing honesty over performance.
Marco listened with the attentiveness of someone who had learned, slowly, to meet vulnerability without flinching.
`.trim(),
  thriller: `
The envelope had no return address, which was itself a kind of message.
Detective Mara held it under the lamp and noticed the wax seal — wrong color, wrong pressure, deliberately wrong.
She did not open it immediately. Experience had taught her that some truths arrive better after coffee and a second opinion.
`.trim(),
  fantasy: `
The Salt Bridge had not changed, though everything around it had.
Kael remembered the oath as a sentence learned before he understood consequence.
Mira's notes in the margin suggested the second bell was not metaphor. He was not yet sure he wanted that to be true.
`.trim(),
  memoir: `
My mother opened doors the way other people opened arguments — already halfway through.
I learned early that leaving quickly was a skill, not a failure.
That winter I told myself I was only sorting boxes. I was already packing.
`.trim(),
  selfHelp: `
Habit change fails when we optimize motivation instead of environment.
Place the cue where your future self cannot ignore it. Reduce friction before you increase willpower.
Track one behavior for seven days before stacking another. Consistency precedes transformation.
`.trim(),
  business: `
Pricing anchors to cost when founders fear stating value.
Define the buyer's expensive problem first. Quantify failure cost. Price against avoided loss.
A tool that prevents one churn event can justify its monthly fee in week one — if you show the math.
`.trim(),
  horticultural: `
Tomatoes prefer soil pH between 6.0 and 6.8. Test before planting.
Harden seedlings for seven to ten days before transplant to reduce shock.
Yellow lower leaves often indicate inconsistent watering or nitrogen imbalance — adjust before assuming disease.
`.trim(),
};

export type CompetitorVariant = "scriptora" | "generic-chatgpt" | "claude-style";

export type CorpusGenreKey =
  | "romance"
  | "thriller"
  | "fantasy"
  | "memoir"
  | "selfHelp"
  | "business"
  | "horticultural";

export function getCompetitorSample(genre: CorpusGenreKey, variant: CompetitorVariant): string {
  if (variant === "generic-chatgpt") return GENERIC_CHATGPT_PATTERNS[genre];
  if (variant === "claude-style") return CLAUDE_STYLE_PATTERNS[genre];
  return "";
}
