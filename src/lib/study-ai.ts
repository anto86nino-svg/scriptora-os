import { supabase } from "@/integrations/supabase/client";
import {
  analyzeStudyMaterial,
  sanitizeStudyOpenQuestions,
  sanitizeStudySessionResult,
  scoreStudySessionQuality,
  type StudyIntentSettings,
  type StudySessionResult,
} from "@/lib/study-session";

interface GenerateStudySessionAIInput {
  text: string;
  sourceName: string;
  language?: "Italian" | "English" | "Spanish" | "French" | "German";
  level?: "soft" | "medium" | "pro";
  intent?: StudyIntentSettings;
}

export const STUDY_AI_TIMEOUT_MS = 240_000;

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

function humanizeStudyAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/abort|timeout|timed out|tempo/i.test(message)) {
    return "L'AI sta impiegando troppo tempo. Preparo una sessione locale sicura.";
  }
  if (/failed to fetch|network|cors|load failed|internet|raggiungibile/i.test(message)) {
    return "Motore AI Study non raggiungibile. Creo una sessione locale.";
  }
  if (/^ai error\b|ai studio|provider|500|502|503|504/i.test(message)) {
    return "Il motore AI non ha risposto correttamente. Creo una sessione locale.";
  }
  return message || "AI Study non disponibile. Creo una sessione locale.";
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
    school: normalizeString(item?.school, ""),
    advanced: normalizeString(item?.advanced, ""),
    precise: normalizeString(item?.precise, item?.technical || ""),
    newExample: normalizeString(item?.newExample, ""),
    synonyms: normalizeArray<string>(item?.synonyms).slice(0, 4),
    antonyms: normalizeArray<string>(item?.antonyms).slice(0, 4),
    commonMistake: normalizeString(item?.commonMistake, ""),
    examQuestion: normalizeString(item?.examQuestion, ""),
    connections: normalizeArray<string>(item?.connections).slice(0, 6),
    importance: item?.importance === "alto" || item?.importance === "medio" || item?.importance === "basso" ? item.importance : undefined,
  }));

  const flashcards = normalizeArray<any>(parsed?.flashcards).slice(0, 16).map((item) => ({
    front: normalizeString(item?.front, "Domanda"),
    back: normalizeString(item?.back, "Risposta"),
    type: item?.type,
    level: item?.level,
    category: normalizeString(item?.category, ""),
    example: normalizeString(item?.example, ""),
    commonMistake: normalizeString(item?.commonMistake, ""),
  }));

  const openQuestions = normalizeArray<any>(parsed?.openQuestions).slice(0, 10).map((item) => ({
    question: normalizeString(item?.question, "Domanda aperta"),
    answerGuide: normalizeString(item?.answerGuide, "Rispondi definendo il concetto, spiegandolo e collegandolo al tema centrale."),
  }));

  const quiz = normalizeArray<any>(parsed?.quiz).slice(0, 12).map((item) => {
    const options = normalizeArray<string>(item?.options).map((option) => String(option || "").trim()).filter(Boolean).slice(0, 4);
    const answer = Number.isFinite(Number(item?.answer)) ? Number(item.answer) : 0;
    const diff = item?.difficulty === "easy" || item?.difficulty === "medium" || item?.difficulty === "hard"
      ? item.difficulty
      : undefined;
    return {
      question: normalizeString(item?.question, "Domanda di verifica"),
      options: options.length === 4 ? options : ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
      answer: Math.max(0, Math.min(3, answer)),
      explanation: normalizeString(item?.explanation, "Rileggi il concetto nel riassunto Pro."),
      difficulty: diff,
      memoryTrick: normalizeString(item?.memoryTrick, ""),
      commonMistake: normalizeString(item?.commonMistake, ""),
      type: item?.type,
      sourceReference: normalizeString(item?.sourceReference, ""),
      testedSkill: normalizeString(item?.testedSkill, ""),
      learningLevel: ["memory", "understanding", "application", "exam", "professor"].includes(item?.learningLevel)
        ? item.learningLevel
        : undefined,
    };
  });

  const keyConcepts = normalizeArray<string>(parsed?.keyConcepts)
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 16);

  const trueFalse = normalizeArray<any>(parsed?.trueFalse).slice(0, 8).map((item) => {
    const options = normalizeArray<string>(item?.options).map((option) => String(option || "").trim()).filter(Boolean).slice(0, 4);
    return {
      question: normalizeString(item?.question, "Domanda vero/falso"),
      options: options.length >= 2 ? options : ["Vero", "Falso", "Non determinabile", "Solo in parte"],
      answer: Math.max(0, Math.min(3, Number.isFinite(Number(item?.answer)) ? Number(item.answer) : 0)),
      explanation: normalizeString(item?.explanation, "Rileggi il concetto nel riassunto."),
      difficulty: item?.difficulty === "easy" || item?.difficulty === "medium" || item?.difficulty === "hard" ? item.difficulty : "easy",
    };
  });

  const exercises = normalizeArray<any>(parsed?.exercises).slice(0, 8).map((item, index) => ({
    id: normalizeString(item?.id, `ai-exercise-${index}`),
    type: ["guided", "free", "correction", "application", "reasoning"].includes(item?.type) ? item.type : "guided",
    prompt: normalizeString(item?.prompt, "Esercizio sul materiale"),
    solution: normalizeString(item?.solution, ""),
    explanation: normalizeString(item?.explanation, "Esercizio generato dal materiale."),
    difficulty: item?.difficulty === "easy" || item?.difficulty === "medium" || item?.difficulty === "hard" ? item.difficulty : "medium",
  }));

  const summaries = parsed?.summaries && typeof parsed.summaries === "object"
    ? { ...fallback.summaries, ...parsed.summaries }
    : fallback.summaries;

  const normalizedClassification = parsed?.classification && typeof parsed.classification === "object"
    ? { ...fallback.classification, ...parsed.classification }
    : fallback.classification;
  const learningPackage = parsed?.learningPackage && typeof parsed.learningPackage === "object"
    ? { ...fallback.learningPackage, ...parsed.learningPackage }
    : fallback.learningPackage;
  const knowledgeMap = Array.isArray(parsed?.knowledgeMap) ? parsed.knowledgeMap : fallback.knowledgeMap;
  const adaptiveCoach = parsed?.adaptiveCoach && typeof parsed.adaptiveCoach === "object"
    ? { ...fallback.adaptiveCoach, ...parsed.adaptiveCoach }
    : fallback.adaptiveCoach;
  const narrativeLock = fallback.contentType === "narrative_fiction";
  const fallbackQuestions = fallback.openQuestions || [];
  const safeOpenQuestions = sanitizeStudyOpenQuestions(openQuestions, fallbackQuestions);

  return {
    ...fallback,
    title: normalizeString(parsed?.title, fallback.title),
    contentType: narrativeLock ? "narrative_fiction" : normalizeString(parsed?.contentType, fallback.contentType) as StudySessionResult["contentType"],
    subjectLabel: narrativeLock ? "Narrativa / Letteratura" : normalizeString(parsed?.subjectLabel, fallback.subjectLabel),
    studyMode: narrativeLock ? "Analisi narrativa" : normalizeString(parsed?.studyMode, fallback.studyMode),
    detectedSubject: narrativeLock ? "Narrativa / Letteratura" : normalizeString(parsed?.detectedSubject, fallback.detectedSubject),
    difficulty,
    classification: narrativeLock
      ? {
          ...normalizedClassification,
          type: "literature",
          label: "Narrativa / Letteratura",
          contentType: "narrative_fiction",
          subjectLabel: "Narrativa / Letteratura",
          mode: "Analisi narrativa",
        }
      : normalizedClassification,
    summaries,
    lightSummary: normalizeString(parsed?.lightSummary, fallback.lightSummary),
    mediumSummary: normalizeString(parsed?.mediumSummary, fallback.mediumSummary),
    proSummary: normalizeString(parsed?.proSummary, fallback.proSummary),
    studyNotesPro: normalizeString(parsed?.studyNotesPro, fallback.studyNotesPro),
    openQuestions: safeOpenQuestions.length ? safeOpenQuestions : fallback.openQuestions,
    difficultWords: difficultWords.length ? difficultWords : fallback.difficultWords,
    flashcards: flashcards.length ? flashcards : fallback.flashcards,
    quiz: quiz.length ? quiz : fallback.quiz,
    trueFalse: trueFalse.length ? trueFalse : fallback.trueFalse,
    exercises: exercises.length ? exercises : fallback.exercises,
    conceptMap: parsed?.conceptMap && typeof parsed.conceptMap === "object" ? parsed.conceptMap : fallback.conceptMap,
    learningPackage,
    knowledgeMap,
    adaptiveCoach,
    keyConcepts: keyConcepts.length ? keyConcepts : fallback.keyConcepts,
    studyMaterialType: parsed?.studyMaterialType || fallback.studyMaterialType,
    studySubject: parsed?.studySubject || fallback.studySubject,
    literaryGenre: parsed?.literaryGenre || fallback.literaryGenre,
    studyGoal: parsed?.studyGoal || fallback.studyGoal,
    difficultyLevel: parsed?.difficultyLevel || fallback.difficultyLevel,
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
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), STUDY_AI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
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
      signal: controller.signal,
    });
  } catch (error) {
    console.warn("[StudySession] AI network unavailable", error);
    throw new Error(humanizeStudyAiError(error));
  } finally {
    window.clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(humanizeStudyAiError(text || `provider unavailable ${res.status}`));
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
  if (marker === -1) {
    const parsed = safeJsonParse(buffer);
    if (parsed?.error) throw new Error(humanizeStudyAiError(parsed.error));
    if (typeof parsed?.content === "string" && parsed.content.trim()) return parsed.content;
    return JSON.stringify(parsed);
  }

  const jsonStr = buffer.slice(marker + "__RESULT__".length).trim();
  const parsed = JSON.parse(jsonStr);

  if (parsed.error) throw new Error(humanizeStudyAiError(parsed.error));
  if (!parsed.content) throw new Error("Scriptora non ha restituito contenuto.");

  return parsed.content;
}


export type StudyMaterialScale = "short" | "medium" | "long" | "huge";

export function countStudyDigestWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getStudyMaterialScale(text: string): StudyMaterialScale {
  const wordCount = countStudyDigestWords(text);
  if (wordCount > 60000 || text.length > 320000) return "huge";
  if (wordCount > 12000 || text.length > 70000) return "long";
  if (wordCount > 8000 || text.length > 45000) return "medium";
  return "short";
}

function uniqueStudyLines(lines: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 8) continue;

    const signature = line.toLowerCase().slice(0, 180);
    if (seen.has(signature)) continue;

    seen.add(signature);
    out.push(line);
    if (out.length >= limit) break;
  }

  return out;
}

function splitStudyDigestSections(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n{2,}|(?=\b(?:Chapter|Capitolo)\s+\d+\b)|(?=✦\s+)/gi)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length >= 120);
}

function detectStudyDigestHeadings(text: string): string[] {
  const headingRegex = /(?:^|\n|\s)(Chapter\s+\d+\s*[—:-][^\n]{0,120}|Capitolo\s+\d+\s*[—:-][^\n]{0,120}|Parte\s+\d+[^\n]{0,120}|Sezione\s+\d+[^\n]{0,120}|✦\s*[^\n]{3,120})/gi;
  const matches = Array.from(text.matchAll(headingRegex)).map((match) => String(match[1] || "").trim());
  return uniqueStudyLines(matches, 80);
}

function sampleStudyDigestSections(sections: string[], maxSections: number): string[] {
  if (sections.length <= maxSections) return sections;

  const picked: string[] = [];
  const add = (section?: string) => {
    if (!section) return;
    if (!picked.some((item) => item.slice(0, 180) === section.slice(0, 180))) picked.push(section);
  };

  sections.slice(0, Math.ceil(maxSections * 0.35)).forEach(add);

  const middleStart = Math.max(0, Math.floor(sections.length / 2) - Math.ceil(maxSections * 0.15));
  sections.slice(middleStart, middleStart + Math.ceil(maxSections * 0.30)).forEach(add);

  sections.slice(Math.max(0, sections.length - Math.ceil(maxSections * 0.35))).forEach(add);

  return picked.slice(0, maxSections);
}

export function buildLongStudyDigest(text: string, sourceName: string): string {
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const wordCount = countStudyDigestWords(clean);
  const scale = getStudyMaterialScale(clean);
  const maxChars = scale === "huge" ? 65000 : 55000;

  const headings = detectStudyDigestHeadings(clean);
  const sections = splitStudyDigestSections(clean);
  const practicalSections = uniqueStudyLines(
    sections.filter((section) => section.includes("✦") || /practice|pratica|esercizio|protocol|rule|ritual|audit|filter/i.test(section)),
    scale === "huge" ? 26 : 18,
  );

  const sampledSections = sampleStudyDigestSections(sections, scale === "huge" ? 32 : 24).map((section, index) => {
    const maxSectionChars = scale === "huge" ? 1600 : 1900;
    return `--- SEZIONE RAPPRESENTATIVA ${index + 1} ---\n${section.slice(0, maxSectionChars)}`;
  });

  const opening = clean.slice(0, scale === "huge" ? 9000 : 11000);
  const middleStart = Math.max(0, Math.floor(clean.length / 2) - (scale === "huge" ? 5000 : 6500));
  const middle = clean.slice(middleStart, middleStart + (scale === "huge" ? 10000 : 13000));
  const ending = clean.slice(-(scale === "huge" ? 9000 : 11000));

  const digest = [
    `SCRIPTORA STUDY OS — DIGEST MATERIALE ${scale.toUpperCase()}`,
    `Fonte: ${sourceName}`,
    `Parole stimate nel materiale originale: ${wordCount.toLocaleString("it-IT")}`,
    scale === "huge"
      ? "Modalità: documento enorme. Questo digest serve per creare una prima overview, indice intelligente, piano studio e domande generali. Gli approfondimenti completi vanno generati per capitolo/sezione."
      : "Modalità: materiale lungo. Questo digest rappresentativo serve per creare una sessione studio completa sui nuclei principali senza inviare tutto il documento grezzo.",
    "",
    "ISTRUZIONI PER L'ANALISI:",
    "- Non inventare contenuti non presenti.",
    "- Se il documento è huge, produci una overview professionale, un piano studio a blocchi e domande sui nuclei principali.",
    "- Se il documento è long, produci riassunti per capitoli/sezioni e collegamenti tra temi ricorrenti.",
    "- Specifica che l'analisi è ottimizzata sui nuclei principali quando necessario.",
    "",
    "INDICE / TITOLI RILEVATI:",
    headings.length ? headings.map((heading) => `- ${heading}`).join("\n") : "- Nessun indice esplicito rilevato; usa i campioni rappresentativi.",
    "",
    "SEZIONI PRATICHE / HEADING SPECIALI RILEVANTI:",
    practicalSections.length ? practicalSections.map((section, index) => `--- BLOCCO PRATICO ${index + 1} ---\n${section.slice(0, 1200)}`).join("\n\n") : "- Non specificate nel materiale.",
    "",
    "INIZIO DEL MATERIALE:",
    opening,
    "",
    "CAMPIONE CENTRALE DEL MATERIALE:",
    middle,
    "",
    "FINE DEL MATERIALE:",
    ending,
    "",
    "CAMPIONI RAPPRESENTATIVI PER STRUTTURA:",
    sampledSections.join("\n\n"),
  ].join("\n\n");

  return digest.slice(0, maxChars);
}


export async function generateStudySessionWithAI(input: GenerateStudySessionAIInput): Promise<StudySessionResult> {
  const fallback = analyzeStudyMaterial(input.text, input.sourceName, input.intent);
  const language = input.language || "Italian";
  const level = input.level || fallback.difficulty || "medium";
  const difficultyLevel = input.intent?.difficultyLevel || fallback.difficultyLevel || 3;
  const materialScale = getStudyMaterialScale(input.text);
  const isLongOrHugeMaterial = materialScale === "long" || materialScale === "huge";
  const material = isLongOrHugeMaterial
    ? buildLongStudyDigest(input.text, input.sourceName)
    : trimStudyInput(input.text);
  const intentBlock = `STUDY INTENT:
- Manual material type: ${input.intent?.studyMaterialType || "auto"}
- Manual subject: ${input.intent?.studySubject || "auto"}
- Literary/editorial genre: ${input.intent?.literaryGenre || "auto"}
- Study goal: ${input.intent?.studyGoal || "complete_summary"}
- Difficulty level 1-5: ${difficultyLevel}
- Manual choices have priority unless the material is clearly contradictory.
- If material type is narrative_manuscript, classify as narrative_fiction/Narrativa-Letteratura even if contract/property/clause keywords appear.
- If subject is law and the material is a true contract/statute/legal explanation, use legal_document/Diritto.
- Difficulty level must change the quiz, flashcards, oral exam and explanations.`;

  const systemPrompt = `You are Scriptora Study OS, an elite academic tutor.

You transform study material into clear, exam-ready learning assets.

LANGUAGE RULE:
Respond entirely in ${language}. No English unless the uploaded material itself requires a quoted term.

OUTPUT RULE:
Return ONLY valid JSON. No markdown. No commentary outside JSON.

QUALITY RULES:
- First detect contentType before subject: narrative_fiction, study_notes, textbook, essay, legal_document, mixed_or_unknown.
- Also support scientific_material, math_material, historical_material, literary_analysis and poetry when the material or manual intent requires it.
- If the material is structurally narrative fiction (chapter, named characters, dialogue, scenes, setting, emotional tension, plot progression), classify it as narrative_fiction and "Narrativa / Letteratura" even if it contains legal words like contract, clause, property or signature.
- Classify as law/legal_document only for true legal explanations, law notes, contracts/templates, statutes, proceedings or essays about law.
- For narrative_fiction use "Analisi narrativa": summary, characters, setting, conflict, themes, style, emotional arc, narrative tension and craft-aware comprehension questions.
- For legal_document use: object, parties, obligations, prohibitions, important clauses, risks/attention points, plain-language synthesis and verification questions.
- For narrative/manuscript use: narrative summary, characters, setting, conflict, emotional arc, narrative tension, symbols/recurring objects, open promises, weak points and craft-aware questions.
- Do NOT make summaries too short. This is for real studying, not a marketing blurb.
- Light summary: bullet-oriented, fast review, max 150-180 words. Simple school language. No walls of text.
- Medium summary: structured, ordered, complete. Include main ideas, chapter/section progression, cause-effect links, and practical meaning. Minimum 350-550 words when material is long.
- Pro summary: exam/interrogation-ready. Deep, detailed, organized by concepts, with connections, key arguments, mechanisms, examples, and what the student must remember. Minimum 700-1000 words when material is long.
- Study Notes Pro: structured study handout with clear section headers: "Concetti da sapere", "Cosa ricordare", "Trappole d'esame", "Collegamenti causa-effetto", "Interrogazione orale". Scannable bullets, not dense paragraphs.
- Open questions: create deep written/oral exam questions with answer guides.
- Difficult words: explain simple meaning, technical meaning, and give concrete example.
- Difficult words must be contextual dictionary entries: simple definition, school definition, advanced definition, example, common mistake and links to related concepts from the material.
- Flashcards: useful for active recall, not generic.
- Quiz: create challenging multiple-choice questions with PLAUSIBLE distractors (no joke answers). Include answer index 0-3, explanation, difficulty (easy|medium|hard), learningLevel (memory|understanding|application|exam|professor), memoryTrick, and commonMistake for each question.
- Exercises: guided, free, application and reasoning tasks with solution/explanation when appropriate.
- Concept map: nodes and relationships grounded in the material.
- Learning package: one processing pass must produce ultra brief summary, standard summary, deep summary, key concepts, common mistakes and likely exam questions.
- Knowledge map: estimate initial mastery areas from the generated assets, then specify what to review next. Do not claim the student has mastered a concept before quiz/oral evidence exists.
- Adaptive coach: provide nextAction, gaps, strengths and estimatedPassProbability as a conservative starting estimate.
- Do not invent facts not present in the material.
- If dates, names, formulas or definitions are not present, explicitly say "non specificato nel materiale".
- Never show undefined, null, [object Object], raw JSON, stack traces, placeholders or truncated questions.
- Internal quality target is 9/10. If an output section is mediocre, repair it before returning JSON.
- If the material is sampled because too long, still cover all detected major areas and do not say "chapters omitted" unless truly necessary.
- Prefer clarity over elegance. The student must be able to study from this output.`;

  const userPrompt = `Create a professional study session from this material.

Desired level: ${level}
Difficulty level 1-5: ${difficultyLevel}
Source name: ${input.sourceName}
Material scale: ${materialScale}
Original estimated words: ${countStudyDigestWords(input.text).toLocaleString("it-IT")}
AI material mode: ${isLongOrHugeMaterial ? "optimized_digest" : "full_or_trimmed_material"}

${isLongOrHugeMaterial ? `LONG/HUGE MATERIAL POLICY:
The original document is long. You receive an optimized representative digest created by Scriptora.
Produce a professional study session on the main nuclei, chapters, recurring themes, practical sections and detected progression.
For huge materials, do not pretend every page has been fully analyzed. Create a high-value overview, study plan by blocks, and general exam questions.
For long materials, structure summaries by detected chapters/sections and connect the key concepts.
Do not invent missing details.
` : ""}

${intentBlock}

Return this JSON shape exactly:
{
  "title": "string",
  "contentType": "narrative_fiction | study_notes | textbook | essay | legal_document | mixed_or_unknown",
  "subjectLabel": "string",
  "studyMode": "string",
  "detectedSubject": "string",
  "difficulty": "soft | medium | pro",
  "studyMaterialType": "${input.intent?.studyMaterialType || "auto"}",
  "studySubject": "${input.intent?.studySubject || "auto"}",
  "literaryGenre": "${input.intent?.literaryGenre || "auto"}",
  "studyGoal": "${input.intent?.studyGoal || "complete_summary"}",
  "difficultyLevel": ${difficultyLevel},
  "classification": {
    "type": "history | philosophy | literature | math | physics | chemistry | medicine | law | economics | computer-science | foreign-language | scientific-article | technical-manual | mixed-notes | general",
    "label": "string",
    "contentType": "narrative_fiction | study_notes | textbook | essay | legal_document | mixed_or_unknown",
    "subjectLabel": "string",
    "mode": "string",
    "confidence": 0,
    "language": "string",
    "difficultyScore": 0,
    "estimatedStudyMinutes": 0,
    "signals": ["string"],
    "strategy": ["string"]
  },
  "summaries": {
    "brief": "string",
    "complete": "string",
    "university": "string",
    "oral": "string",
    "ultraSimple": "string",
    "quickReview": "string",
    "chronological": "string",
    "causeEffect": "string",
    "bulletPoints": "string",
    "oralExam": "string"
  },
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
      "school": "string",
      "advanced": "string",
      "technical": "string",
      "example": "string",
      "commonMistake": "string",
      "examQuestion": "string",
      "connections": ["string"]
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
      "explanation": "string",
      "difficulty": "easy | medium | hard",
      "learningLevel": "memory | understanding | application | exam | professor",
      "memoryTrick": "string",
      "commonMistake": "string"
    }
  ],
  "trueFalse": [
    {
      "question": "string",
      "options": ["Vero", "Falso", "Non determinabile", "Solo in parte"],
      "answer": 0,
      "explanation": "string",
      "difficulty": "easy | medium | hard"
    }
  ],
  "exercises": [
    {
      "id": "string",
      "type": "guided | free | correction | application | reasoning",
      "prompt": "string",
      "solution": "string",
      "explanation": "string",
      "difficulty": "easy | medium | hard"
    }
  ],
  "conceptMap": {
    "title": "string",
    "nodes": [{"id": "string", "label": "string", "detail": "string", "level": 0}],
    "relations": [{"from": "string", "to": "string", "label": "string", "type": "hierarchy | cause-effect | prerequisite | contrast | example"}],
    "exportText": "string"
  },
  "learningPackage": {
    "summaryUltraBrief": "string",
    "summaryStandard": "string",
    "summaryDeep": "string",
    "keyConcepts": ["string"],
    "commonMistakes": ["string"],
    "examQuestions": ["string"]
  },
  "knowledgeMap": [
    {
      "concept": "string",
      "mastery": 0,
      "status": "strong | medium | weak",
      "reason": "string",
      "nextAction": "string"
    }
  ],
  "adaptiveCoach": {
    "currentLevel": "base | in_progress | exam_ready",
    "nextAction": "string",
    "gaps": ["string"],
    "strengths": ["string"],
    "estimatedPassProbability": 0,
    "knowledgeMap": [
      {
        "concept": "string",
        "mastery": 0,
        "status": "strong | medium | weak",
        "reason": "string",
        "nextAction": "string"
      }
    ]
  },
  "keyConcepts": ["string"]
}

QUIZ REQUIREMENTS:
Create at least 10 multiple-choice questions when the material is long, and up to 15 when difficultyLevel is 5.
Questions must test understanding, not just memory.
Wrong options must be plausible and educational — never obviously wrong or joke answers.
Adapt difficulty tiers to difficultyLevel:
- level 1: mostly easy, direct definitions and comprehension.
- level 3: balanced school verification, cause/effect and comparison.
- level 5: hard commission-style questions, links, reasoning, cases, "why" and implications.
Mix difficulty tiers: easy (definitions), medium (comprehension, comparison), hard (interpretation, oral-exam style).
Mix question types:
- definition questions
- cause/effect questions
- concept comparison
- application to real examples
- "what does the author mean by..." questions
Assign learningLevel honestly:
- memory = recall/definition
- understanding = explain in own words
- application = use in an example/case
- exam = answer as in a serious test
- professor = hard follow-up, implication, objection or connection
FLASHCARD REQUIREMENTS:
Mix types: definition, cause-effect, comparison, true/false, application, oral-exam style. Break long answers into smaller chunks.
NARRATIVE FICTION QUESTION REQUIREMENTS:
If contentType is narrative_fiction, questions must be clean Italian craft-aware questions about character motivation, emotional conflict, scene tension, symbols, atmosphere, mystery, narrative promises and chapter progression.
Reject/avoid truncated questions, questions without "?", very generic questions like "Cosa sente Viola?", isolated-keyword questions, duplicate questions and wrong-language questions.
SUMMARY REQUIREMENTS:
The 10 summary modes must be genuinely different in structure and purpose. Do not copy the same text into every mode.
MAP/EXERCISE REQUIREMENTS:
Use only concepts present in the material. If a relationship is inferred, keep it conservative and label it as a study relation, not a new fact.

MATERIAL:
${material}`;

  const raw = await callScriptoraStudyAI(systemPrompt, userPrompt);
  const parsed = safeJsonParse(raw);
  let normalized = sanitizeStudySessionResult(normalizeStudyResult(parsed, fallback), fallback);

  const quality = scoreStudySessionQuality(normalized);
  const minScore = Math.min(
    quality.summaryQuality,
    quality.quizQuality,
    quality.vocabularyQuality,
    quality.flashcardQuality,
    quality.oralExamQuality,
  );

  if (minScore < 8) {
    if (import.meta.env.DEV) {
      console.info("STUDY_QUALITY_REPAIR_TRIGGERED", {
        minScore,
        scores: quality,
        sourceName: input.sourceName,
      });
    }
    try {
      const repairRaw = await callScriptoraStudyAI(
        `${systemPrompt}\n\nRepair pass: keep the same JSON shape, preserve facts, remove artifacts, improve only weak sections. Do not invent missing facts.`,
        `Repair this Study OS JSON. Keep content faithful to the source material and the manual intent. Remove broken questions, duplicates, placeholders and weak generic sections. Return ONLY valid JSON.\n\nQUALITY SCORES:\n${JSON.stringify(quality)}\n\nCURRENT JSON:\n${JSON.stringify(normalized).slice(0, 32000)}`,
      );
      const repaired = sanitizeStudySessionResult(normalizeStudyResult(safeJsonParse(repairRaw), fallback), fallback);
      const repairedQuality = scoreStudySessionQuality(repaired);
      const repairedMin = Math.min(
        repairedQuality.summaryQuality,
        repairedQuality.quizQuality,
        repairedQuality.vocabularyQuality,
        repairedQuality.flashcardQuality,
        repairedQuality.oralExamQuality,
      );
      if (repairedMin >= 7 && repairedMin >= minScore) normalized = repaired;
    } catch {
      // Keep sanitized first pass or local fallback below.
    }
  }

  const finalQuality = scoreStudySessionQuality(normalized);
  const finalMin = Math.min(
    finalQuality.summaryQuality,
    finalQuality.quizQuality,
    finalQuality.vocabularyQuality,
    finalQuality.flashcardQuality,
    finalQuality.oralExamQuality,
  );
  return finalMin < 7 ? fallback : { ...normalized, qualityScores: finalQuality };
}

export interface StudyErrorTutorInput {
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number;
  explanation?: string;
  language?: string;
}

export interface StudyErrorTutorResult {
  correctAnswer: string;
  whyWrong: string;
  reviewTip: string;
  source: "ai" | "local";
}

export async function explainStudyQuizError(input: StudyErrorTutorInput): Promise<StudyErrorTutorResult> {
  const correct = input.options[input.correctIndex] || "risposta corretta";
  const selected = input.options[input.selectedIndex] || "la tua scelta";
  const local: StudyErrorTutorResult = {
    correctAnswer: correct,
    whyWrong: `"${selected}" non è la risposta migliore. ${input.explanation || `La risposta corretta è: ${correct}`}`,
    reviewTip: "Ripassa il concetto collegandolo a un esempio concreto, poi rifai 2 domande simili.",
    source: "local",
  };

  try {
    const { data, error } = await supabase.functions.invoke("scriptora-study-tutor", {
      body: {
        question: input.question,
        options: input.options,
        correctIndex: input.correctIndex,
        selectedIndex: input.selectedIndex,
        language: input.language || "Italian",
      },
    });
    if (error) throw error;
    const text = String(data?.whyWrong || data?.explanation || "").trim();
    if (text) {
      return {
        correctAnswer: String(data?.correctAnswer || correct),
        whyWrong: text,
        reviewTip: String(data?.reviewTip || local.reviewTip),
        source: "ai",
      };
    }
  } catch {
    /* fallback local */
  }

  return local;
}
