import type { BookCharacter } from "@/types/book";

const FREE_REGENS_KEY = "scriptora-wizard-character-free-regens";
export const WIZARD_CHARACTER_FREE_REGENS = 3;

const FIRST_NAMES = ["Livia", "Marco", "Elena", "Nico", "Sara", "Luca", "Giada", "Tommaso", "Noemi", "Andrea"];
const SURNAMES = ["Rossi", "Conti", "Marchetti", "Serra", "Fontana", "Galli", "Moretti", "Bianchi", "Ferri", "Costa"];
const ROLES = [
  "Protagonista in trasformazione",
  "Antagonista emotivo",
  "Alleato con agenda nascosta",
  "Mentore ambiguo",
  "Rivale che conosce metà della verità",
];
const WOUNDS = [
  "Ha perso fiducia dopo un tradimento che non ha mai confessato.",
  "Porta la colpa di una scelta che ha protetto qualcuno sbagliato.",
  "Cresciuto credendo di dover meritare ogni affetto.",
  "Ha imparato a controllare tutto per non rivivere un abbandono.",
];
const DESIRES = [
  "Ricominciare senza dover spiegare il passato.",
  "Ottenere riconoscimento senza perdere se stesso.",
  "Trovare una verità che renda senso alle sue scelte.",
  "Proteggere ciò che ama prima che sia troppo tardi.",
];
const SECRETS = [
  "Nasconde un legame con un evento che nessuno collega a lui.",
  "Ha mentito su un dettaglio che cambierebbe tutto.",
  "Sa più di quanto mostri, ma teme le conseguenze.",
  "Custodisce una lettera o un oggetto che riaprirebbe una ferita antica.",
];
const CONFLICTS = [
  "Vuole avvicinarsi e allo stesso tempo fuggire.",
  "Deve scegliere tra sicurezza e verità.",
  "È diviso tra lealtà familiare e desiderio personale.",
  "Combatte il bisogno di controllo contro il bisogno di essere visto.",
];
const ARCS = [
  "Da difesa a vulnerabilità consapevole.",
  "Da evasione a responsabilità emotiva.",
  "Da solitudine scelta a fiducia graduale.",
  "Da rigidità a accettazione del rischio.",
];
const VOICES = [
  "Frasi brevi, osservazione concreta, ironia trattenuta.",
  "Lirica contenuta, pause lunghe, dialoghi con sottotesto.",
  "Diretto, sensoriale, poche metafore ma immagini forti.",
  "Calmo in superficie, tensione sotto ogni risposta breve.",
];
const FLAWS = [
  "Mente quando la verità costa troppo.",
  "Si irrigidisce appena qualcuno si avvicina davvero.",
  "Confonde controllo con protezione.",
  "Rimanda le conversazioni decisive fino a farle esplodere.",
];
const FEARS = [
  "Essere abbandonato nel momento più vulnerabile.",
  "Scoprire di non essere amato per chi è davvero.",
  "Perdere tutto ciò che ha costruito con una sola confessione.",
  "Ripetere un errore che ha già distrutto una famiglia.",
];

function hashSeed(input: string): number {
  return Array.from(input).reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function pick<T>(list: T[], seed: number, offset = 0): T {
  return list[(seed + offset) % list.length];
}

export function getWizardCharacterFreeRegensRemaining(): number {
  if (typeof window === "undefined") return WIZARD_CHARACTER_FREE_REGENS;
  try {
    const raw = sessionStorage.getItem(FREE_REGENS_KEY);
    if (raw === null) return WIZARD_CHARACTER_FREE_REGENS;
    const used = Number(raw);
    if (!Number.isFinite(used)) return WIZARD_CHARACTER_FREE_REGENS;
    return Math.max(0, WIZARD_CHARACTER_FREE_REGENS - used);
  } catch {
    return WIZARD_CHARACTER_FREE_REGENS;
  }
}

export function consumeWizardCharacterFreeRegen(): number {
  const remainingBefore = getWizardCharacterFreeRegensRemaining();
  if (remainingBefore <= 0) return 0;
  try {
    const used = WIZARD_CHARACTER_FREE_REGENS - remainingBefore + 1;
    sessionStorage.setItem(FREE_REGENS_KEY, String(used));
  } catch { /* noop */ }
  return getWizardCharacterFreeRegensRemaining();
}

export function generateWizardCharacter(seedInput: string): BookCharacter {
  const seed = hashSeed(seedInput || String(Date.now()));
  const name = `${pick(FIRST_NAMES, seed)} ${pick(SURNAMES, seed, 3)}`;
  const conflict = pick(CONFLICTS, seed, 1);
  const arc = pick(ARCS, seed, 2);
  const voice = pick(VOICES, seed, 4);
  const flaw = pick(FLAWS, seed, 5);
  const fear = pick(FEARS, seed, 6);

  return {
    name,
    role: pick(ROLES, seed),
    wound: pick(WOUNDS, seed),
    externalDesire: pick(DESIRES, seed),
    secret: pick(SECRETS, seed),
    personality: `Conflitto: ${conflict}\nArco: ${arc}\nVoce: ${voice}\nDifetto: ${flaw}\nPaura: ${fear}`,
    strictRules: `Non rinominare mai ${name}. Mantieni ferita, desiderio, segreto e arco emotivo coerenti in ogni capitolo.`,
  };
}
