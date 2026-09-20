import { useEffect, useState } from "react";
import { Trophy, Crown } from "lucide-react";
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

  const globalTop = [...medals]
    .sort((a, b) => b.lastScore - a.lastScore || b.totalMedals - a.totalMedals)
    .slice(0, 5);

  const hasData = activeSubjects.length > 0 || hallOfFame.length > 0 || globalTop.length > 0;
  if (!hasData) return null;

  const pseudoResults: QuizResult[] = globalTop.map((m) => ({
    id: `global-${m.username}`,
    subjectId: "",
    username: m.username,
    studentName: m.studentName || m.username,
    score: m.lastScore,
    correctCount: 0,
    totalQuestions: 1,
    attempts: 1,
    bestAttempt: 1,
    medal: m.totalMedals > 0 ? "gold" : undefined,
    updatedAt: m.lastUpdatedAt,
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
                medalCounts={Object.fromEntries(medals.map((m) => [m.username, m.totalMedals]))}
                hideAttemptNote
              />
            </div>
          )}

          {activeSubjects.length > 0 && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-glow" />
              تحديات جارية الآن: {activeSubjects.map((s) => s.name).join("، ")}
            </p>
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