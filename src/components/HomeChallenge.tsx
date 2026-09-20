import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Crown, BookOpen } from "lucide-react";
import { iconMap } from "@/lib/constants";
import { subscribeAllQuizResults, subscribeStudentMedals, compareQuizResults } from "@/services/firestore";
import ChallengeLeaderboard from "@/components/ChallengeLeaderboard";
import type { Subject, QuizResult, StudentMedals } from "@/types";

const GOLD = "#FFD700";

export default function HomeChallenge({ subjects }: { subjects: Subject[] }) {
  const [allResults, setAllResults] = useState<QuizResult[]>([]);
  const [medals, setMedals] = useState<StudentMedals[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeAllQuizResults(setAllResults), []);
  useEffect(() => subscribeStudentMedals(setMedals), []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const activeSubjects = subjects.filter(
    (s) =>
      s.challengeActive &&
      (!s.challengeStartDate || now >= new Date(s.challengeStartDate).getTime()) &&
      s.challengeEndDate &&
      now < new Date(s.challengeEndDate).getTime()
  );
  const hallOfFame = subjects
    .filter((s) => s.challengeActive && s.challengeEndDate && now >= new Date(s.challengeEndDate).getTime())
    .map((s) => ({
      subject: s,
      top: allResults
        .filter((r) => r.subjectId === s.id)
        .sort(compareQuizResults)
        .slice(0, 5),
    }))
    .filter((g) => g.top.length > 0);

  const globalTop = useMemo(() => {
    const byUser: Record<
      string,
      { username: string; studentName: string; best: number; attempts: number; last: number }
    > = {};
    for (const r of allResults) {
      const cur = byUser[r.username];
      if (!cur) {
        byUser[r.username] = {
          username: r.username,
          studentName: r.studentName,
          best: r.score,
          attempts: 1,
          last: new Date(r.updatedAt).getTime(),
        };
      } else {
        cur.best = Math.max(cur.best, r.score);
        cur.attempts += 1;
        cur.last = Math.max(cur.last, new Date(r.updatedAt).getTime());
      }
    }
    return Object.values(byUser)
      .sort((a, b) => b.best - a.best || b.last - a.last)
      .slice(0, 5);
  }, [allResults]);

  const medalByUser = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of medals) map[m.username] = m.totalMedals;
    return map;
  }, [medals]);

  const subjectNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of subjects) map[s.id] = s.name;
    return map;
  }, [subjects]);

  const bestSubjectByUser = useMemo(() => {
    const map: Record<string, string> = {};
    const bestScore: Record<string, number> = {};
    for (const r of allResults) {
      const name = subjectNameById[r.subjectId];
      if (!name) continue;
      if (bestScore[r.username] === undefined || r.score > bestScore[r.username]) {
        bestScore[r.username] = r.score;
        map[r.username] = name;
      }
    }
    return map;
  }, [allResults, subjectNameById]);

  const hasData = activeSubjects.length > 0 || hallOfFame.length > 0 || globalTop.length > 0;
  if (!hasData) return null;

  const pseudoResults: QuizResult[] = globalTop.map((m) => ({
    id: `global-${m.username}`,
    subjectId: "",
    username: m.username,
    studentName: m.studentName || m.username,
    score: m.best,
    correctCount: 0,
    totalQuestions: 1,
    attempts: m.attempts,
    bestAttempt: 1,
    medal: (medalByUser[m.username] || 0) > 0 ? "gold" : undefined,
    updatedAt: new Date(m.last).toISOString(),
  }));

  return (
    <section className="container mx-auto px-4 pb-8">
      <div
        className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
        style={{ background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}08)`, borderColor: GOLD + "55" }}
      >
        <div className="absolute -top-1/2 -right-1/2 h-[280px] w-[280px] rounded-full blur-[80px]" style={{ background: GOLD + "22" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg" style={{ backgroundColor: GOLD }}>
              <Trophy className="h-6 w-6 text-white" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">ساحة التحدي</h2>
              <p className="text-sm text-muted-foreground">أفضل 5 على مستوى المنصة</p>
            </div>
          </div>

          {globalTop.length > 0 && (
            <div className="mt-4 rounded-xl bg-background/75 border p-4">
              <ChallengeLeaderboard
                results={pseudoResults}
                subjectColor={GOLD}
                showMedalCounts
                medalCounts={medalByUser}
                hideAttemptNote
                subjectNamesByUser={bestSubjectByUser}
              />
            </div>
          )}

          {activeSubjects.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-2 font-black text-foreground">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-glow" />
                تحديات جارية الآن
              </p>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {activeSubjects.map((s) => {
                  const Icon = iconMap[s.icon] || BookOpen;
                  return (
                    <Link key={s.id} to={`/subject/${s.id}`} className="block">
                      <div
                        className="flex items-center gap-3 rounded-xl border p-3 transition-transform hover:-translate-y-1 hover:shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${s.color}22, ${s.color}08)`,
                          borderColor: s.color + "55",
                        }}
                      >
                        <div
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow"
                          style={{ backgroundColor: s.color, boxShadow: `0 4px 14px ${s.color}55` }}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black" style={{ color: s.color }}>
                            {s.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">شارك في التحدي الآن</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {hallOfFame.length > 0 && (
            <div className="mt-4">
              <h3 className="flex items-center gap-2 text-lg font-black mb-3">
                <Crown className="h-5 w-5" style={{ color: GOLD }} />
                لوحة الشرف
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {hallOfFame.map(({ subject, top }) => (
                  <div key={subject.id} className="rounded-xl border bg-background/75 p-4">
                    <p className="font-bold mb-2" style={{ color: subject.color }}>
                      {subject.name}
                    </p>
                    <div className="space-y-1.5">
                      {top.map((r, i) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-1.5 text-sm"
                          style={{ borderColor: subject.color + "33" }}
                        >
                          <span className="flex items-center gap-2 font-bold">
                            <span>{["🥇", "🥈", "🥉", "🎖️", "🎖️"][i]}</span>
                            {r.studentName}
                          </span>
                          <span className="text-muted-foreground">
                            {r.score}% {r.bestAttempt === 1 ? "• من المحاولة الأولى" : "• من محاولتين"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}