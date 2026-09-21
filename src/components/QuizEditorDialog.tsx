import { useState, type ClipboardEvent } from "react";
import { toast } from "react-hot-toast";
import { Plus, Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { compressImage, dataUrlBytes } from "@/lib/image";
import {
  getClipboardImageFile,
  prefersClipboardImage,
  htmlToMarkup,
  htmlToMarkupLines,
} from "@/lib/clipboard";
import RichText from "@/components/RichText";
import type { Quiz, QuizQuestion, QuizOption } from "@/types";

export interface QuizPayload {
  subjectId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  isFree?: boolean;
  isHidden?: boolean;
}

interface FormOption {
  id: string;
  text: string;
  image?: string;
}

interface FormQuestion {
  text: string;
  image?: string;
  options: FormOption[];
  correctId: string;
}

interface QuizFormState {
  id?: string;
  title: string;
  description: string;
  questions: FormQuestion[];
}

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

const emptyOption = (): FormOption => ({ id: uid("opt"), text: "", image: undefined });

const emptyQuestion = (): FormQuestion => ({
  text: "",
  image: undefined,
  options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
  correctId: "",
});

const MAX_STORAGE_BYTES = 900_000;

function pickImage(onPicked: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const f = input.files?.[0];
    if (f) onPicked(f);
  };
  input.click();
}

async function readImage(file: File, maxW: number): Promise<string> {
  try {
    return await compressImage(file, { maxW, quality: 0.72 });
  } catch {
    toast.error("تعذر قراءة الصورة");
    throw new Error("image-read-failed");
  }
}

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
            image: q.image ?? undefined,
            options: q.options.map((o) => ({ id: o.id, text: o.text, image: o.image ?? undefined })),
            correctId: q.correctId,
          })),
        }
      : { title: "", description: "", questions: [emptyQuestion()] }
  );
  const [saving, setSaving] = useState(false);

  const setQuestion = (idx: number, patch: Partial<FormQuestion>) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }));
  };

  const addQuestion = () => setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }));
  const removeQuestion = (idx: number) =>
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));
  const setOption = (qi: number, oi: number, patch: Partial<FormOption>) =>
    setQuestion(qi, {
      options: form.questions[qi]!.options.map((o, i) => (i === oi ? { ...o, ...patch } : o)),
    });
  const adjustOptions = (qi: number, delta: number) => {
    const q = form.questions[qi]!;
    let options = [...q.options];
    const target = options.length + delta;
    if (target < 2 || target > 4) return;
    while (options.length < target) options.push(emptyOption());
    options = options.slice(0, target);
    let correctId = q.correctId;
    if (!options.some((o) => o.id === correctId)) correctId = "";
    setQuestion(qi, { options, correctId });
  };

  const importQuestionImage = (qi: number, f: File) =>
    readImage(f, 600)
      .then((img) => {
        setQuestion(qi, { image: img });
        toast.success("أُضيفت الصورة إلى السؤال");
      })
      .catch(() => {});

  const importOptionImage = (qi: number, oi: number, f: File) =>
    readImage(f, 360)
      .then((img) => {
        setOption(qi, oi, { image: img });
        toast.success("أُضيفت الصورة إلى الخيار");
      })
      .catch(() => {});

  const addQuestionImage = (qi: number) => pickImage((f) => void importQuestionImage(qi, f));
  const removeQuestionImage = (qi: number) => setQuestion(qi, { image: undefined });

  const addOptionImage = (qi: number, oi: number) => pickImage((f) => void importOptionImage(qi, oi, f));
  const removeOptionImage = (qi: number, oi: number) => setOption(qi, oi, { image: undefined });

  /** Fills up to 4 option fields from 2..4 markup lines (drop the rest). */
  const fillOptionsFromLines = (qi: number, lines: string[]) => {
    if (lines.length < 2) return;
    if (lines.length > 4) toast("أقصى عدد خيارات 4 — سُجلت أول 4 أسطر فقط");
    const cap = Math.min(lines.length, 4);
    const options = lines.slice(0, cap).map((t) => ({ id: uid("opt"), text: t, image: undefined }));
    setQuestion(qi, { options, correctId: "" });
    toast.success("مُلئت الخيارات من الأسطر الملصقة");
  };

  /** Question field paste: equation image → question image; text → sub/sup markup. */
  const handleQuestionPaste = (qi: number, e: ClipboardEvent<HTMLInputElement>) => {
    const html = e.clipboardData.getData("text/html");
    if (prefersClipboardImage(e, html)) {
      e.preventDefault();
      const file = getClipboardImageFile(e);
      if (!file) return;
      void importQuestionImage(qi, file);
      return;
    }
    if (html && html.trim()) {
      e.preventDefault();
      document.execCommand("insertText", false, htmlToMarkup(html));
    }
  };

  /** Option field paste: equation image → option image; multi-line → auto-fill options. */
  const handleOptionPaste = (qi: number, oi: number, e: ClipboardEvent<HTMLInputElement>) => {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text");

    if (prefersClipboardImage(e, html)) {
      e.preventDefault();
      const file = getClipboardImageFile(e);
      if (!file) return;
      void importOptionImage(qi, oi, file);
      return;
    }

    // Pick the richest multi-line source (rich HTML keeps sub/sup markup when
    // available, otherwise fall back to the plain-text lines).
    const htmlLines = html && html.trim() ? htmlToMarkupLines(html) : [];
    const plainLines = plain
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const lines =
      htmlLines.length >= 2 ? htmlLines : plainLines.length >= 2 ? plainLines : [];

    if (lines.length >= 2) {
      e.preventDefault();
      fillOptionsFromLines(qi, lines);
      return;
    }

    // Single-line paste: preserve sub/sup markup when rich HTML is available.
    if (html && html.trim()) {
      const markup = htmlToMarkup(html).replace(/\s+/g, " ").trim();
      if (markup) {
        e.preventDefault();
        document.execCommand("insertText", false, markup);
      }
      return;
    }
    // Plain single line → default browser paste.
  };

  const validate = (): string | null => {
    if (!form.title.trim()) return "أدخل عنوان الاختبار";
    if (form.questions.length === 0) return "أضف سؤالاً واحداً على الأقل";
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i]!;
      if (!q.text.trim() && !q.image) return `السؤال ${i + 1}: أضف نصاً أو صورة للسؤال`;
      const filled = q.options.filter((o) => o.text.trim() || o.image).length;
      if (filled < 2) return `السؤال ${i + 1}: تحتاج خيارين معبّأين على الأقل (نص أو صورة)`;
      if (!q.options.some((o) => o.id === q.correctId)) return `السؤال ${i + 1}: حدّد الإجابة الصحيحة`;
    }
    let totalBytes = 0;
    for (const q of form.questions) {
      if (q.image) totalBytes += dataUrlBytes(q.image);
      for (const o of q.options) if (o.image) totalBytes += dataUrlBytes(o.image);
    }
    if (totalBytes > MAX_STORAGE_BYTES) {
      return "حجم الصور كبير جداً — استخدم صوراً أصغر أو قلّل عددها في الاختبار";
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
        questions: form.questions.map((q) => {
          const question: QuizQuestion = {
            text: q.text.trim(),
            correctId: q.correctId,
            options: q.options.map((o) => {
              const opt: QuizOption = { id: o.id, text: o.text.trim() };
              if (o.image) opt.image = o.image;
              return opt;
            }),
          };
          if (q.image) question.image = q.image;
          return question;
        }),
        isFree: quiz?.isFree ?? true,
        isHidden: quiz?.isHidden ?? false,
      };
      await onSave(payload, form.id);
      onSaved();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Save quiz error:", e);
      toast.error(`حدث خطأ أثناء حفظ الاختبار — ${msg}`);
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
              <div key={qi} className="space-y-3 rounded-xl border p-3">
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
                  onPaste={(e) => handleQuestionPaste(qi, e)}
                  placeholder="نص السؤال (أو اتركه فارغاً إذا استخدمت صورة)"
                  dir="auto"
                />

                {q.text.trim() && (
                  <p
                    dir="auto"
                    className="rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground break-words"
                  >
                    <RichText text={q.text} />
                  </p>
                )}

                {q.image ? (
                  <div className="flex items-center gap-3 rounded-lg border border-dashed p-2">
                    <img
                      src={q.image}
                      alt="صورة السؤال"
                      className="max-h-40 w-auto max-w-full rounded-md border object-contain"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestionImage(qi)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                      إزالة الصورة
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => addQuestionImage(qi)}
                  >
                    <ImagePlus className="h-4 w-4" />
                    إضافة صورة للسؤال
                  </Button>
                )}

                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="space-y-2 rounded-lg border border-dashed p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          className="h-4 w-4 shrink-0"
                          style={{ accentColor: subjectColor }}
                          checked={q.correctId === opt.id}
                          onChange={() => setQuestion(qi, { correctId: opt.id })}
                          title="تحديد كإجابة صحيحة"
                        />
                        <Input
                          value={opt.text}
                          onChange={(e) => setOption(qi, oi, { text: e.target.value })}
                          onPaste={(e) => handleOptionPaste(qi, oi, e)}
                          placeholder={oi === 0 ? "الخيار الأول — الصّق 1..4 أسطر لملء الخيارات تلقائياً" : `الخيار ${oi + 1}`}
                          dir="rtl"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => addOptionImage(qi, oi)}
                          title="إضافة صورة لهذا الخيار"
                        >
                          <ImagePlus className="h-4 w-4" />
                        </Button>
                      </div>
                      {opt.text.trim() && (
                        <p
                          dir="auto"
                          className="rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground break-words"
                        >
                          <RichText text={opt.text} />
                        </p>
                      )}
                      {opt.image && (
                        <div className="flex items-center gap-3">
                          <img
                            src={opt.image}
                            alt={`صورة الخيار ${oi + 1}`}
                            className="h-20 w-auto max-w-[160px] rounded-md border object-contain"
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeOptionImage(qi, oi)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                            إزالة
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  اختر بالدائرة الإجابة الصحيحة. أضف صورة للخيار أو السؤال متى شئت (تُعرض كاملة بدون قص).
                  الصق عدة أسطر في أي خيار لملء باقي الخيارات تلقائياً.
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