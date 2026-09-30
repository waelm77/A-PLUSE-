import type { QuizResult } from "../types";

export const scoreColor = (v: number) =>
  v >= 80 ? "#22c55e" : v >= 60 ? "#f59e0b" : "#ef4444";

// Per subject: unique students (their best score across all quizzes of that subject).
export function materialQuizSubjectRows(results: QuizResult[]) {
  const bySubject = new Map<string, QuizResult[]>();
  for (const r of results) {
    const arr = bySubject.get(r.subjectId);
    if (arr) arr.push(r);
    else bySubject.set(r.subjectId, [r]);
  }
  return [...bySubject.entries()].map(([subjectId, items]) => {
    const bestByName = new Map<string, QuizResult>();
    for (const r of items) {
      const prev = bestByName.get(r.username);
      if (!prev || r.score > prev.score) bestByName.set(r.username, r);
    }
    const students = [...bestByName.values()];
    const avg = Math.round(students.reduce((s, r) => s + r.score, 0) / students.length);
    const lastUpdated = students.reduce(
      (max, r) => (r.updatedAt > max ? r.updatedAt : max),
      students[0]!.updatedAt
    );
    return { subjectId, studentCount: students.length, avg, lastUpdated };
  });
}

// Per subject's quiz: one bucket per quizId, with a "legacy" bucket for old
// documents saved without a quizId (per-subject results recorded before this change).
export function materialQuizBuckets(group: QuizResult[]) {
  const byQuiz = new Map<string, QuizResult[]>();
  for (const r of group) {
    const key = r.quizId || "legacy";
    const arr = byQuiz.get(key);
    if (arr) arr.push(r);
    else byQuiz.set(key, [r]);
  }
  return [...byQuiz.entries()].map(([quizId, items]) => {
    const students = [...items].sort((a, b) => b.score - a.score);
    const avg = Math.round(items.reduce((s, r) => s + r.score, 0) / items.length);
    const last = students[0]!;
    const title =
      quizId === "legacy"
        ? "نتائج سابقة (بدون اختبار معرّف)"
        : (items.find((r) => r.quizTitle)?.quizTitle || "اختبار بدون عنوان");
    return {
      quizId,
      title,
      avg,
      students,
      lastUpdated: items.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), last.updatedAt),
    };
  });
}