import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  Trash2,
  Plus,
  Video,
  FileText,
  ArrowRight,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { getSubjects, createSubject, deleteSubject, getAllVideos, getAllFiles } from "@/services/firestore";
import { AVAILABLE_ICONS, COLORS } from "@/lib/constants";
import type { Subject } from "@/types";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: COLORS[0],
    icon: "BookOpen",
    code: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subjectsData, videosData, filesData] = await Promise.all([
        getSubjects(),
        getAllVideos(),
        getAllFiles(),
      ]);
      setSubjects(subjectsData);
      setTotalVideos(videosData.length);
      setTotalFiles(filesData.length);
    } catch (e) {
      toast.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await createSubject(form);
      toast.success("تم إضافة المادة بنجاح");
      setOpen(false);
      setForm({ name: "", description: "", color: COLORS[0], icon: "BookOpen", code: "" });
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء الإضافة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المادة؟")) return;
    try {
      await deleteSubject(id);
      toast.success("تم حذف المادة بنجاح");
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background bg-grid">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">
              <span className="text-gradient">لوحة تحكم الأدمن</span>
            </h1>
            <p className="text-muted-foreground">إدارة المواد والمحتوى</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/" className="gap-1">
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">العودة للرئيسية</span>
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card className="glass border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">المواد</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-primary">{subjects.length}</div>
            </CardContent>
          </Card>
          <Card className="glass border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الفيديوهات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black flex items-center gap-2 text-primary">
                <Video className="h-6 w-6" />
                {totalVideos}
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">الملفات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black flex items-center gap-2 text-primary">
                <FileText className="h-6 w-6" />
                {totalFiles}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass border-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">المواد الدراسية</CardTitle>
            <Dialog open={open} onOpenChange={setOpen}>
              <Button size="sm" className="gap-1" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" />
                إضافة مادة
              </Button>
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
                    <Label htmlFor="code">كود التفعيل</Label>
                    <Input
                      id="code"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="سيتم إنشاؤه تلقائياً إذا ترك فارغاً"
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
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : subjects.length > 0 ? (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المادة</TableHead>
                    <TableHead className="hidden sm:table-cell">الوصف</TableHead>
                    <TableHead>كود التفعيل</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => {
                    const Icon =
                      AVAILABLE_ICONS.find((i) => i.name === subject.icon)?.icon || BookOpen;
                    return (
                      <TableRow key={subject.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 items-center justify-center rounded-lg"
                              style={{ backgroundColor: subject.color }}
                            >
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-medium">{subject.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-xs truncate hidden sm:table-cell">
                          {subject.description || "—"}
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{subject.code}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/subject/${subject.id}`}>عرض</Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(subject.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                لا توجد مواد. اضغط على "إضافة مادة" لإنشاء مادة جديدة.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
