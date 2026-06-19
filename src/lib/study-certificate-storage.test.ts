import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteStudyCertificate,
  listStudyCertificates,
  saveStudyCertificate,
} from "@/lib/study-certificate-storage";

describe("Study OS certificate storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves, lists and deletes certificate metadata", () => {
    const saved = saveStudyCertificate({
      studentName: "Studente",
      subject: "Storia",
      date: "19/06/2026",
      score: 86,
      level: "Proficient",
      grade10: 8.6,
      grade30: 26,
      judgement: "Buono",
      sourceProjectId: "study-1",
      badges: ["Primo esame"],
    });

    expect(listStudyCertificates()).toHaveLength(1);
    expect(listStudyCertificates()[0].subject).toBe("Storia");
    deleteStudyCertificate(saved.id);
    expect(listStudyCertificates()).toHaveLength(0);
  });
});
