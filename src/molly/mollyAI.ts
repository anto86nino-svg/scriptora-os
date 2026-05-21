import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserId } from "@/services/storageService";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const PERSONALITY_REPLIES = [
  "Mhm. Tell me more.",
  "I'm listening.",
  "Woof. Go on.",
  "Say more.",
  "I felt that.",
  "Tail wags.",
];

export function looksLikeQuestion(text: string): boolean {
  const t = text.trim();
  if (t.endsWith("?")) return true;
  return /^(what|why|how|who|when|where|can|do|does|is|are|should|could|would|tell me|explain)\b/i.test(t);
}

export function localPersonalityReply(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(hi|hello|hey|ciao|yo)\b/.test(lower)) return "Hey, you. 🐾";
  if (/\b(love|miss|thank)\b/.test(lower)) return "That bonded us a little.";
  if (/\b(sad|tired|lost|stuck)\b/.test(lower)) return "I'm here. Write through it.";
  if (/\b(book|chapter|writ|story)\b/.test(lower)) return "Show me a line. I want to read it.";
  if (lower.length < 6) return "Say more.";
  return PERSONALITY_REPLIES[Math.floor(Math.random() * PERSONALITY_REPLIES.length)];
}

export async function askMolly(
  message: string,
  history: ChatTurn[],
  mood: string,
  bond: number,
): Promise<string> {
  // Only call the AI for actual questions; otherwise reply locally.
  if (!looksLikeQuestion(message)) {
    return localPersonalityReply(message);
  }

  try {
    const { data, error } = await supabase.functions.invoke("molly-chat", {
      body: { message, history, mood, bond, userId: getCurrentUserId() },
    });
    if (error) throw error;
    const payload = data as { reply?: string; error?: string };
    if (payload?.error) throw new Error(payload.error);
    if (!payload?.reply) return "…paws thinking.";
    return payload.reply;
  } catch (e) {
    console.error("[Molly] AI error", e);
    return "My brain's a bit fuzzy right now. Try again?";
  }
}
