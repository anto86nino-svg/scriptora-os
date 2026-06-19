import type { StudyCertificateInput } from "@/lib/study-certificate";

const STORAGE_KEY = "scriptora-study-certificates-v1";
export const STUDY_CERTIFICATES_CHANGE_EVENT = "scriptora-study-certificates-change";

export interface StudyCertificateRecord extends StudyCertificateInput {
  id: string;
  createdAt: string;
}

function safeUuid(): string {
  try {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function readAll(): StudyCertificateRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id) : [];
  } catch {
    return [];
  }
}

function writeAll(records: StudyCertificateRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STUDY_CERTIFICATES_CHANGE_EVENT));
  }
}

export function listStudyCertificates(): StudyCertificateRecord[] {
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveStudyCertificate(input: StudyCertificateInput): StudyCertificateRecord {
  const record: StudyCertificateRecord = {
    ...input,
    id: `certificate-${safeUuid()}`,
    createdAt: new Date().toISOString(),
  };
  writeAll([record, ...readAll()].slice(0, 80));
  return record;
}

export function deleteStudyCertificate(id: string): void {
  writeAll(readAll().filter((record) => record.id !== id));
}
