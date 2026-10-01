export interface UsernameCandidate {
  id: string;
  username: string;
  displayName?: string;
}

/**
 * Find another student that already owns this username.
 *
 * Usernames are the login key: the lookup takes the first match, so a duplicate
 * silently blocks BOTH students from signing in. Matching ignores surrounding
 * whitespace and letter case, and never counts the student currently being
 * edited (otherwise editing a student would flag their own username as taken).
 */
export function findDuplicateUsername<T extends UsernameCandidate>(
  students: T[],
  username: string,
  editingStudentId?: string | null
): T | null {
  const wanted = username.trim().toLowerCase();
  if (!wanted) return null;
  return (
    students.find(
      (s) => s.id !== editingStudentId && s.username.trim().toLowerCase() === wanted
    ) ?? null
  );
}

/**
 * Digits-only secret code, safe to store: strips the spaces that `formatSecret`
 * inserts for display, so showing "123 456" can never corrupt the stored value.
 */
export function normalizeSecretCode(value: string, maxLength = 15): string {
  return value.replace(/\s+/g, "").replace(/\D/g, "").slice(0, maxLength);
}
