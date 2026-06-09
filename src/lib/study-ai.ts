import { supabase } from "@/integrations/supabase/client";
import { analyzeStudyMaterial, type StudySessionResult } from "@/lib/study-session";

interface GenerateStudySessionAIInput {
  text: string;
  sourceName: string;
  language?: "Italian" | "English" | "Spanish" | "French" | "German";
  level?: "soft" | "medium" | "pro";
}

function safeJsonParse(raw: string): any {
  const clean = String(raw || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
    throw new Error("Risposta AI non leggibile.");
  }
}

function normalizeString(value: unknown, fallback = ""): string {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter(Boolean) as T[] : [];
}

function normalizeStudyResult(parsed: any, fallback: StudySessionResult): StudySessionResult {
  const difficulty = parsed?.difficulty === "soft" || parsed?.difficulty === "medium" || parsed?.difficulty === "pro"
    ? parsed.difficulty
    : fallback.difficulty;

  const difficultWords = normalizeArray<any>(parsed?.difficultWords).slice(0, 14).map((item) => ({
    word: normalizeString(item?.word, "Termine"),
    simple: normalizeString(item?.simple, "Spiegazione semplice non disponibile."),
    technical: normalizeString(item?.technical, "Spiegazione tecnica non disponibile."),
    example: normalizeString(item?.example, "Prova a usare questo termine in una frase tua."),
  }));

  const flashcards = normalizeArray<any>(parsed?.flashcards).slice(0, 16).map((item) => ({
    front: normalizeString(item?.front, "Domanda"),
    back: normalizeString(item?.back, "Risposta"),
  }));

  const openQuestions = normalizeArray<any>(parsed?.openQuestions).slice(0, 10).map((item) => ({
    question: normalizeString(item?.question, "Domanda aperta"),
    answerGuide: normalizeString(item?.answerGuide, "Rispondi definendo il concetto, spiegandolo e collegandolo al tema centrale."),
  }));

  const quiz = normalizeArray<any>(parsed?.quiz).slice(0, 12).map((item) => {
    const options = normalizeArray<string>(item?.options).map((option) => String(option || "").trim()).filter(Boolean).slice(0, 4);
    const answer = Number.isFinite(Number(item?.answer)) ? Number(item.answer) : 0;
    return {
      question: normalizeString(item?.question, "Domanda di verifica"),
      options: options.length === 4 ? options : ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
      answer: Math.max(0, Math.min(3, answer)),
      explanation: normalizeString(item?.explanation, "Rileggi il concetto nel riassunto Pro."),
    };
  });

  const keyConcepts = normalizeArray<string>(parsed?.keyConcepts)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 16);

  return {
    ...fallback,
    title: normalizeString(parsed?.title, fallback.title),
    detectedSubject: normalizeString(parsed?.detectedSubject, fallback.detectedSubject),
    difficulty,
    lightSummary: normalizeString(parsed?.lightSummary, fallback.lightSummary),
    mediumSummary: normalizeString(parsed?.mediumSummary, fallback.mediumSummary),
    proSummary: normalizeString(parsed?.proSummary, fallback.proSummary),
    studyNotesPro: normalizeString(parsed?.studyNotesPro, fallback.studyNotesPro),
    openQuestions: openQuestions.length ? openQuestions : fallback.openQuestions,
    difficultWords: difficultWords.length ? difficultWords : fallback.difficultWords,
    flashcards: flashcards.length ? flashcards : fallback.flashcards,
    quiz: quiz.length ? quiz : fallback.quiz,
    keyConcepts: keyConcepts.length ? keyConcepts : fallback.keyConcepts,
  };
}

function trimStudyInput(text: string): string {
  const clean = String(text || "").trim();
  if (clean.length <= 36000) return clean;

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 80);

  if (paragraphs.length < 12) {
    return `${clean.slice(0, 22000)}\n\n[...sezione centrale compressa automaticamente da Scriptora Study OS...]\n\n${clean.slice(-12000)}`;
  }

  const picked: string[] = [];
  const slots = 18;
  for (let i = 0; i < slots; i++) {
    const index = Math.min(paragraphs.length - 1, Math.floor((i / Math.max(1, slots - 1)) * (paragraphs.length - 1)));
    const paragraph = paragraphs[index];
    if (paragraph && !picked.includes(paragraph)) picked.push(paragraph);
  }

  return [
    "[SCRIPTORA STUDY OS — CAMPIONAMENTO INTELLIGENTE DOCUMENTO LUNGO]",
    "Il documento originale è lungo. Questo estratto conserva apertura, sviluppo centrale e chiusura per evitare riassunti basati solo sull'inizio e sulla fine.",
    "",
    ...picked.map((part, index) => `--- BLOCCO ${index + 1} ---\n${part.slice(0, 1800)}`),
  ].join("\n\n").slice(0, 38000);
}

async function callScriptoraStudyAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-book`;

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Configurazione Supabase mancante.");
  }

  const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
  const bearer = sessionData?.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Authorization": `Bearer ${bearer}`,
    },
    body: JSON.stringify({
      systemPrompt,
      userPrompt,
      taskType: "study_session",
      projectId: null,
      userId: sessionData?.session?.user?.id || null,
      metadata: {
        feature: "study_session",
        mode: "deepseek",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `AI Studio non disponibile (${res.status}).`);
  }

  if (!res.body) throw new Error("Stream AI non disponibile.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }

  const marker = buffer.lastIndexOf("__RESULT__");
  if (marker === -1) throw new Error("Risposta AI vuota o incompleta.");

  const jsonStr = buffer.slice(marker + "__RESULT__".length).trim();
  const parsed = JSON.parse(jsonStr);

  if (parsed.error) throw new Error(parsed.error);
  if (!parsed.content) throw new Error("DeepSeek non ha restituito contenuto.");

  return parsed.content;
}

export async function generateStudySessionWithAI(input: GenerateStudySessionAIInput): Promise<StudySessionResult> {
  const fallback = analyzeStudyMaterial(input.text, input.sourceName);
  const language = input.language || "Italian";
  const level = input.level || fallback.difficulty || "medium";
  const material = trimStudyInput(input.text);

  const systemPrompt = `You are Scriptora Study OS, an elite academic tutor.

You transform study material into clear, exam-ready learning assets.

LANGUAGE RULE:
Respond entirely in ${language}. No English unless the uploaded material itself requires a quoted term.

OUTPUT RULE:
Return ONLY valid JSON. No markdown. No commentary outside JSON.

QUALITY RULES:
- Do NOT make summaries too short. This is for real studying, not a marketing blurb.
- Light summary: simple language, but still cover all major sections and the central message. Minimum 180-260 words when material is long.
- Medium summary: structured, ordered, complete. Include main ideas, chapter/section progression, cause-effect links, and practical meaning. Minimum 350-550 words when material is long.
- Pro summary: exam/interrogation-ready. Deep, detailed, organized by concepts, with connections, key arguments, mechanisms, examples, and what the student must remember. Minimum 700-1000 words when material is long.
- Study Notes Pro: create a complete study handout, not a short summary. Include conceptual map, key ideas, section progression, cause/effect links, what to memorize, what to explain orally, common traps, and exam-style preparation. Minimum 900-1400 words when material is long.
- Open questions: create deep written/oral exam questions with answer guides.
- Difficult words: explain simple meaning, technical meaning, and give concrete example.
- Flashcards: useful for active recall, not generic.
- Quiz: create challenging multiple-choice questions. Include answer index 0-3 and explanation.
- Do not invent facts not present in the material.
- If the material is sampled because too long, still cover all detected major areas and do not say "chapters omitted" unless truly necessary.
- Prefer clarity over elegance. The student must be able to study from this output.`;

  const userPrompt = `Create a professional study session from this material.

Desired level: ${level}
Source name: ${input.sourceName}

Return this JSON shape exactly:
{
  "title": "string",
  "detectedSubject": "string",
  "difficulty": "soft | medium | pro",
  "lightSummary": "string",
  "mediumSummary": "string",
  "proSummary": "string",
  "studyNotesPro": "string",
  "openQuestions": [
    {
      "question": "string",
      "answerGuide": "string"
    }
  ],
  "difficultWords": [
    {
      "word": "string",
      "simple": "string",
      "technical": "string",
      "example": "string"
    }
  ],
  "flashcards": [
    {
      "front": "string",
      "back": "string"
    }
  ],
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": 0,
      "explanation": "string"
    }
  ],
  "keyConcepts": ["string"]
}

QUIZ REQUIREMENTS:
Create at least 10 multiple-choice questions when the material is long.
Questions must test understanding, not just memory.
Mix:
- definition questions
- cause/effect questions
- concept comparison
- application to real examples
- "what does the author mean by..." questions

MATERIAL:
${material}`;

  const raw = await callScriptoraStudyAI(systemPrompt, userPrompt);
  const parsed = safeJsonParse(raw);
  return normalizeStudyResult(parsed, fallback);
}
