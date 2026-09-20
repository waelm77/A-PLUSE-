import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Trophy,
  ClipboardList,
  Play,
  Lock,
  Clock,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Ghost,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import ChallengeLeaderboard from "@/components/ChallengeLeaderboard";
import QuizEditorDialog from "@/components/QuizEditorDialog";
import QuizRunner, { type QuizOutcome } from "@/components/QuizRunner";
import {
  subscribeQuizzesBySubject,
  subscribeQuizResults,
  subscribeStudentMedals,
  submitQuizResult,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  toggleQuizFree,
  toggleQuizHidden,
  MAX_QUIZ_ATTEMPTS,
} from "@/services/firestore";
import type { Subject, Quiz, QuizResult } from "@/types";

function timeLeftMs(end: string) {
  return Math.max(0, new Date(end).getTime() - Date.now());
}

function ChallengeCountdown({ endDate }: { endDate: string }) {
  const [ms, setMs] = useState(() => timeLeftMs(endDate));
  useEffect(() => {
    const id = setInterval(() => setMs(timeLeftMs(endDate)), 1000);
    return () => clearInterval(id);
  }, [endDate]);
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const units = [
    { label: "يوم", value: days },
    { label: "ساعة", value: hours },
    { label: "دقيقة", value: minutes },
    { label: "ثانية", value: seconds },
  ];
  return (
    <div className="flex items-center justify-center flex-wrap gap-2">
      {units.map((u) => (
        <div key={u.label} className="flex flex-col items-center">
          <div className="glass rounded-xl px-3 py-2 min-w-[56px] text-center">
            <span className="text-2xl font-black tabular-nums text-white">{String(u.value).padStart(2, "0")}</span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ChallengeSection({
  subject,
  isAdmin,
  hasSubjectAccess,
  onOpenAccess,
}: {
  subject: Subject;
  isAdmin: boolean;
  hasSubjectAccess: boolean;
  onOpenAccess: () => void;
}) {
  const studentSession = useAuthStore((s) => s.studentSession);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [medalCounts, setMedalCounts] = useState<Record<string, number>>({});

  useEffect(() => subscribeQuizzesBySubject(subject.id, setQuizzes), [subject.id]);
  useEffect(() => subscribeQuizResults(subject.id, setResults), [subject.id]);
  useEffect(
    () =>
      subscribeStudentMedals((items) => {
        const map: Record<string, number> = {};
        for (const m of items) map[m.username] = m.totalMedals;
        setMedalCounts(map);
      }),
    []
  );

  const visibleQuizzes = useMemo(
    () => quizzes.filter((q) => isAdmin || !q.isHidden),
    [quizzes, isAdmin]
  );
  const myResult = studentSession
    ? results.find((r) => r.username === studentSession.username)
    : undefined;
  const canAccessText = (quiz: Quiz) => isAdmin || quiz.isFree || hasSubjectAccess;

  const endDate = subject.challengeEndDate;
  const [ended, setEnded] = useState(() => (endDate ? Date.now() >= new Date(endDate).getTime() : false));
  useEffect(() => {
    if (!endDate) return;
    const tick = () => setEnded(Date.now() >= new Date(endDate).getTime());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const handleChallengeSubmit = async (answers: Record<number, string>): Promise<QuizOutcome> => {
    const total = activeQuiz?.questions.length ?? 0;
    let correct = 0;
    for (let qi = 0; qi < total; qi++) {
      if (answers[qi] === activeQuiz!.questions[qi]!.correctText) correct++;
    }
    const score = total === 0 ? 0 : Math.round((correct / total) * 100);
    let saved = true;
    let attemptNumber = 1;
    if (studentSession) {
      const res = await submitQuizResult({
        subjectId: subject.id,
        username: studentSession.username,
        studentName: studentSession.displayName,
        score,
        correctCount: correct,
        totalQuestions: total,
      });
      saved = res.saved;
      attemptNumber = res.attempt;
      if (!saved) {
        toast.error("استوفيت محاولاتك بالفعل");
      } else if (attemptNumber === 1) {
        toast.success("تم حفظ نتيجتك — يمكنك المحاولة مرة أخرى لتحسينها");
      } else {
        toast.success("تم حفظ نتيجتك — استوفيت محاولاتك");
      }
    } else {
      toast.error("يجب تسجيل الدخول أولاً لحفظ نتيجتك");
      saved = false;
    }
    return { score, correct, total, attempt: attemptNumber, saved };
  };

  const rankTitle = ended ? "لوحة الشرف — أبطال التحدي" : "لوحة النتائج — أفضل 5";

  return (
    <section className="container mx-auto px-4 pb-8">
      <div
        className="relative overflow-hidden rounded-2xl border border-primary/20 p-6 sm:p-8"
        style={{ background: `linear-gradient(135deg, ${subject.color}22, ${subject.color}08)` }}
      >
        <div
          className="absolute -top-1/2 -right-1/2 h-[300px] w-[300px] rounded-full blur-[80px]"
          style={{ background: subject.color + "22" }}
        />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
<div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg"
                  style={{ backgroundColor: subject.color, boxShadow: `0 6px 20px ${subject.color}66` }}
                >
                  <Trophy className="h-6 w-6 text-white" fill="currentColor" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl sm:text-3xl font-black" style={{ color: subject.color }}>
                      {subject.challengeTitle?.trim() || "ساحة التحدي"}
                    </h2>
                    <span
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow"
                      style={{ backgroundColor: subject.color }}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      اختبارات التحدي
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ended ? "انتهى التحدي — إليك أبطال التحدي" : `الأفضل تسجل أسماؤهم في لوحة الشرف`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {endDate && !ended && (
                  <div className="flex items-center gap-2 rounded-full bg-foreground/5 px-3 py-1.5">
                    <Clock className="h-4 w-4" style={{ color: subject.color }} />
                    <span className="text-sm font-black" style={{ color: subject.color }}>
                      الوقت المتبقي على الانتهاء
                    </span>
                  </div>
                )}
              {ended && endDate && (
                <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm font-bold text-red-600">
                  انتهى التحدي
                </span>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setEditingQuiz(null);
                    setManageOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  إدارة الاختبارات
                </Button>
              )}
            </div>
          </div>

          {endDate && !ended && (
            <div className="mb-5">
              <ChallengeCountdown endDate={endDate} />
            </div>
          )}

          {/* Quiz list */}
          {visibleQuizzes.length > 0 ? (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {visibleQuizzes.map((q) => {
                const accessible = canAccessText(q);
                const attemptsReached = (myResult?.attempts || 0) >= MAX_QUIZ_ATTEMPTS;
                const done = myResult && myResult.score > 0;
                return (
                  <div
                    key={q.id}
                    className="rounded-xl border bg-background/70 p-4 shadow-sm"
                    style={{ borderColor: subject.color + "44" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Play className="h-4 w-4" style={{ color: subject.color }} />
                        {q.title}
                      </h3>
                      {q.isFree && !isAdmin && (
                        <span className="rounded bg-green-500/90 px-1.5 py-0.5 text-[10px] text-white font-bold">
                          مجاني
                        </span>
                      )}
                    </div>
                    {q.description && <p className="text-sm text-muted-foreground mt-1">{q.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {q.questions.length} سؤال{/* */} • محاولتان {attemptsReached && "• استوفيت محاولاتك"}
                      {done && ` • نتيجتك: ${myResult!.score}%`}
                    </p>
                    <div className="mt-3">
                      {accessible ? (
                        <Button
                          size="sm"
                          className="w-full gap-1"
                          disabled={ended || attemptsReached}
                          onClick={() => setActiveQuiz(q)}
                          style={{ backgroundColor: subject.color }}
                        >
                          {ended
                            ? "التحدي انتهى"
                            : attemptsReached
                              ? "استوفيت محاولاتك"
                              : (myResult ? "المحاولة الثانية" : "ابدأ الاختبار")}
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" className="w-full gap-1" onClick={onOpenAccess}>
                          <Lock className="h-4 w-4" />
                          سجّل دخولك للاشتراك
                        </Button>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="mt-2 flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={() => {
                            setEditingQuiz(q);
                            setManageOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" /> تعديل
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={async () => {
                            await toggleQuizFree(q.id, !q.isFree);
                            toast.success(q.isFree ? "أصبح اختباراً مقيّداً" : "أصبح اختباراً مجانياً");
                          }}
                        >
                          {q.isFree ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          {q.isFree ? "تقييد" : "مجاني"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={async () => {
                            await toggleQuizHidden(q.id, !q.isHidden);
                            toast.success(q.isHidden ? "أصبح ظاهراً" : "أصبح مخفياً");
                          }}
                        >
                          {q.isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          {q.isHidden ? "إظهار" : "إخفاء"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs text-red-500"
                          onClick={async () => {
                            if (!confirm("حذف هذا الاختبار؟")) return;
                            await deleteQuiz(q.id);
                            toast.success("تم الحذف");
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> حذف
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-dashed p-6 text-center text-muted-foreground">
              <Ghost className="h-8 w-8 mx-auto mb-2 opacity-40" />
              لا توجد اختبارات بعد{isAdmin ? " — اضغط «إدارة الاختبارات» لإضافة أول تحدٍّ" : ""}
            </div>
          )}

          {/* Leaderboard */}
          <div className="rounded-xl bg-background/70 border p-4" style={{ borderColor: subject.color + "44" }}>
            <div className="mb-3 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-lg font-black">{rankTitle}</h3>
            </div>
            <ChallengeLeaderboard
              results={results}
              subjectColor={subject.color}
              showMedalCounts
              medalCounts={medalCounts}
            />
          </div>
        </div>
      </div>

      {activeQuiz && (
        <QuizRunner
          key={activeQuiz.id}
          quiz={activeQuiz}
          subjectColor={subject.color}
          maxAttempts={MAX_QUIZ_ATTEMPTS}
          locked={ended}
          onSubmit={handleChallengeSubmit}
          onClose={() => setActiveQuiz(null)}
        />
      )}

      {manageOpen && (
        <QuizEditorDialog
          quiz={editingQuiz}
          subjectId={subject.id}
          subjectColor={subject.color}
          onSave={async (payload, id) => {
            if (id) {
              await updateQuiz(id, payload);
              toast.success("تم حفظ التعديلات");
            } else {
              await createQuiz(payload);
              toast.success("تمت إضافة الاختبار");
            }
          }}
          onSaved={() => setEditingQuiz(null)}
          onClose={() => {
            setEditingQuiz(null);
            setManageOpen(false);
          }}
        />
      )}
    </section>
  );
}