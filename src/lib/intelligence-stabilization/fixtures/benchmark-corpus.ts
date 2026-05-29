/** Offline benchmark fixtures — no API, no network */

export const FIXTURE_DARK_ROMANCE_STRONG = `
The door was wrong before she touched it — colder than the hallway.
Marco did not look at her. "You shouldn't be here."
She almost answered. Then didn't.
His hand stayed on the frame like he was holding the room together and himself apart.
"What are you hiding?" she asked, and hated how steady her voice sounded.
He laughed once, without humor. "Not yet."
`.trim();

export const FIXTURE_DARK_ROMANCE_FAIL = `
"I understand now," Elena said calmly. "I love you. Everything is fine between us."
Marco smiled. "Me too. I'm not afraid anymore."
They hugged and all their problems were solved forever.
`.trim();

export const FIXTURE_THRILLER_STRONG = `
The key did not match any lock she had seen — but someone had left it on her desk anyway.
She checked the hall mirror. Empty.
Then the phone buzzed: Unknown number. No message. Just the time stamp from three minutes in the future.
Whoever was watching her wanted her to know they could reach inside her day and rearrange it.
`.trim();

export const FIXTURE_THRILLER_FLAT = `
It was a normal morning. John woke up and ate breakfast.
He thought about work. Work was busy. He drove to the office.
At the end of the day he went home and everything was fine.
`.trim();

export const FIXTURE_MEMOIR_STRONG = `
My mother never knocked. She opened doors the way other people opened arguments — already halfway through.
I learned to keep my shoes by the bed not from fear of fire, but because leaving quickly had become a skill.
That winter I did not tell her I was packing. I told myself I was only sorting.
`.trim();

export const FIXTURE_MEMOIR_AI_POETRY = `
In that moment I felt a profound wave of emotion wash over my soul like moonlight on water.
I realized that healing is a journey and love is the answer we all seek.
Everything was beautiful and my heart understood the universe.
`.trim();

export const FIXTURE_SELF_HELP_STRONG = `
Most people fail at habit change because they optimize motivation instead of environment.
Try this: put the running shoes beside the bed, not in the closet.
When urge hits at 6am, friction beats willpower.
Track one behavior for seven days before adding another.
`.trim();

export const FIXTURE_SELF_HELP_FLUFF = `
Believe in yourself and the universe will align with your dreams.
You are enough. You are worthy. Manifest abundance with gratitude.
In this chapter we will explore how to unlock your inner power.
`.trim();

export const FIXTURE_BUSINESS_STRONG = `
The pricing mistake most SaaS founders make is anchoring to cost instead of outcome.
Framework: (1) define the buyer's expensive problem, (2) quantify failure cost, (3) price against avoided loss.
Example: a $400/month tool that prevents one $12k churn event pays for itself in week one.
`.trim();

export const FIXTURE_HORTICULTURAL_STRONG = `
Step 1: Test soil pH before planting — tomatoes prefer 6.0–6.8.
Step 2: Harden seedlings for 7–10 days before transplant; sudden sun causes leaf scorch.
Common mistake: overwatering after transplant — roots need air, not constant saturation.
Troubleshooting yellow lower leaves: often nitrogen deficiency or inconsistent watering.
`.trim();

export const FIXTURE_HORTICULTURAL_CONTAMINATED = `
Growing tomatoes teaches us patience and inner growth.
Like life, each plant reminds us that abundance comes when we believe in ourselves.
In this chapter you will discover the emotional journey of cultivation and unlock your garden mindset.
`.trim();

export const FIXTURE_FANTASY_CANON_SEED = `
The Iron Pact forbade mages from crossing the Salt Bridge after the Ash War.
Kael still wore the scar where the oath-brand had burned — he would not speak the name of the city he left.
In his pocket: a coin that rang wrong when dropped, a foreshadow the elders called "the second bell."
`.trim();

export const FIXTURE_CHAPTER_DOCTOR_BEFORE = `
Era una giornata normale. Marco si svegliò presto e pensò a quanto fosse felice.
"L'amore è la cosa più importante," disse con calma perfetta. "Sono grato per tutto."
Camminò verso la finestra. Sentiva pace profonda. Tutto era chiaro, tutto risolto.
`.trim();

export const FIXTURE_CHAPTER_DOCTOR_AFTER = `
Marco si svegliò prima dell'alba — mani fredde, caffè non ancora fatto.
"L'amore è…" Si fermò. Scosse la testa.
Restò immobile, ascoltando qualcosa che non riusciva a nominare.
Quando il telefono vibrò, non lo guardò subito.
`.trim();

export function buildFantasyChapterCorpus(chapters: number): string[] {
  const base = [
    FIXTURE_FANTASY_CANON_SEED,
    `Chapter ${2}: The Salt Bridge guard refused Kael passage. "The Pact remembers," he said. Kael did not answer.`,
    `Chapter ${3}: The second bell coin warmed in Kael's palm when the shadow moved under the bridge — unresolved.`,
    `Chapter ${4}: Mira found the oath-brand scar documented in the Archive. Kael's city name remained unspoken.`,
  ];
  const out: string[] = [];
  for (let i = 0; i < chapters; i += 1) {
    out.push(base[i % base.length].replace(/Chapter \d+/, `Chapter ${i + 1}`));
  }
  return out;
}
