import { useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Quiz } from "@/types";

export interface QuizPayload {
  subjectId: string;
  title: string;
  description: string;
  questions: { text: string; options: string[]; correctText: string }[];
  isFree?: boolean;
  isHidden?: boolean;
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

export default function QuizEditorDialog({
  quiz,
  subjectId,
  subjectColor,
  onSave,
  onSaved,
  onClose,
  newTitle = "إضافة اختبار جديد",
  editTitle = "تعديل الاختبار",
}: {
  quiz: Quiz | null;
  subjectId: string;
  subjectColor: string;
  onSave: (payload: QuizPayload, existingId?: string) => Promise<void>;
  onSaved: () => void;
  onClose: () => void;
  newTitle?: string;
  editTitle?: string;
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
      const payload: QuizPayload = {
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
      await onSave(payload, form.id);
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
      <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{form.id ? editTitle : newTitle}</DialogTitle>
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