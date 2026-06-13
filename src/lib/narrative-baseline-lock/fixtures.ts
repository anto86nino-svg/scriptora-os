import type { BookConfig } from "@/types/book";
import type { BaselineGenreFixture, BaselineGenreId } from "./types";

function baseConfig(genre: string, subcategory: string, bookTypeId?: string): BookConfig {
  return {
    title: "Baseline Test Book",
    subtitle: "",
    tone: "commercial",
    authorStyle: "default",
    language: "English",
    genre,
    category: "Fiction",
    subcategory,
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 12,
    subchaptersEnabled: false,
    bookTypeId,
  } as BookConfig;
}

export const BASELINE_GENRE_FIXTURES: BaselineGenreFixture[] = [
  {
    id: "gothic-thriller",
    label: "Gothic Thriller",
    config: baseConfig("gothic-thriller", "gothic thriller"),
    sampleText: `Nora did not know why the faceless statue had moved again.
Cold metal left a ring on her wrist while Elia knocked on the wrong door.
"Do not open it," someone whispered behind her, but the key was already in the lock.
Tomorrow she would learn who lied — if she survived the night.`,
    weakText: `The rain fell on the village for days. It was a normal day and everything seemed calm.
Nora felt sad because her past taught her everything. She understood her trauma and was finally vulnerable.
At the end everything was fine and they went home in peace as best friends.`,
  },
  {
    id: "romance-slow-burn",
    label: "Romance Slow Burn",
    config: baseConfig("dark-romance", "slow burn romance"),
    sampleText: `Sara did not answer when Marco said her name — only the glass shook on the table.
A second of silence was enough to show she feared being chosen for real.
"Not today," she murmured, avoiding his eyes, but her fingers stayed on his wrist one beat too long.
Tomorrow she would have to tell the lie that was already protecting them both.`,
    weakText: `It was a beautiful morning. Marco woke up and thought he loved Sara.
Sara understood everything perfectly and said everything was fine between them.
In conclusion they were happy and everything was resolved. I love you without fear.`,
  },
  {
    id: "fantasy",
    label: "Fantasy",
    config: baseConfig("fantasy", "epic fantasy"),
    sampleText: `The rune on the hilt glowed only when Lyra lied — and this time she lied to herself.
The river did not reflect the sky: it reflected a city that did not exist yet.
A black leaf fell on the map and shifted the kingdom's border before anyone could stop it.
Before dawn, someone would pay for what they had awakened.`,
    weakText: `The kingdom was very beautiful and magical. The hero walked in the dark forest.
He thought the mission would be easy. In the end everything went well.`,
  },
  {
    id: "thriller",
    label: "Thriller",
    config: baseConfig("thriller", "psychological thriller"),
    sampleText: `The message arrived at 2:14 a.m. — one word, no sender: RUN.
Detective Cole recognized the handwriting before he recognized the threat.
The witness had lied in court, and now the lie was walking back through his kitchen door.
He still did not know who had copied the key.`,
    weakText: `It was a quiet evening in the city. The detective drank coffee and thought about the case.
Later he felt better and the case seemed solved. Everything was okay.`,
  },
  {
    id: "self-help",
    label: "Self Help",
    config: baseConfig("self-help", "productivity"),
    sampleText: `Seventy-three percent of people fail this step within two weeks — not from lack of motivation, but from confusing urgency with priority.
Use this tomorrow morning: one twelve-second question before opening your inbox.
If you do not measure this mistake today, you will repeat the same cycle on Saturday.`,
    weakText: `In this chapter we will discuss the importance of productivity.
Productivity is important for everyone. In conclusion, remember to be productive every day.
Everything was fine and you must heal by being vulnerable with yourself.`,
  },
  {
    id: "study-book",
    label: "Study Book",
    config: baseConfig("education", "history", "history-school"),
    sampleText: `By 1848, three forces collided: industrial wages, nationalist pamphlets, and failed harvests.
Students should note the sequence: economic pressure first, then political language, then street action.
The exam trap is memorizing dates without causality — always ask what changed the day before.`,
    weakText: `In this chapter we will explore history in a very interesting and general way.
History is important because it is interesting for students everywhere.
I completely understand that learning is hard, but everything was fine once you accept it.`,
  },
  {
    id: "manual",
    label: "Manuale",
    config: baseConfig("manual", "practical guide", "manual"),
    sampleText: `Prerequisites: firmware 2.4+, admin access, backup completed.
Step 1: Open Settings → Advanced → Recovery.
Step 2: Disable auto-sync before changing the API key.
Warning: skipping the backup will corrupt active sessions.
If the panel shows error E-17, restart the service and repeat Step 2 only.`,
    weakText: `This manual explains many things about the product in a general way.
Please read carefully and try to understand all the features over time.`,
  },
  {
    id: "memoir",
    label: "Memoir",
    config: baseConfig("memoir", "personal narrative"),
    sampleText: `My father never called it fear. He called it "being careful," and careful meant never finishing a sentence.
I learned the rule at nine: if you tell the truth too early, someone else pays for it.
The kitchen light is still the only thing I trust from that house.
I have not told my sister what I found in the drawer.`,
    weakText: `My life has been a beautiful journey of growth and healing.
I understood my trauma and now I am finally vulnerable and everything is okay.`,
  },
];

export function getBaselineFixture(id: BaselineGenreId): BaselineGenreFixture {
  const fixture = BASELINE_GENRE_FIXTURES.find((entry) => entry.id === id);
  if (!fixture) throw new Error(`Unknown baseline fixture: ${id}`);
  return fixture;
}
