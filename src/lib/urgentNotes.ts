/**
 * Urgent & High Priority Note Tracking Utility
 * Detects notes with priority === 'urgent' | 'high' that remain unresolved (!is_completed)
 * and have not been opened for more than 12 hours.
 */

export const STORAGE_KEY_NOTES = "ziptabs_app_notes";
export const STORAGE_KEY_LAST_OPENED = "ziptabs_notes_last_opened";
export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export interface MinimalNote {
  id: string;
  title: string;
  content?: string;
  priority?: "normal" | "high" | "urgent";
  is_completed?: boolean;
  created_at?: string;
  updated_at?: string;
  last_opened_at?: string;
}

/**
 * Record that a user opened a note (either viewed details or edited)
 */
export function recordNoteOpened(noteId: string) {
  if (typeof window === "undefined" || !noteId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_OPENED);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    const nowIso = new Date().toISOString();
    map[noteId] = nowIso;
    localStorage.setItem(STORAGE_KEY_LAST_OPENED, JSON.stringify(map));

    // Dispatch global event so all tabs/listeners update immediately
    window.dispatchEvent(
      new CustomEvent("ziptabs-note-opened", {
        detail: { noteId, openedAt: nowIso },
      })
    );
  } catch (err) {
    console.warn("Failed to record note opened timestamp:", err);
  }
}

/**
 * Retrieve the last-opened timestamp for a note
 */
export function getNoteLastOpenedTimestamp(
  noteId: string,
  noteFallbackDate?: string
): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST_OPENED);
    if (raw) {
      const map: Record<string, string> = JSON.parse(raw);
      if (map[noteId]) {
        const parsed = new Date(map[noteId]).getTime();
        if (!isNaN(parsed)) return parsed;
      }
    }
  } catch {}

  // Fallback to note's created_at or updated_at
  if (noteFallbackDate) {
    const parsed = new Date(noteFallbackDate).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // If no date found, default to a date older than 12h so it gets flagged
  return Date.now() - (TWELVE_HOURS_MS + 1000);
}

/**
 * Check whether a note is high/urgent, unresolved, and unopened for > 12 hours
 */
export function isNoteOverdueUnresolved(note: MinimalNote): boolean {
  // 1. Must be high or urgent priority
  const isUrgentOrHigh = note.priority === "urgent" || note.priority === "high";
  if (!isUrgentOrHigh) return false;

  // 2. Must be unresolved (not marked as completed)
  if (note.is_completed) return false;

  // 3. Must be older than 12 hours since last opened
  const lastOpenedMs = getNoteLastOpenedTimestamp(
    note.id,
    note.updated_at || note.created_at
  );

  const elapsedMs = Date.now() - lastOpenedMs;
  return elapsedMs > TWELVE_HOURS_MS;
}

/**
 * Scan all cached notes and return any overdue unresolved high/urgent notes
 */
export function getOverdueUnresolvedNotes(): MinimalNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTES);
    if (!raw) return [];
    const notes: MinimalNote[] = JSON.parse(raw);
    if (!Array.isArray(notes)) return [];

    return notes.filter((n) => isNoteOverdueUnresolved(n));
  } catch {
    return [];
  }
}
