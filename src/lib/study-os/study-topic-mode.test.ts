import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial, classifyStudyMaterial } from "@/lib/study-session";
import {
  buildTopicModeSession,
  classifyStudyInput,
  hasSemanticStudyContent,
  isTopicOnlyInput,
} from "@/lib/study-os/study-topic-mode";

function longStudyText(topic: string, body: string, repeats = 50): string {
  return Array.from({ length: repeats }, (_, index) => `${topic} sezione ${index + 1}. ${body}`).join("\n\n");
}

describe("Study OS semantic correctness — topic mode gate", () => {
  it('routes "Intelligenza Artificiale" to topic mode, not a full session', () => {
    const input = "Intelligenza Artificiale";
    expect(classifyStudyInput(input).kind).toBe("topic_only");
    expect(isTopicOnlyInput(input)).toBe(true);

    const result = analyzeStudyMaterial(input);
    expect(result.sessionMode).toBe("topic");
    expect(result.quiz).toHaveLength(0);
    expect(result.flashcards).toHaveLength(0);
    expect(result.trueFalse).toHaveLength(0);
    expect(result.studyMode).toBe("Esplorazione argomento");
    expect(result.classification?.type).toBe("computer-science");
    expect(result.classification?.type).not.toBe("history");
    expect(hasSemanticStudyContent(result)).toBe(false);
  });

  it("builds a full session for 1000+ words on IA", () => {
    const text = longStudyText(
      "Intelligenza Artificiale",
      "Machine learning, deep learning, reti neurali, training, dataset, inferenza, algoritmi, programmazione Python e modelli transformer descrivono sistemi software intelligenti.",
      55,
    );
    expect(classifyStudyInput(text).kind).toBe("real_material");

    const result = analyzeStudyMaterial(text, "ia-dispensa.txt");
    expect(result.sessionMode).toBe("full");
    expect(result.words).toBeGreaterThanOrEqual(40);
    expect(result.quiz.length).toBeGreaterThan(0);
    expect(result.flashcards.length).toBeGreaterThan(0);
    expect(result.classification?.type).toBe("computer-science");
    expect(hasSemanticStudyContent(result)).toBe(true);
  });

  it('routes "Rivoluzione Francese" to topic mode', () => {
    const input = "Rivoluzione Francese";
    expect(classifyStudyInput(input).kind).toBe("topic_only");

    const result = analyzeStudyMaterial(input);
    expect(result.sessionMode).toBe("topic");
    expect(result.quiz).toHaveLength(0);
    expect(result.flashcards).toHaveLength(0);
    expect(result.classification?.type).toBe("history");
  });

  it("builds a full session for a 1000+ word history chapter", () => {
    const text = longStudyText(
      "Storia moderna",
      "La rivoluzione del 1789 ebbe cause economiche, crisi della monarchia, guerra, Bastiglia, Dichiarazione dei diritti, fasi rivoluzionarie, Napoleone e conseguenze in Europa.",
      55,
    );
    expect(classifyStudyInput(text).kind).toBe("real_material");

    const result = analyzeStudyMaterial(text, "capitolo-storia.txt");
    expect(result.sessionMode).toBe("full");
    expect(result.quiz.length).toBeGreaterThan(0);
    expect(result.classification?.type).toBe("history");
    expect(hasSemanticStudyContent(result)).toBe(true);
  });

  it("never classifies IA topic hints as Storia", () => {
    const topics = ["Intelligenza Artificiale", "Machine Learning", "Deep Learning", "Informatica", "IA"];
    for (const topic of topics) {
      const session = buildTopicModeSession(topic);
      expect(session.classification?.type).toBe("computer-science");
      expect(session.classification?.type).not.toBe("history");
    }
  });

  it("marks short non-topic fragments as insufficient", () => {
    const input = "come passo l'esame domani senza studiare abbastanza materiale";
    expect(classifyStudyInput(input).kind).toBe("insufficient");

    const result = analyzeStudyMaterial(input);
    expect(result.sessionMode).toBe("insufficient");
    expect(result.quiz).toHaveLength(0);
  });

  it("classifies IA vocabulary in real material as computer-science, not history", () => {
    const text = longStudyText(
      "Informatica",
      "Algoritmi, machine learning, deep learning, dataset, training, inferenza, reti neurali, NLP, Python, API, software e hardware.",
      8,
    );
    expect(classifyStudyMaterial(text).type).toBe("computer-science");
    expect(classifyStudyMaterial(text).type).not.toBe("history");
  });
});
