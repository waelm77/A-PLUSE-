import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Navbar from "@/components/Navbar";
import SubjectCard from "@/components/SubjectCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { getSubjects, createSubject } from "@/services/firestore";
import { AVAILABLE_ICONS, COLORS } from "@/lib/constants";
import type { Subject } from "@/types";

export default function Home() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: COLORS[0],
    icon: "BookOpen",
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (e) {
      toast.error("حدث خطأ في تحميل المواد");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await createSubject({
        name: form.name,
        description: form.description,
        color: form.color,
        icon: form.icon,
        code: "",
      });
      toast.success("تم إضافة المادة بنجاح");
      setOpen(false);
      setForm({ name: "", description: "", color: COLORS[0], icon: "BookOpen" });
      await loadSubjects();
    } catch (e) {
      toast.error("حدث خطأ أثناء الإضافة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-20 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-primary/10 rounded-full blur-[50px] sm:blur-[100px]" />
        <div className="container mx-auto max-w-4xl relative">
          <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 mb-6 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse-glow" />
            منصة تعليمية متكاملة
          </div>
          <h1 className="mb-2 text-5xl font-black md:text-7xl leading-tight">
            منصة <span style={{ color: '#FFD700' }}>A+</span>
          </h1>
          <p className="text-xl font-bold text-primary mb-4">د. وائل</p>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            ادرس بذكاء - تقدم بثقة
          </p>
        </div>
      </section>

      {/* Subjects */}
      <section className="container mx-auto px-4 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-3xl font-bold">المواد الدراسية</h2>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  إضافة مادة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>إضافة مادة جديدة</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">اسم المادة</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="مثال: الكيمياء العامة"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="desc">الوصف</Label>
                    <Input
                      id="desc"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="وصف مختصر للمادة"
                    />
                  </div>
                  <div>
                    <Label>اللون</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm({ ...form, color: c })}
                          className={`h-8 w-8 rounded-full border-2 transition-all ${
                            form.color === c ? "border-black scale-110" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>الأيقونة</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {AVAILABLE_ICONS.map(({ name, icon: Icon }) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setForm({ ...form, icon: name })}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-all ${
                            form.icon === name
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "جاري الإضافة..." : "إضافة المادة"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl glass" />
            ))}
          </div>
        ) : subjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl glass p-12 text-center">
            <p className="text-muted-foreground">
              لا توجد مواد متاحة حالياً. {isAdmin && "اضغط على إضافة مادة جديدة لإنشاء مادة."}
            </p>
          </div>
        )}
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        <p>جميع الحقوق محفوظة &copy; 2026 منصة A+ - د. وائل</p>
      </footer>
    </div>
  );
}
