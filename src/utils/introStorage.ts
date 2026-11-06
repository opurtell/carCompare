/** Separate from the app state, so Reset All doesn't bring the intro back. */
export const INTRO_SEEN_KEY = 'carCompare_introSeen';

/** If storage can't be read, say seen: the dismissal could never stick, so it would show on every load. */
export function hasSeenIntro(): boolean {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) !== null;
  } catch {
    return true;
  }
}

export function markIntroSeen(): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // localStorage full or unavailable (e.g. some private-browsing modes)
  }
}
