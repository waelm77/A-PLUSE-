import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  XCircle,
  PartyPopper,
  ThumbsUp,
  Target,
  ListChecks,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import RichText from "@/components/RichText";
import QuizWatermark from "@/components/QuizWatermark";
import type { Quiz } from "@/types";

export interface QuizOutcome {
  score: number;
  correct: number;
  total: number;
  attempt: number;
  saved: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function unlimitedAttemps(maxAttempts: number) {
  return maxAttempts >= 999;
}

export default function QuizRunner({
  quiz,
  subjectColor,
  maxAttempts,
  celebrate = false,
  locked = false,
  onSubmit,
  onClose,
}: {
  quiz: Quiz;
  subjectColor: string;
  maxAttempts: number;
  celebrate?: boolean;
  locked?: boolean;
  onSubmit: (answers: Record<number, string>) => Promise<QuizOutcome>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"take" | "result">("take");
  const [attempt, setAttempt] = useState<{ qOrder: number[]; optOrders: number[][] }>(() => ({
    qOrder: shuffle(quiz.questions.map((_, i) => i)),
    optOrders: quiz.questions.map((q) => shuffle(q.options.map((_, oi) => oi))),
  }));
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const [showReview, setShowReview] = useState(true);

  const restart = () => {
    setPhase("take");
    setAttempt({
      qOrder: shuffle(quiz.questions.map((_, i) => i)),
      optOrders: quiz.questions.map((q) => shuffle(q.options.map((_, oi) => oi))),
    });
    setAnswers({});
    setOutcome(null);
  };

  const handleSubmit = () => {
    setSubmitting(true);
    onSubmit(answers)
      .then((res) => {
        setOutcome(res);
        setShowReview(!(celebrate && res.saved && res.score >= 80));
        setPhase("result");
      })
      .catch((e) => {
        console.error("Submit quiz error:", e);
        setOutcome({
          score: 0,
          correct: 0,
          total: quiz.questions.length,
          attempt: 1,
          saved: false,
        });
        setShowReview(true);
        setPhase("result");
      })
      .finally(() => setSubmitting(false));
  };

  const celebration = () => {
    if (!celebrate || !outcome?.saved) return null;
    const s = outcome.score;
    if (s >= 80)
      return {
        icon: PartyPopper,
        text: "أحسنت واصل التقدم 🎉",
        classes: "bg-green-500/15 text-green-600",
      };
    if (s >= 60)
      return {
        icon: ThumbsUp,
        text: "جيد يا بطل 💪",
        classes: "bg-amber-500/15 text-amber-600",
      };
    return {
      icon: Target,
      text: "تحتاج للتركيز واصل التقدم يا بطل 🚀",
      classes: "bg-orange-500/15 text-orange-600",
    };
  };

  const attemptBanner = () => {
    if (!outcome) return null;
    if (!outcome.saved)
      return (
        <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm font-bold text-muted-foreground">
          لم تُحفظ نتيجتك — سجّل دخولك أولاً.
        </p>
      );
    const unlimited = unlimitedAttemps(maxAttempts);
    const left = maxAttempts - outcome.attempt;
    if (!unlimited && left <= 0)
      return (
        <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm font-bold text-red-600">
          استوفيت محاولاتك
        </p>
      );
    return (
      <p className="mt-3 rounded-lg bg-amber-500/15 px-3 py-2 text-sm font-bold text-amber-600">
        يمكنك المحاولة مرة أخرى لتحسين نتيجتك
        {unlimited ? " — المحاولات غير محدودة" : left === 1 ? " — تبقى لك محاولة واحدة" : ` — عدد المحاولات المتبقية: ${left}`}
      </p>
    );
  };

  const celebrationMsg = celebration();
  const retakeDisabled = locked || (!unlimitedAttemps(maxAttempts) && !!outcome && outcome.attempt >= maxAttempts);

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-w-2xl max-h-[88vh] overflow-y-auto select-none"
        dir="rtl"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="relative">
          <QuizWatermark />
          <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" style={{ color: subjectColor }} />
            {quiz.title}
          </DialogTitle>
        </DialogHeader>

        {phase === "take" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="space-y-5"
          >
            <p className="text-xs text-muted-foreground">
              الخيارات والأسئلة تُخلَّط عشوائياً في كل محاولة — أجِب عن جميع الأسئلة ثم اضغط "إنهاء وتصحيح".
            </p>
            {attempt.qOrder.map((qi, orderIdx) => {
              const q = quiz.questions[qi]!;
              const optionIds = attempt.optOrders[qi]!;
              return (
                <div key={qi} className="rounded-xl border p-4">
                  <p className="font-bold mb-3" dir="auto">
                    <span className="text-muted-foreground">{orderIdx + 1}.</span> <RichText text={q.text} />
                  </p>
                  {q.image && (
                    <img
                      src={q.image}
                      alt="صورة السؤال"
                      className="mx-auto mb-3 max-h-52 w-auto max-w-full rounded-xl border object-contain"
                    />
                  )}
                  <div className="space-y-2">
                    {optionIds.map((oi) => {
                      const opt = q.options[oi]!;
                      return (
                        <label
                          key={oi}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-all ${
                            answers[qi] === opt.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`answer-${qi}`}
                            className="w-4 h-4"
                            checked={answers[qi] === opt.id}
                            onChange={() => setAnswers((a) => ({ ...a, [qi]: opt.id }))}
                            required
                          />
                          {opt.image && (
                            <img
                              src={opt.image}
                              alt={`خيار ${oi + 1}`}
                              className="max-h-20 w-auto max-w-[120px] rounded-md border object-contain"
                            />
                          )}
                          {opt.text && <RichText text={opt.text} />}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={submitting || Object.keys(answers).length !== quiz.questions.length}
              style={{ backgroundColor: subjectColor }}
            >
              {submitting ? "جاري الحفظ والتصحيح..." : "إنهاء وتصحيح"}
            </Button>
          </form>
        )}

        {phase === "result" && outcome && (
          <div className="space-y-4">
            <div className="rounded-xl p-6 text-center" style={{ background: subjectColor + "18" }}>
              <p className="text-4xl font-black" style={{ color: subjectColor }}>
                {outcome.correct}/{outcome.total}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {outcome.correct} إجابات صحيحة من أصل {outcome.total} — كل سؤال بدرجة واحدة
              </p>

              {celebrationMsg && (
                <div className={`mt-3 flex items-center justify-center gap-2 rounded-xl px-4 py-3 ${celebrationMsg.classes}`}>
                  <celebrationMsg.icon className="h-6 w-6" />
                  <span className="text-lg font-black">{celebrationMsg.text}</span>
                </div>
              )}
            </div>

            {/* Review toggle */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowReview((s) => !s)}
            >
              <ListChecks className="h-4 w-4" />
              {showReview ? "إخفاء مراجعة الإجابات" : "مراجعة الإجابات"}
            </Button>

            {showReview && (
              <div className="space-y-3">
                {quiz.questions.map((q, qi) => {
                  const studentAnswer = answers[qi];
                  const isCorrect = studentAnswer === q.correctId;
                  return (
                    <div
                      key={qi}
                      className={`rounded-xl border p-3 ${isCorrect ? "border-green-500/40" : "border-red-500/30"}`}
                    >
                      <p className="font-bold text-sm" dir="auto">
                        <span className="text-muted-foreground">{qi + 1}.</span> <RichText text={q.text} />
                      </p>
                      {q.image && (
                        <img
                          src={q.image}
                          alt="صورة السؤال"
                          className="mt-2 max-h-36 w-auto max-w-full rounded-lg border object-contain"
                        />
                      )}
                      <div className="mt-2 space-y-2">
                        {q.options.map((opt, oi) => {
                          const isChosen = opt.id === studentAnswer;
                          const isRight = opt.id === q.correctId;
                          let cls = "border-border text-muted-foreground";
                          let icon: ReactNode = null;
                          let tag: ReactNode = null;
                          if (isRight) {
                            cls = "border-green-500/50 bg-green-500/10 text-green-700 font-bold";
                            icon = <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />;
                            tag = <span className="mr-auto text-[11px] text-green-600">الإجابة الصحيحة</span>;
                          } else if (isChosen) {
                            cls = "border-red-500/50 bg-red-500/10 text-red-600 font-bold";
                            icon = <XCircle className="h-4 w-4 shrink-0 text-red-500" />;
                            tag = <span className="mr-auto text-[11px] text-red-500">إجابتك</span>;
                          }
                          return (
                            <div key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${cls}`}>
                              {icon}
                              {opt.image && (
                                <img
                                  src={opt.image}
                                  alt={`خيار ${oi + 1}`}
                                  className="h-10 w-auto max-w-[80px] rounded border object-contain"
                                />
                              )}
{opt.text && <RichText text={opt.text} />}
                              {tag}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={retakeDisabled} onClick={restart}>
                إعادة المحاولة
              </Button>
              <Button className="flex-1" onClick={onClose}>
                إنهاء
              </Button>
            </div>
            {attemptBanner()}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}