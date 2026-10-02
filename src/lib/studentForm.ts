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
  const wanted = usernameKey(username);
  if (!wanted) return null;
  return (
    students.find(
      (s) => s.id !== editingStudentId && usernameKey(s.username) === wanted
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

/**
 * Usernames are the login key and the lookup is an exact Firestore match, so
 * whatever is stored is what has to be typed. The password got
 * normalizeSecretCode() while the username used to get no normalisation at all,
 * which meant a stray space or capital letter was stored verbatim and quietly
 * locked that student out with "اسم المستخدم غير صحيح" -- and because the field
 * was disabled while editing, delete-and-recreate was the only way out.
 *
 * Trimming happens on the way in. Capitalisation is deliberately preserved:
 * results are keyed by the username string (`${quizId}_${username}`), so
 * lower-casing on write would orphan every result a returning student already
 * had. Case is handled on read instead, see getStudentByUsername.
 */
export function normalizeUsername(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Comparison key for usernames. Mirrors what findDuplicateUsername compares, so
 * the duplicate check and the login lookup can never disagree about whether two
 * names are the same.
 */
export function usernameKey(value: string | null | undefined): string {
  return normalizeUsername(value ?? "").toLowerCase();
}
