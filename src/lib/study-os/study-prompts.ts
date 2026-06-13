import type { StudyGoal, StudyLevel } from "./study-types";

export function buildStudyOsSystemPrompt(language: string): string {
  return `You are Scriptora Study OS, an elite academic tutor for school and university students.

LANGUAGE RULE:
Respond entirely in ${language}. No English unless quoting a term from the source material.

OUTPUT RULE:
Return ONLY valid JSON. No markdown fences. No commentary outside JSON.

QUALITY RULES:
- Do NOT invent facts not present in the material. If missing, write "non presente nel materiale".
- Separate facts, interpretations, and study advice.
- Avoid motivational fluff and decorative prose.
- Produce immediately usable study content.
- Light summary: 150-180 words, bullet-oriented.
- Medium summary: 350-550 words when material is long.
- Pro summary: 700-1000 words when material is long, exam-ready.
- Study Notes Pro: sections "Concetti da sapere", "Cosa ricordare", "Trappole d'esame", "Collegamenti causa-effetto", "Interrogazione orale".
- At least 10 quiz questions for long material; plausible distractors; mix easy/medium/hard.
- At least 10 flashcards; concise; no repetition.
- Concept map: textual hierarchy with arrows/relations (cause → effect, definition → application).
- Study plan: realistic minutes, priorities high/medium/low.
- Review checklist: 5-8 actionable items.`;
}

export function buildStudyOsUserPrompt(input: {
  material: string;
  sourceName: string;
  level: string;
  studyLevel: StudyLevel;
  goal: StudyGoal;
  language: string;
}): string {
  return `Create a professional Study OS session from this material.

Desired difficulty: ${input.level}
Student level: ${input.studyLevel}
Study goal: ${input.goal}
Source: ${input.sourceName}

Return this JSON shape exactly:
{
  "title": "string",
  "detectedSubject": "string",
  "difficulty": "soft | medium | pro",
  "materialAnalysis": {
    "detectedLevel": "middle_school | high_school | university",
    "mainTopics": ["string"],
    "keyTerms": ["string"],
    "estimatedStudyTimeMinutes": 0,
    "prerequisites": ["string"],
    "weakPoints": ["string"],
    "confusionRisks": ["string"],
    "recommendedMode": "interrogation | quiz | exam | summary | quick_review"
  },
  "lightSummary": "string",
  "mediumSummary": "string",
  "proSummary": "string",
  "studyNotesPro": "string",
  "simpleExplanation": "string",
  "examLevelExplanation": "string",
  "advancedExplanation": "string",
  "conceptMap": "string",
  "commonMistakes": ["string"],
  "formulasOrDates": ["string"],
  "reviewChecklist": ["string"],
  "studyPlan": {
    "priorityOrder": [
      { "title": "string", "priority": "high | medium | low", "minutes": 0, "action": "string" }
    ],
    "dailyPlan": ["string"],
    "activeRecallTasks": ["string"],
    "revisionSchedule": ["string"],
    "examStrategy": ["string"]
  },
  "openQuestions": [{ "question": "string", "answerGuide": "string" }],
  "difficultWords": [{ "word": "string", "simple": "string", "technical": "string", "example": "string" }],
  "flashcards": [{ "front": "string", "back": "string", "difficulty": "easy | medium | hard" }],
  "quiz": [{
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "answer": 0,
    "explanation": "string",
    "difficulty": "easy | medium | hard",
    "memoryTrick": "string",
    "commonMistake": "string"
  }],
  "keyConcepts": ["string"]
}

MATERIAL:
${input.material}`;
}
