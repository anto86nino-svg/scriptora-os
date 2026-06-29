import type { SpacedFlashcard } from "@/lib/study-os/study-flashcards";
import type { StudyMemorySnapshot } from "@/lib/study-os/study-memory";
import type { StudyPlanResult } from "@/lib/study-os/study-plan";

export interface StudyReminder {
  id: string;
  sessionId: string;
  subjectLabel: string;
  type: "flashcard" | "plan_review";
  label: string;
  dueAt: number;
}

const REMINDER_STORAGE_KEY = "scriptora-study-reminder-badge";

/** Earliest SM-2 review due timestamp from a flashcard deck. */
export function getNextSm2ReviewDue(deck: SpacedFlashcard[], now = Date.now()): number | null {
  const due = deck.filter((card) => card.nextReviewAt <= now);
  if (due.length) return Math.min(...due.map((c) => c.nextReviewAt));

  const upcoming = deck
    .map((c) => c.nextReviewAt)
    .filter((ts) => ts > now)
    .sort((a, b) => a - b);
  return upcoming[0] ?? null;
}

/** Build reminder list from IndexedDB memory + optional study plan. */
export function computeStudyReminders(
  sessions: StudyMemorySnapshot[],
  plan?: StudyPlanResult | null,
  now = Date.now(),
): StudyReminder[] {
  const reminders: StudyReminder[] = [];

  for (const session of sessions) {
    const deck = session.flashcardDeck ?? [];
    const dueCards = deck.filter((card) => card.nextReviewAt <= now);
    if (dueCards.length) {
      reminders.push({
        id: `fc-${session.sessionId}`,
        sessionId: session.sessionId,
        subjectLabel: session.subjectLabel,
        type: "flashcard",
        label: `${dueCards.length} flashcard da ripassare`,
        dueAt: Math.min(...dueCards.map((c) => c.nextReviewAt)),
      });
    } else {
      const nextDue = getNextSm2ReviewDue(deck, now);
      if (nextDue !== null && nextDue <= now + 24 * 60 * 60 * 1000) {
        reminders.push({
          id: `fc-upcoming-${session.sessionId}`,
          sessionId: session.sessionId,
          subjectLabel: session.subjectLabel,
          type: "flashcard",
          label: "Ripasso flashcard in arrivo",
          dueAt: nextDue,
        });
      }
    }
  }

  if (plan?.sessions.length) {
    const today = new Date(now).toISOString().slice(0, 10);
    for (const session of plan.sessions) {
      if (session.isReview && session.date <= today) {
        reminders.push({
          id: `plan-${session.id}`,
          sessionId: session.id,
          subjectLabel: plan.materia,
          type: "plan_review",
          label: session.title,
          dueAt: new Date(`${session.date}T09:00:00`).getTime(),
        });
      }
    }
  }

  return reminders.sort((a, b) => a.dueAt - b.dueAt);
}

export function countDueReminders(reminders: StudyReminder[], now = Date.now()): number {
  return reminders.filter((r) => r.dueAt <= now).length;
}

export function getReminderBadgeCount(reminders: StudyReminder[], now = Date.now()): number {
  const due = countDueReminders(reminders, now);
  if (due > 0) return due;
  return reminders.length > 0 ? 1 : 0;
}

export function persistReminderBadgeCount(count: number): void {
  try {
    localStorage.setItem(REMINDER_STORAGE_KEY, String(count));
  } catch {
    /* ignore */
  }
}

export function loadPersistedReminderBadgeCount(): number {
  try {
    const raw = localStorage.getItem(REMINDER_STORAGE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export async function requestStudyNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Show a browser notification when permitted; returns whether it was shown. */
export function showStudyReminderNotification(reminder: StudyReminder): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    new Notification(`Ripasso Study — ${reminder.subjectLabel}`, {
      body: reminder.label,
      tag: reminder.id,
      icon: "/favicon.ico",
    });
    return true;
  } catch {
    return false;
  }
}
