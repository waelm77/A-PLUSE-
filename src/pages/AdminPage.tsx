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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Trash2,
  Plus,
  Video,
  FileText,
  ArrowRight,
  Users,
  User,
  Smartphone,
  Laptop,
  CheckCircle2,
  XCircle,
  Edit,
  ScrollText,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import {
  getSubjects,
  createSubject,
  deleteSubject,
  updateSubject,
  getAllVideos,
  getAllFiles,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  removeDevice,
  getTicker,
  updateTicker,
} from "@/services/firestore";
import { AVAILABLE_ICONS, COLORS } from "@/lib/constants";
import type { Subject, Student, Ticker } from "@/types";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // ─── Subjects State ──
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: COLORS[0],
    icon: "BookOpen",
    code: "",
    tickerText: "",
    tickerColor: "#FFD700",
    tickerActive: false,
    tickerSpeed: 20,
  });

  // ─── Ticker handlers ──
  const loadTicker = async () => {
    try {
      const data = await getTicker();
      setTicker(data);
    } catch (e) {
      console.error("Load ticker error:", e);
    } finally {
      setTickerLoading(false);
    }
  };

  const handleTickerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTickerSaving(true);
    try {
      await updateTicker(ticker);
      toast.success("تم حفظ الإعدادات");
    } catch (e) {
      console.error("Save ticker error:", e);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setTickerSaving(false);
    }
  };

  // ─── Students State ──
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentForm, setStudentForm] = useState({
    username: "",
    password: "",
    displayName: "",
    enrolledSubjects: [] as string[],
  });
  const [studentSubmitting, setStudentSubmitting] = useState(false);
  const [devicesDialogStudent, setDevicesDialogStudent] = useState<Student | null>(null);

  // ─── Ticker State ──
  const [ticker, setTicker] = useState<Ticker>({ text: "", color: "#FFD700", active: false, speed: 20 });
  const [tickerLoading, setTickerLoading] = useState(true);
  const [tickerSaving, setTickerSaving] = useState(false);

  useEffect(() => {
    loadData();
    loadStudents();
    loadTicker();
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

  const loadStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (e) {
      toast.error("حدث خطأ في تحميل الطلاب");
    } finally {
      setStudentsLoading(false);
    }
  };

  // ─── Subject handlers ──
  const openSubjectDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setForm({
        name: subject.name,
        description: subject.description,
        color: subject.color,
        icon: subject.icon,
        code: subject.code,
        tickerText: subject.tickerText || "",
        tickerColor: subject.tickerColor || "#FFD700",
        tickerActive: subject.tickerActive || false,
        tickerSpeed: subject.tickerSpeed || 20,
      });
    } else {
      setEditingSubject(null);
      setForm({ name: "", description: "", color: COLORS[0], icon: "BookOpen", code: "", tickerText: "", tickerColor: "#FFD700", tickerActive: false, tickerSpeed: 20 });
    }
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const subjectData = {
        name: form.name,
        description: form.description,
        color: form.color,
        icon: form.icon,
        code: form.code,
        tickerText: form.tickerText || "",
        tickerColor: form.tickerColor || "#FFD700",
        tickerActive: form.tickerActive || false,
        tickerSpeed: form.tickerSpeed || 20,
      };
      if (editingSubject) {
        await updateSubject(editingSubject.id, subjectData);
        toast.success("تم تعديل المادة بنجاح");
      } else {
        await createSubject(subjectData);
        toast.success("تم إضافة المادة بنجاح");
      }
      setOpen(false);
      setEditingSubject(null);
      setForm({ name: "", description: "", color: COLORS[0], icon: "BookOpen", code: "", tickerText: "", tickerColor: "#FFD700", tickerActive: false, tickerSpeed: 20 });
      await loadData();
    } catch (e) {
      toast.error(editingSubject ? "حدث خطأ أثناء التعديل" : "حدث خطأ أثناء الإضافة");
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

  // ─── Student handlers ──
  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({ username: "", password: "", displayName: "", enrolledSubjects: [] });
    setStudentDialogOpen(true);
  };

  const openEditStudent = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      username: student.username,
      password: "",
      displayName: student.displayName,
      enrolledSubjects: student.enrolledSubjects,
    });
    setStudentDialogOpen(true);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.username.trim() || !studentForm.displayName.trim()) return;
    if (!editingStudent && !studentForm.password.trim()) {
      toast.error("يرجى إدخال كلمة السر");
      return;
    }
    setStudentSubmitting(true);
    try {
      if (editingStudent) {
        const updates: any = {
          displayName: studentForm.displayName,
          enrolledSubjects: studentForm.enrolledSubjects,
        };
        if (studentForm.password.trim()) {
          updates.password = studentForm.password;
        }
        await updateStudent(editingStudent.id, updates);
        toast.success("تم تعديل الطالب بنجاح");
      } else {
        if (!studentForm.password.trim()) {
          toast.error("يرجى إدخال كلمة السر");
          setStudentSubmitting(false);
          return;
        }
        await createStudent(studentForm);
        toast.success("تم إضافة الطالب بنجاح");
      }
      setStudentDialogOpen(false);
      await loadStudents();
    } catch (e) {
      console.error("Save student error:", e);
      toast.error("حدث خطأ أثناء حفظ الطالب");
    } finally {
      setStudentSubmitting(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;
    try {
      await deleteStudent(id);
      toast.success("تم حذف الطالب بنجاح");
      await loadStudents();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleRemoveDevice = async (studentId: string, deviceId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟ سيمكن الطالب من تسجيل جهاز جديد.")) return;
    try {
      await removeDevice(studentId, deviceId);
      toast.success("تم حذف الجهاز بنجاح");
      await loadStudents();
      const updated = await getStudents();
      const found = updated.find((s) => s.id === studentId);
      if (found) setDevicesDialogStudent(found);
    } catch (e) {
      toast.error("حدث خطأ أثناء حذف الجهاز");
    }
  };

  const toggleSubjectForStudent = (subjectId: string) => {
    setStudentForm((prev) => {
      const exists = prev.enrolledSubjects.includes(subjectId);
      return {
        ...prev,
        enrolledSubjects: exists
          ? prev.enrolledSubjects.filter((id) => id !== subjectId)
          : [...prev.enrolledSubjects, subjectId],
      };
    });
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
            <p className="text-muted-foreground">إدارة المواد والطلاب</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/" className="gap-1">
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">العودة للرئيسية</span>
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="subjects" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="subjects" className="gap-2">
              <BookOpen className="h-4 w-4" />
              المواد الدراسية
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <Users className="h-4 w-4" />
              إدارة الطلاب
            </TabsTrigger>
            <TabsTrigger value="ticker" className="gap-2">
              <ScrollText className="h-4 w-4" />
              الشريط المتحرك
            </TabsTrigger>
          </TabsList>

          {/* ════════ Subjects Tab ════════ */}
          <TabsContent value="subjects">
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
                <Dialog open={open} onOpenChange={(o) => { if (!o) { setEditingSubject(null); } setOpen(o); }}>
                  <Button size="sm" className="gap-1" onClick={() => openSubjectDialog()}>
                    <Plus className="h-4 w-4" />
                    إضافة مادة
                  </Button>
                  <DialogContent className="max-w-md overflow-y-auto max-h-[85vh]" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>{editingSubject ? "تعديل المادة" : "إضافة مادة جديدة"}</DialogTitle>
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
                        <Label htmlFor="code">كود المادة</Label>
                        <Input
                          id="code"
                          value={form.code}
                          onChange={(e) => setForm({ ...form, code: e.target.value })}
                          placeholder="كود تعريف المادة (للرجوع إليه)"
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

                      <div className="rounded-lg border p-3 space-y-3">
                        <p className="text-sm font-medium">الشريط المتحرك للمادة</p>
                        <div>
                          <Label>نص الشريط</Label>
                          <Input
                            value={form.tickerText}
                            onChange={(e) => setForm({ ...form, tickerText: e.target.value })}
                            placeholder="نص يظهر في شريط متحرك عند فتح المادة"
                            dir="auto"
                          />
                        </div>
                        <div>
                          <Label>لون النص</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF8C00", "#00CED1", "#FF1493"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setForm({ ...form, tickerColor: c })}
                                className={`h-8 w-8 rounded-full border-2 transition-all ${
                                  form.tickerColor === c ? "border-black scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>سرعة الحركة ({form.tickerSpeed} ثانية)</Label>
                          <input
                            type="range"
                            min="5"
                            max="60"
                            value={form.tickerSpeed}
                            onChange={(e) => setForm({ ...form, tickerSpeed: Number(e.target.value) })}
                            className="w-full mt-2"
                          />
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="subject-ticker-active"
                            checked={form.tickerActive}
                            onChange={(e) => setForm({ ...form, tickerActive: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <Label htmlFor="subject-ticker-active" className="mb-0">إظهار الشريط في صفحة المادة</Label>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={submitting}
                      >
                        {submitting ? "جاري الحفظ..." : editingSubject ? "حفظ التعديلات" : "إضافة المادة"}
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
                          <TableHead>الكود</TableHead>
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
                                    variant="outline"
                                    onClick={() => openSubjectDialog(subject)}
                                  >
                                    <Edit className="h-4 w-4" />
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
          </TabsContent>

          {/* ════════ Students Tab ════════ */}
          <TabsContent value="students">
            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              <Card className="glass border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الطلاب</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black text-primary flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    {students.length}
                  </div>
                </CardContent>
              </Card>
              <Card className="glass border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">الأجهزة المسجلة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black text-primary flex items-center gap-2">
                    <Smartphone className="h-6 w-6" />
                    {students.reduce((sum, s) => sum + s.devices.length, 0)}
                  </div>
                </CardContent>
              </Card>
              <Card className="glass border-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">الطلاب النشطون</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-black text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6" />
                    {students.filter((s) => s.isActive).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Students Table */}
            <Card className="glass border-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold">قائمة الطلاب</CardTitle>
                <Button size="sm" className="gap-1" onClick={openAddStudent}>
                  <Plus className="h-4 w-4" />
                  إضافة طالب
                </Button>
              </CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>اسم المستخدم</TableHead>
                          <TableHead>الاسم</TableHead>
                          <TableHead className="hidden sm:table-cell">المواد</TableHead>
                          <TableHead className="hidden sm:table-cell">الأجهزة</TableHead>
                          <TableHead>الحالة</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>
                              <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{student.username}</code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{student.displayName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {student.enrolledSubjects.length} مادة
                              </span>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1"
                                onClick={() => setDevicesDialogStudent(student)}
                              >
                                {student.devices.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">لا يوجد</span>
                                ) : (
                                  <>
                                    <Smartphone className="h-3 w-3" />
                                    <span>{student.devices.length}/2</span>
                                  </>
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              {student.isActive ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                  <CheckCircle2 className="h-3 w-3" />
                                  نشط
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                  <XCircle className="h-3 w-3" />
                                  موقوف
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="p-2 h-auto"
                                  onClick={() => openEditStudent(student)}
                                  title="تعديل"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="p-2 h-auto"
                                  onClick={() => handleDeleteStudent(student.id)}
                                  title="حذف"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    لا يوجد طلاب. اضغط على "إضافة طالب" لإنشاء طالب جديد.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ Ticker Tab ════════ */}
          <TabsContent value="ticker">
            <Card className="glass border-none">
              <CardHeader>
                <CardTitle className="text-xl font-bold">إعدادات الشريط المتحرك</CardTitle>
              </CardHeader>
              <CardContent>
                {tickerLoading ? (
                  <div className="h-32 animate-pulse rounded bg-muted" />
                ) : (
                  <form onSubmit={handleTickerSubmit} className="space-y-4 max-w-lg">
                    <div>
                      <Label>النص (يدعم العربية والإنجليزية)</Label>
                      <textarea
                        value={ticker.text}
                        onChange={(e) => setTicker({ ...ticker, text: e.target.value })}
                        placeholder="اكتب النص هنا..."
                        rows={3}
                        className="mt-2 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        dir="auto"
                      />
                    </div>
                    <div>
                      <Label>لون النص</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#FF8C00", "#00CED1", "#FF1493"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTicker({ ...ticker, color: c })}
                            className={`h-8 w-8 rounded-full border-2 transition-all ${
                              ticker.color === c ? "border-black scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>سرعة الحركة ({ticker.speed || 20} ثانية)</Label>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={ticker.speed || 20}
                        onChange={(e) => setTicker({ ...ticker, speed: Number(e.target.value) })}
                        className="w-full mt-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>سريع</span>
                        <span>بطيء</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="ticker-active"
                        checked={ticker.active}
                        onChange={(e) => setTicker({ ...ticker, active: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="ticker-active" className="mb-0">إظهار الشريط في الصفحة الرئيسية</Label>
                    </div>
                    <Button type="submit" disabled={tickerSaving}>
                      {tickerSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ════ Add / Edit Student Dialog ════ */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingStudent ? "تعديل طالب" : "إضافة طالب جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStudentSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="s-username">اسم المستخدم</Label>
              <Input
                id="s-username"
                value={studentForm.username}
                onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                placeholder="مثال: ahmed_2026"
                required
                disabled={!!editingStudent}
              />
            </div>
            <div>
              <Label htmlFor="s-password">
                {editingStudent ? "كلمة السر (اترك فارغًا إن لم ترد التغيير)" : "كلمة السر"}
              </Label>
              <Input
                id="s-password"
                type="text"
                value={studentForm.password}
                onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                placeholder={editingStudent ? "اترك فارغًا للإبقاء على القديمة" : "مثال: Ahmed@123"}
                required={!editingStudent}
              />
            </div>
            <div>
              <Label htmlFor="s-name">اسم الطالب</Label>
              <Input
                id="s-name"
                value={studentForm.displayName}
                onChange={(e) => setStudentForm({ ...studentForm, displayName: e.target.value })}
                placeholder="مثال: أحمد محمد"
                required
              />
            </div>
            <div>
              <Label>المواد المشترك فيها</Label>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-2 rounded-lg border p-3">
                {subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد مواد. أضف مواد أولاً.</p>
                ) : (
                  subjects.map((subject) => {
                    const isChecked = studentForm.enrolledSubjects.includes(subject.id);
                    return (
                      <label
                        key={subject.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSubjectForStudent(subject.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div
                          className="h-6 w-6 rounded flex items-center justify-center"
                          style={{ backgroundColor: subject.color }}
                        >
                          {(() => {
                            const Icon = AVAILABLE_ICONS.find((i) => i.name === subject.icon)?.icon || BookOpen;
                            return <Icon className="h-3 w-3 text-white" />;
                          })()}
                        </div>
                        <span className="text-sm font-medium">{subject.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={studentSubmitting}>
              {studentSubmitting
                ? "جاري الحفظ..."
                : editingStudent
                  ? "حفظ التعديلات"
                  : "إضافة الطالب"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════ Devices Dialog ════ */}
      <Dialog
        open={!!devicesDialogStudent}
        onOpenChange={(open) => !open && setDevicesDialogStudent(null)}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              أجهزة الطالب: {devicesDialogStudent?.displayName}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {devicesDialogStudent && devicesDialogStudent.devices.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                لا توجد أجهزة مسجلة لهذا الطالب
              </p>
            )}
            {devicesDialogStudent?.devices.map((device, idx) => (
              <Card key={device.deviceId} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {device.deviceName.includes("Chrome") || device.deviceName.includes("Edge") ? (
                        <Laptop className="h-8 w-8 text-primary/60" />
                      ) : (
                        <Smartphone className="h-8 w-8 text-primary/60" />
                      )}
                      <div>
                        <p className="font-medium text-sm">الجهاز {idx + 1}</p>
                        <p className="text-xs text-muted-foreground">{device.deviceName}</p>
                        <p className="text-xs text-muted-foreground">
                          آخر وصول: {new Date(device.lastAccess).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="p-2 h-auto"
                      onClick={() => handleRemoveDevice(devicesDialogStudent!.id, device.deviceId)}
                      title="حذف الجهاز"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {devicesDialogStudent && devicesDialogStudent.devices.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                يمكنك حذف أحد الأجهزة القديمة للسماح للطالب بتسجيل جهاز جديد
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
