/**
 * Urgent & High Priority Note Tracking Utility
 * Detects notes with priority === 'urgent' | 'high' that remain unresolved (!is_completed)
 * and have not been opened for more than 12 hours.
 * 
 * Synchronizes last_opened_at timestamps across devices via Supabase so mobile and PC
 * share the same verified reviewed state for @chief.
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
 * Record that a user opened a note (either viewed details or edited).
 * Instantly updates local storage for instant feedback AND updates Supabase
 * so mobile & PC stay perfectly in sync.
 */
export function recordNoteOpened(noteId: string) {
  if (typeof window === "undefined" || !noteId) return;
  try {
    const nowIso = new Date().toISOString();

    // 1. Update local storage map
    const raw = localStorage.getItem(STORAGE_KEY_LAST_OPENED);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[noteId] = nowIso;
    localStorage.setItem(STORAGE_KEY_LAST_OPENED, JSON.stringify(map));

    // 2. Also update cached note inside ziptabs_app_notes
    try {
      const notesRaw = localStorage.getItem(STORAGE_KEY_NOTES);
      if (notesRaw) {
        const notes = JSON.parse(notesRaw);
        if (Array.isArray(notes)) {
          let modified = false;
          for (const n of notes) {
            if (n.id === noteId) {
              n.last_opened_at = nowIso;
              modified = true;
            }
          }
          if (modified) {
            localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
          }
        }
      }
    } catch {}

    // 3. Dispatch global event so all tabs/listeners update immediately
    window.dispatchEvent(
      new CustomEvent("ziptabs-note-opened", {
        detail: { noteId, openedAt: nowIso },
      })
    );

    // 4. Persist to cloud database via authenticated API gateway so mobile device immediately receives it
    fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_timestamps",
        id: noteId,
        timestamp: nowIso,
      }),
    }).catch((err) => {
      console.warn("[urgentNotes] Note last_opened_at cloud sync error:", err);
    });
  } catch (err) {
    console.warn("Failed to record note opened timestamp:", err);
  }
}

/**
 * Bulk record all active high/urgent notes as reviewed.
 * Syncs to Supabase so both mobile & PC reflect reviewed state immediately.
 */
export function recordAllNotesReviewed(notesToReview?: MinimalNote[]) {
  if (typeof window === "undefined") return;
  try {
    const nowIso = new Date().toISOString();
    const raw = localStorage.getItem(STORAGE_KEY_LAST_OPENED);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};

    let targetIds: string[] = [];
    if (notesToReview && notesToReview.length > 0) {
      targetIds = notesToReview.map((n) => n.id);
    } else {
      const notesRaw = localStorage.getItem(STORAGE_KEY_NOTES);
      if (notesRaw) {
        const notes = JSON.parse(notesRaw);
        if (Array.isArray(notes)) {
          targetIds = notes
            .filter((n) => (n.priority === "urgent" || n.priority === "high") && !n.is_completed)
            .map((n) => n.id);
        }
      }
    }

    if (targetIds.length === 0) return;

    for (const id of targetIds) {
      map[id] = nowIso;
    }
    localStorage.setItem(STORAGE_KEY_LAST_OPENED, JSON.stringify(map));

    // Update localStorage cached notes
    try {
      const notesRaw = localStorage.getItem(STORAGE_KEY_NOTES);
      if (notesRaw) {
        const notes = JSON.parse(notesRaw);
        if (Array.isArray(notes)) {
          notes.forEach((n: any) => {
            if (targetIds.includes(n.id)) {
              n.last_opened_at = nowIso;
            }
          });
          localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
        }
      }
    } catch {}

    window.dispatchEvent(
      new CustomEvent("ziptabs-note-opened", {
        detail: { targetIds, openedAt: nowIso },
      })
    );

    if (targetIds.length > 0) {
      fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_timestamps",
          ids: targetIds,
          timestamp: nowIso,
        }),
      }).catch((err) => {
        console.warn("[urgentNotes] Bulk cloud sync error:", err);
      });
    }
  } catch (err) {
    console.warn("Failed to record all notes reviewed:", err);
  }
}

/**
 * Retrieve the last-opened timestamp for a note.
 * Resolves both Cloud DB timestamp (Supabase) and local browser storage,
 * prioritizing whichever is more recent.
 */
export function getNoteLastOpenedTimestamp(
  noteId: string,
  noteFallbackDate?: string,
  lastOpenedAtFromDb?: string
): number {
  let highestTimestamp = 0;

  // 1. Check Cloud DB timestamp from Supabase
  if (lastOpenedAtFromDb) {
    const dbParsed = new Date(lastOpenedAtFromDb).getTime();
    if (!isNaN(dbParsed)) highestTimestamp = dbParsed;
  }

  // 2. Check local browser storage and take the newer timestamp
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LAST_OPENED);
      if (raw) {
        const map: Record<string, string> = JSON.parse(raw);
        if (map[noteId]) {
          const localParsed = new Date(map[noteId]).getTime();
          if (!isNaN(localParsed)) {
            highestTimestamp = Math.max(highestTimestamp, localParsed);
          }
        }
      }
    } catch {}
  }

  if (highestTimestamp > 0) return highestTimestamp;

  // 3. Fallback to note's updated_at or created_at
  if (noteFallbackDate) {
    const parsed = new Date(noteFallbackDate).getTime();
    if (!isNaN(parsed)) return parsed;
  }

  // If no date found at all, default to an expired timestamp (>12h)
  return Date.now() - (TWELVE_HOURS_MS + 1000);
}

/**
 * Check whether a note is high/urgent, unresolved, and unopened for > 12 hours.
 * Uses both Cloud DB (Supabase) and local storage for accurate cross-device sync.
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
    note.updated_at || note.created_at,
    note.last_opened_at
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
