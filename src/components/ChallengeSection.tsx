import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Trophy,
  Play,
  Lock,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Ghost,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import ChallengeLeaderboard from "@/components/ChallengeLeaderboard";
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
            <span className="text-2xl font-black tabular-nums">
              {String(u.value).padStart(2, "0")}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

interface QuizFormState {
  id?: string;
  title: string;
  description: string;
  questions: { text: string; options: string[]; correctText: string }[];
}

const emptyQuestion = () => ({
  text: "",
  options: ["", "", "", ""],
  correctText: "",
});

function AdminQuizDialog({
  quiz,
  subjectId,
  subjectColor,
  onSaved,
  onClose,
}: {
  quiz: Quiz | null;
  subjectId: string;
  subjectColor: string;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<QuizFormState>(() =>
    quiz
      ? {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description || "",
          questions: quiz.questions.map((q) => ({
            text: q.text,
            options: q.options.map((o) => o),
            correctText: q.correctText,
          })),
        }
      : { title: "", description: "", questions: [emptyQuestion()] }
  );
  const [saving, setSaving] = useState(false);

  const setQuestion = (idx: number, patch: Partial<QuizFormState["questions"][number]>) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }));
  };

  const addQuestion = () => setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }));
  const removeQuestion = (idx: number) =>
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  const setOption = (qi: number, oi: number, value: string) =>
    setQuestion(qi, {
      options: form.questions[qi]!.options.map((o, i) => (i === oi ? value : o)),
    });
  const adjustOptions = (qi: number, delta: number) => {
    const q = form.questions[qi]!;
    let options = [...q.options];
    const target = options.length + delta;
    if (target < 2 || target > 4) return;
    while (options.length < target) options.push("");
    options = options.slice(0, target);
    let correctText = q.correctText;
    if (!options.includes(correctText)) correctText = "";
    setQuestion(qi, { options, correctText });
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return "أدخل عنوان الاختبار";
    if (form.questions.length === 0) return "أضف سؤالاً واحداً على الأقل";
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i]!;
      if (!q.text.trim()) return `السؤال ${i + 1} بلا نص`;
      const filled = q.options.filter((o) => o.trim()).length;
      if (filled < 2) return `السؤال ${i + 1}: تحتاج خيارين ناجحين على الأقل`;
      const unique = new Set(q.options.map((o) => o.trim()).filter(Boolean));
      if (unique.size !== filled) return `السؤال ${i + 1}: يوجد خياران متطابقان`;
      if (!q.options.includes(q.correctText)) return `السؤال ${i + 1}: حدّد الإجابة الصحيحة`;
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setSaving(true);
    try {
      const payload: Omit<Quiz, "id" | "createdAt"> = {
        subjectId,
        title: form.title.trim(),
        description: form.description.trim(),
        questions: form.questions.map((q) => ({
          text: q.text.trim(),
          options: q.options.map((o) => o.trim()),
          correctText: q.correctText.trim(),
        })),
        isFree: quiz?.isFree ?? true,
        isHidden: quiz?.isHidden ?? false,
      };
      if (form.id) {
        await updateQuiz(form.id, payload);
        toast.success("تم حفظ التعديلات");
      } else {
        await createQuiz(payload);
        toast.success("تمت إضافة الاختبار");
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error("Save quiz error:", e);
      toast.error("حدث خطأ أثناء حفظ الاختبار");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{form.id ? "تعديل الاختبار" : "إضافة اختبار جديد"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>عنوان الاختبار</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: اختبار الفصل الأول"
              className="mt-1"
            />
          </div>
          <div>
            <Label>وصف (اختياري)</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="وصف قصير"
              className="mt-1"
            />
          </div>

          <div className="space-y-4">
            {form.questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>السؤال {qi + 1}</Label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => adjustOptions(qi, -1)}
                      disabled={q.options.length <= 2}
                    >
                      -
                    </Button>
                    <span className="text-xs text-muted-foreground">{q.options.length} خيارات</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => adjustOptions(qi, 1)}
                      disabled={q.options.length >= 4}
                    >
                      +
                    </Button>
                    {form.questions.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qi)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  value={q.text}
                  onChange={(e) => setQuestion(qi, { text: e.target.value })}
                  placeholder="نص السؤال"
                />
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      className="w-4 h-4 shrink-0"
                      style={{ accentColor: subjectColor }}
                      checked={q.correctText === opt}
                      onChange={() => setQuestion(qi, { correctText: opt })}
                    />
                    <Input
                      value={opt}
                      onChange={(e) => setOption(qi, oi, e.target.value)}
                      placeholder={oi === 0 ? "الخيار الصحيح" : `الخيار ${oi + 1}`}
                      dir="rtl"
                    />
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  اختر بالدائرة الإجابة الصحيحة (المقارنة تتم بالنص، والخيارات تُخلَّط تلقائياً عند الاختبار).
                </p>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" className="w-full gap-2" onClick={addQuestion}>
            <Plus className="h-4 w-4" />
            إضافة سؤال
          </Button>

          <Button type="button" className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ..." : form.id ? "حفظ التعديلات" : "إضافة الاختبار"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
  const [attempt, setAttempt] = useState<{ qOrder: number[]; optOrders: number[][] } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultView, setResultView] = useState<{
    quiz: Quiz;
    score: number;
    correct: number;
    total: number;
    attempt: number;
    saved: boolean;
  } | null>(null);

  const [manageOpen, setManageOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const startQuiz = (quiz: Quiz) => {
    const order = {
      qOrder: shuffle(quiz.questions.map((_, i) => i)),
      optOrders: quiz.questions.map((q) => shuffle(q.options.map((_, oi) => oi))),
    };
    setAttempt(order);
    setAnswers({});
    setResultView(null);
    setActiveQuiz(quiz);
  };

  const submitAnswer = async () => {
    if (!activeQuiz || !attempt) return;
    const total = activeQuiz.questions.length;
    let correct = 0;
    for (let qi = 0; qi < total; qi++) {
      if (answers[qi] === activeQuiz.questions[qi]!.correctText) correct++;
    }
    const score = total === 0 ? 0 : Math.round((correct / total) * 100);
    setSubmitting(true);
    try {
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
      }
      setResultView({ quiz: activeQuiz, score, correct, total, attempt: attemptNumber, saved });
    } catch (e) {
      console.error("Submit quiz error:", e);
      toast.error("حدث خطأ أثناء حفظ نتيجتك");
      setResultView({ quiz: activeQuiz, score, correct, total, attempt: (myResult?.attempts || 0) + 1, saved: true });
    } finally {
      setSubmitting(false);
    }
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
                <h2 className="text-2xl sm:text-3xl font-black" style={{ color: subject.color }}>
                  {subject.challengeTitle?.trim() || "منصة التحدي"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {ended ? "تم انتهاء التحدي — إليك أبطال العهد" : `الأفضل يسجلون أسمائهم في لوحة الشرف`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {endDate && !ended && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-bold">الوقت المتبقي على الانتهاء</span>
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
                          onClick={() => startQuiz(q)}
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
              <span className="text-xs text-muted-foreground">(يُحدَّث تلقائياً بعد كل اختبار)</span>
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

      {/* Take quiz dialog */}
      <Dialog
        open={!!activeQuiz}
        onOpenChange={(o) => {
          if (!o) {
            setActiveQuiz(null);
            setResultView(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" style={{ color: subject.color }} />
              {activeQuiz?.title}
            </DialogTitle>
          </DialogHeader>

          {activeQuiz && !resultView && attempt && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitAnswer();
              }}
              className="space-y-5"
            >
              <p className="text-xs text-muted-foreground">
                الخيارات والأسئلة تُخلَّط عشوائياً في كل محاولة — أجِب عن جميع الأسئلة ثم اضغط "إنهاء وتصحيح".
              </p>
              {attempt.qOrder.map((qi, orderIdx) => {
                const q = activeQuiz.questions[qi]!;
                const optionIds = attempt.optOrders[qi]!;
                return (
                  <div key={qi} className="rounded-xl border p-4">
                    <p className="font-bold mb-3">
                      <span className="text-muted-foreground">{orderIdx + 1}.</span> {q.text}
                    </p>
                    <div className="space-y-2">
                      {optionIds.map((oi) => (
                        <label
                          key={oi}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-all ${
                            answers[qi] === q.options[oi] ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`answer-${qi}`}
                            className="w-4 h-4"
                            checked={answers[qi] === q.options[oi]}
                            onChange={() => setAnswers((a) => ({ ...a, [qi]: q.options[oi]! }))}
                            required
                          />
                          <span>{q.options[oi]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={submitting || Object.keys(answers).length !== activeQuiz.questions.length}
                style={{ backgroundColor: subject.color }}
              >
                {submitting ? "جاري الحفظ والتصحيح..." : "إنهاء وتصحيح"}
              </Button>
            </form>
          )}

          {activeQuiz && resultView && (
            <div className="space-y-4">
              <div className="rounded-xl p-6 text-center" style={{ background: subject.color + "18" }}>
                <p className="text-4xl font-black" style={{ color: subject.color }}>
                  {resultView.score}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  أجبت على {resultView.correct} من {resultView.total} إجابة صحيحة
                </p>
                {resultView.attempt === 1 && resultView.saved ? (
                  <p className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-bold text-amber-600">
                    يمكنك المحاولة مرة أخرى لتحسين نتيجتك — تبقى لك محاولة واحدة
                  </p>
                ) : resultView.attempt >= 2 ? (
                  <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-bold text-red-600">
                    استوفيت محاولاتك
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">لم تُحفظ نتيجتك — سجّل دخولك أولاً.</p>
                )}
              </div>

              <div className="space-y-3">
                {activeQuiz.questions.map((q, qi) => {
                  const studentAnswer = answers[qi];
                  const isCorrect = studentAnswer === q.correctText;
                  return (
                    <div key={qi} className={`rounded-xl border p-3 ${isCorrect ? "border-green-500/40" : "border-red-500/30"}`}>
                      <p className="font-bold text-sm">
                        <span className="text-muted-foreground">{qi + 1}.</span> {q.text}
                      </p>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className={isCorrect ? "text-green-600 flex items-center gap-1" : "text-red-600 flex items-center gap-1"}>
                          {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          إجابتك: {studentAnswer || "لم تُجب"}
                        </p>
                        {!isCorrect && (
                          <p className="text-green-700 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            الصحيح: {q.correctText}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  disabled={ended || (myResult?.attempts || 0) >= MAX_QUIZ_ATTEMPTS}
                  onClick={() => startQuiz(activeQuiz)}
                >
                  إعادة المحاولة
                </Button>
                <Button className="flex-1" onClick={() => setActiveQuiz(null)}>
                  العودة للوحة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {manageOpen && (
        <AdminQuizDialog
          quiz={editingQuiz}
          subjectId={subject.id}
          subjectColor={subject.color}
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