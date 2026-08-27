import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
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
  Clock,
  Calendar,
  Search,
  BarChart3,
  Eye,
  Flame,
  Timer,
  TrendingUp,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useTrialStore } from "@/store/trialStore";
import toast from "react-hot-toast";
import {
  getSubjects,
  createSubject,
  deleteSubject,
  updateSubject,
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  removeDevice,
  getTicker,
  updateTicker,
  getAdmins,
  getStats,
  resetStats,
} from "@/services/firestore";
import { AVAILABLE_ICONS, COLORS } from "@/lib/constants";
import type { Subject, Student, Ticker, Admin, StatsData } from "@/types";

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

  // ─── Analytics State ──
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  const loadStats = async () => {
    try {
      const data = await getStats();
      setStats(data);
    } catch (e) {
      console.error("Load stats error:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleResetStats = async () => {
    if (!confirm("هل أنت متأكد من مسح كل الإحصائيات؟\nسيبدأ العد من الصفر ولن يمكن التراجع.")) return;
    setResetting(true);
    try {
      await resetStats();
      await loadStats();
      toast.success("تم مسح الإحصائيات، بدأ العد من الصفر");
    } catch (e) {
      console.error("Reset stats error:", e);
      toast.error("حدث خطأ أثناء مسح الإحصائيات");
    } finally {
      setResetting(false);
    }
  };
  const [form, setForm] = useState({
    name: "",
    description: "",
    color: COLORS[0],
    icon: "BookOpen",
    code: "",
    tickerText: "",
    tickerColor: "#FFD700",
    tickerBgColor: "#1a1a2e",
    tickerActive: false,
    tickerSpeed: 20,
    tickerFontSize: "14px",
    countdownActive: false,
    countdownTitle: "الفترة التجريبية تنتهي خلال",
    countdownEndDate: "",
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

  // ─── Student Search ──
  const [studentSearch, setStudentSearch] = useState("");

  // ─── Admins State ──
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordAdminId, setPasswordAdminId] = useState<string | null>(null);

  // ─── Ticker State ──
  const [ticker, setTicker] = useState<Ticker>({ text: "", color: "#FFD700", bgColor: "#1a1a2e", active: false, speed: 20, fontSize: "14px" });
  const [tickerLoading, setTickerLoading] = useState(true);
  const [tickerSaving, setTickerSaving] = useState(false);

  // ─── Trial State ──
  const { endDate: trialEndDate, active: trialActive, save: saveTrial, startListening } = useTrialStore();
  const [trialFormDate, setTrialFormDate] = useState(trialEndDate);
  const [trialFormActive, setTrialFormActive] = useState(trialActive);
  const [trialSaving, setTrialSaving] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setTrialFormDate(trialEndDate);
    setTrialFormActive(trialActive);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [trialEndDate, trialActive]);

  const handleTrialSave = async () => {
    setTrialSaving(true);
    try {
      await saveTrial(trialFormDate, trialFormActive);
      toast.success("تم حفظ إعدادات الفترة التجريبية");
    } catch {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setTrialSaving(false);
    }
  };

  useEffect(() => {
    const unsub = startListening();
    return () => unsub();
  }, [startListening]);

  const loadAdmins = async () => {
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch {
      toast.error("حدث خطأ في تحميل المشرفين");
    } finally {
      setAdminsLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const subjectsData = await getSubjects();
      setSubjects(subjectsData);
    } catch {
      toast.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const data = await getStudents();
      setStudents(data);
      return data;
    } catch {
      toast.error("حدث خطأ في تحميل الطلاب");
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    loadSubjects();
    loadStudents();
    loadAdmins();
    loadTicker();
    loadStats();
    /* eslint-enable react-hooks/set-state-in-effect */

    // Realtime listeners keep every count/list instantly in sync with the
    // database, no matter where the mutation happened (admin page, subject
    // page, another tab or device)
    const unsubStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        setStudents(snapshot.docs.map((d) => {
          const data = d.data();
          return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() } as Student;
        }));
        setStudentsLoading(false);
      },
      (err) => console.error("students snapshot error:", err)
    );
    const unsubSubjects = onSnapshot(
      collection(db, "subjects"),
      (snapshot) => setSubjects(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Subject[]),
      (err) => console.error("subjects snapshot error:", err)
    );
    return () => {
      unsubStudents();
      unsubSubjects();
    };
  }, []);

  useEffect(() => {
    const unsubVideos = onSnapshot(
      collection(db, "videos"),
      (snapshot) => setTotalVideos(snapshot.size),
      (err) => console.error("videos snapshot error:", err)
    );
    const unsubFiles = onSnapshot(
      collection(db, "files"),
      (snapshot) => setTotalFiles(snapshot.size),
      (err) => console.error("files snapshot error:", err)
    );
    return () => {
      unsubVideos();
      unsubFiles();
    };
  }, []);

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
        tickerBgColor: subject.tickerBgColor || "#1a1a2e",
        tickerActive: subject.tickerActive || false,
        tickerSpeed: subject.tickerSpeed || 20,
        tickerFontSize: subject.tickerFontSize || "14px",
        countdownActive: subject.countdownActive || false,
        countdownTitle: subject.countdownTitle || "الفترة التجريبية تنتهي خلال",
        countdownEndDate: subject.countdownEndDate || "",
      });
    } else {
      setEditingSubject(null);
      setForm({ name: "", description: "", color: COLORS[0], icon: "BookOpen", code: "", tickerText: "", tickerColor: "#FFD700", tickerBgColor: "#1a1a2e", tickerActive: false, tickerSpeed: 20, tickerFontSize: "14px", countdownActive: false, countdownTitle: "الفترة التجريبية تنتهي خلال", countdownEndDate: "" });
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
        tickerBgColor: form.tickerBgColor || "#1a1a2e",
        tickerActive: form.tickerActive || false,
        tickerSpeed: form.tickerSpeed || 20,
        tickerFontSize: form.tickerFontSize || "14px",
        countdownActive: form.countdownActive,
        countdownTitle: form.countdownTitle.trim() || "الفترة التجريبية تنتهي خلال",
        countdownEndDate: form.countdownActive ? form.countdownEndDate : "",
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
      setForm({ name: "", description: "", color: COLORS[0], icon: "BookOpen", code: "", tickerText: "", tickerColor: "#FFD700", tickerBgColor: "#1a1a2e", tickerActive: false, tickerSpeed: 20, tickerFontSize: "14px", countdownActive: false, countdownTitle: "الفترة التجريبية تنتهي خلال", countdownEndDate: "" });
      await loadSubjects();
    } catch {
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
      await loadSubjects();
    } catch {
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
        const updates: Record<string, string | string[]> = {
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
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "حدث خطأ أثناء الحذف");
    }
  };

  const handleRemoveDevice = async (studentId: string, deviceId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟ سيمكن الطالب من تسجيل جهاز جديد.")) return;
    try {
      await removeDevice(studentId, deviceId);
      toast.success("تم حذف الجهاز بنجاح");
      const updated = await loadStudents();
      const found = updated?.find((s) => s.id === studentId);
      if (found) setDevicesDialogStudent(found);
    } catch {
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

  // ─── Admin handlers ──
  const openAdminDialog = (admin?: Admin) => {
    setEditingAdmin(admin || null);
    setAdminForm(admin ? { name: admin.name, email: admin.email, password: "" } : { name: "", email: "", password: "" });
    setAdminDialogOpen(true);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.name.trim() || !adminForm.email.trim()) return;
    if (!editingAdmin && !adminForm.password.trim()) {
      toast.error("يرجى إدخال كلمة السر");
      return;
    }
    setAdminSubmitting(true);
    try {
      if (editingAdmin) {
        if (adminForm.email !== editingAdmin.email) {
          toast.error("لا يمكن تغيير البريد الإلكتروني");
          setAdminSubmitting(false);
          return;
        }
        if (adminForm.password.trim()) {
          toast.error("لتغيير كلمة السر استخدم زر 'تغيير كلمة السر'");
          setAdminSubmitting(false);
          return;
        }
        await setDoc(doc(db, "admins", editingAdmin.id), { name: adminForm.name, email: adminForm.email }, { merge: true });
        toast.success("تم تعديل المشرف بنجاح");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, adminForm.email, adminForm.password);
        await setDoc(doc(db, "admins", cred.user.uid), { name: adminForm.name, email: adminForm.email });
        toast.success("تم إضافة المشرف بنجاح");
      }
      setAdminDialogOpen(false);
      await loadAdmins();
    } catch (e: unknown) {
      const error = e as { code?: string };
      if (error?.code === "auth/email-already-in-use") {
        toast.error("البريد الإلكتروني مستخدم بالفعل");
      } else {
        toast.error("حدث خطأ أثناء حفظ المشرف");
      }
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المشرف؟")) return;
    try {
      await deleteDoc(doc(db, "admins", id));
      toast.success("تم حذف المشرف بنجاح");
      await loadAdmins();
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const openPasswordDialog = (adminId: string) => {
    setPasswordAdminId(adminId);
    setPasswordDialogOpen(true);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }
    try {
      const adminDoc = await getDoc(doc(db, "admins", passwordAdminId!));
      if (!adminDoc.exists()) {
        toast.error("المشرف غير موجود");
        return;
      }
      const adminEmail = adminDoc.data().email;
      await sendPasswordResetEmail(auth, adminEmail);
      toast.success("تم إرسال رابط تغيير كلمة السر إلى البريد");
      setPasswordDialogOpen(false);
    } catch {
      toast.error("حدث خطأ أثناء إرسال رابط تغيير كلمة السر");
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
            <TabsTrigger value="admins" className="gap-2">
              <User className="h-4 w-4" />
              المشرفين
            </TabsTrigger>
            <TabsTrigger value="ticker" className="gap-2">
              <ScrollText className="h-4 w-4" />
              الشريط المتحرك
            </TabsTrigger>
            <TabsTrigger value="trial" className="gap-2">
              <Clock className="h-4 w-4" />
              الفترة التجريبية
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              الإحصائيات
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
                          <Label>لون الخلفية</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {["#1a1a2e", "#16213e", "#0f3460", "#2d2d2d", "#1a1a1a", "#0d0d0d", "#2c1810", "#1a1a2e", "#1e3a5f", "#2d1b69"].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setForm({ ...form, tickerBgColor: c })}
                                className={`h-8 w-8 rounded-full border-2 transition-all ${
                                  form.tickerBgColor === c ? "border-white scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label>حجم الخط</Label>
                          <select
                            value={form.tickerFontSize}
                            onChange={(e) => setForm({ ...form, tickerFontSize: e.target.value })}
                            className="mt-2 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            dir="rtl"
                          >
                            {["12px","14px","16px","18px","20px","24px","28px","32px"].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
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

                      {/* ── Countdown settings for this subject ── */}
                      <div className="space-y-4 rounded-lg border p-4">
                        <p className="text-sm font-bold text-muted-foreground">العد التنازلي لهذه المادة</p>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="subject-countdown-active"
                            checked={form.countdownActive}
                            onChange={(e) => setForm({ ...form, countdownActive: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <Label htmlFor="subject-countdown-active" className="mb-0">إظهار العد التنازلي في صفحة المادة</Label>
                        </div>

                        {form.countdownActive && (
                          <>
                            <div>
                              <Label>النص المعروض فوق العداد</Label>
                              <Input
                                value={form.countdownTitle}
                                onChange={(e) => setForm({ ...form, countdownTitle: e.target.value })}
                                placeholder="مثال: الفترة التجريبية تنتهي خلال / موعد الاختبار"
                                className="mt-2"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                اكتب أي نص مثل "موعد الاختبار" أو "الامتحان النهائي يبقى"
                              </p>
                            </div>
                            <div>
                              <Label>تاريخ ووقت انتهاء العداد</Label>
                              <input
                                type="datetime-local"
                                value={form.countdownEndDate ? form.countdownEndDate.slice(0, 16) : ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm({ ...form, countdownEndDate: val ? new Date(val).toISOString() : "" });
                                }}
                                className="mt-2 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                dir="ltr"
                              />
                              {form.countdownEndDate && (
                                <p className="text-sm font-bold text-primary mt-2 flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(form.countdownEndDate).toLocaleString("ar-SA", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}
                            </div>
                          </>
                        )}
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
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث بالاسم أو اسم المستخدم..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="pr-9 w-48 sm:w-64"
                      dir="rtl"
                    />
                  </div>
                  <Button size="sm" className="gap-1" onClick={openAddStudent}>
                    <Plus className="h-4 w-4" />
                    إضافة طالب
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : students.length > 0 ? (
                  (() => {
                    const filtered = students.filter((s) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.toLowerCase();
                      return (
                        s.displayName.toLowerCase().includes(q) ||
                        s.username.toLowerCase().includes(q)
                      );
                    });

                    const grouped: Record<string, { subject: Subject; students: Student[] }> = {};
                    for (const subject of subjects) {
                      const subjectStudents = filtered.filter((s) =>
                        s.enrolledSubjects.includes(subject.id)
                      );
                      if (subjectStudents.length > 0) {
                        grouped[subject.id] = { subject, students: subjectStudents };
                      }
                    }

                    const unassigned = filtered.filter((s) =>
                      s.enrolledSubjects.length === 0
                    );

                    const totalGroups = Object.keys(grouped).length + (unassigned.length > 0 ? 1 : 0);

                    if (totalGroups === 0 && studentSearch.trim()) {
                      return (
                        <p className="text-center text-muted-foreground py-8">
                          لا توجد نتائج لـ "{studentSearch}"
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-6">
                        {Object.values(grouped).map(({ subject, students: groupStudents }) => {
                          const Icon = AVAILABLE_ICONS.find((i) => i.name === subject.icon)?.icon || BookOpen;
                          return (
                            <div key={subject.id}>
                              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border/50">
                                <div
                                  className="flex h-8 w-8 items-center justify-center rounded-lg"
                                  style={{ backgroundColor: subject.color }}
                                >
                                  <Icon className="h-4 w-4 text-white" />
                                </div>
                                <h3 className="text-lg font-bold">{subject.name}</h3>
                                <span className="text-sm text-muted-foreground">({groupStudents.length} طالب)</span>
                              </div>
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>اسم المستخدم</TableHead>
                                      <TableHead>الاسم</TableHead>
                                      <TableHead className="hidden sm:table-cell">الأجهزة</TableHead>
                                      <TableHead>الحالة</TableHead>
                                      <TableHead>الإجراءات</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {groupStudents.map((student) => (
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
                            </div>
                          );
                        })}

                        {unassigned.length > 0 && (
                          <div>
                            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border/50">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                                <User className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <h3 className="text-lg font-bold">غير مُعيَّنين لمادة</h3>
                              <span className="text-sm text-muted-foreground">({unassigned.length} طالب)</span>
                            </div>
                            <div className="overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>اسم المستخدم</TableHead>
                                    <TableHead>الاسم</TableHead>
                                    <TableHead className="hidden sm:table-cell">الأجهزة</TableHead>
                                    <TableHead>الحالة</TableHead>
                                    <TableHead>الإجراءات</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {unassigned.map((student) => (
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
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    لا يوجد طلاب. اضغط على "إضافة طالب" لإنشاء طالب جديد.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ Admins Tab ════════ */}
          <TabsContent value="admins">
            <Card className="glass border-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold">قائمة المشرفين</CardTitle>
                <Button size="sm" className="gap-1" onClick={() => openAdminDialog()}>
                  <Plus className="h-4 w-4" />
                  إضافة مشرف
                </Button>
              </CardHeader>
              <CardContent>
                {adminsLoading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : admins.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الاسم</TableHead>
                          <TableHead>البريد</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {admins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{admin.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{admin.email}</code>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => openPasswordDialog(admin.id)}
                                >
                                  تغيير كلمة السر
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => openAdminDialog(admin)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="p-2 h-auto"
                                  onClick={() => handleDeleteAdmin(admin.id)}
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
                  <p className="text-sm text-muted-foreground text-center py-8">
                    لا يوجد مشرفين. اضغط على "إضافة مشرف" لإضافة مشرف جديد.
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
                      <Label>لون الخلفية</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["#1a1a2e", "#16213e", "#0f3460", "#2d2d2d", "#1a1a1a", "#0d0d0d", "#2c1810", "#1a1a2e", "#1e3a5f", "#2d1b69"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTicker({ ...ticker, bgColor: c })}
                            className={`h-8 w-8 rounded-full border-2 transition-all ${
                              ticker.bgColor === c ? "border-white scale-110" : "border-transparent"
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>حجم الخط</Label>
                      <select
                        value={ticker.fontSize || "14px"}
                        onChange={(e) => setTicker({ ...ticker, fontSize: e.target.value })}
                        className="mt-2 flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        dir="rtl"
                      >
                        {["12px","14px","16px","18px","20px","24px","28px","32px"].map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
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

          {/* ════════ Trial Tab ════════ */}
          <TabsContent value="trial">
            <Card className="glass border-none">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  إعدادات الفترة التجريبية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="trial-active"
                    checked={trialFormActive}
                    onChange={(e) => setTrialFormActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="trial-active" className="mb-0 text-base font-medium">تفعيل عداد التنازلي</Label>
                </div>

                {trialFormActive && (
                  <>
                    <div>
                      <Label className="text-base">تاريخ ووقت انتهاء الفترة التجريبية</Label>
                      <input
                        type="datetime-local"
                        value={trialFormDate ? trialFormDate.slice(0, 16) : ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTrialFormDate(val ? new Date(val).toISOString() : "");
                        }}
                        className="mt-2 flex w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        dir="ltr"
                      />
                    </div>

                    {trialFormDate && (
                      <div className="rounded-lg border p-4 bg-muted/30">
                        <p className="text-sm text-muted-foreground mb-2">معاينة:</p>
                        <p className="text-lg font-bold text-primary flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          {new Date(trialFormDate).toLocaleString("ar-SA", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <Button onClick={handleTrialSave} className="gap-2" disabled={trialSaving}>
                  {trialSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ Analytics Tab ════════ */}
          <TabsContent value="analytics">
            {statsLoading ? (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : stats ? (
              <div className="space-y-6">
                {/* Reset button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    تُستخدم الإحصائيات الحالية في هذا الترم/العام الدراسي. عند بدء فترة جديدة يمكنك مسحها والعد من الصفر.
                  </p>
                  <Button variant="destructive" onClick={handleResetStats} disabled={resetting} className="gap-2 shrink-0">
                    <Trash2 className="h-4 w-4" />
                    {resetting ? "جاري المسح..." : "مسح الإحصائيات"}
                  </Button>
                </div>

                {/* Overview cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="glass border-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        زوار اليوم
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black text-primary">{stats.visitorsToday}</div>
                      <p className="text-xs text-muted-foreground mt-1">جهاز فريد هذا اليوم</p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        إجمالي الزوار
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black text-primary">{stats.totalVisitors}</div>
                      <p className="text-xs text-muted-foreground mt-1">أجهزة فريدة منذ البداية</p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        إجمالي المشاهدات
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black text-primary">{stats.totalPageviews}</div>
                      <p className="text-xs text-muted-foreground mt-1">مرات فتح الصفحات</p>
                    </CardContent>
                  </Card>
                  <Card className="glass border-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        ساعات المشاهدة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-black text-primary">{stats.totalWatchHours}</div>
                      <p className="text-xs text-muted-foreground mt-1">ساعة مشاهدة فعلية</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Top videos table */}
                <Card className="glass border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Flame className="h-5 w-5 text-orange-500" />
                      الفيديوهات الأكثر مشاهدة
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">مرتبة حسب عدد مرات التشغيل</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    {stats.topVideos.length === 0 ? (
                      <div className="p-6 text-center text-sm text-muted-foreground">
                        لا توجد مشاهدات مسجلة بعد. شغّل بعض الفيديوهات لتظهر هنا.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10 text-center">#</TableHead>
                              <TableHead>الفيديو</TableHead>
                              <TableHead className="text-center">المشاهدات</TableHead>
                              <TableHead className="text-center">وقت المشاهدة</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stats.topVideos.map((v, i) => (
                              <TableRow key={v.videoId}>
                                <TableCell className="text-center font-bold text-muted-foreground">{i + 1}</TableCell>
                                <TableCell className="font-medium max-w-xs truncate">{v.title}</TableCell>
                                <TableCell className="text-center font-bold">{v.views}</TableCell>
                                <TableCell className="text-center">
                                  {Math.floor((v.watchSeconds || 0) / 60)} دقيقة
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="py-10 text-center text-muted-foreground">تعذر تحميل الإحصائيات</div>
            )}
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

      {/* Admin Dialog */}
      <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingAdmin ? "تعديل مشرف" : "إضافة مشرف جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdminSubmit} className="space-y-4 mt-4">
            <div>
              <Label>الاسم</Label>
              <Input
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                placeholder="اسم المشرف"
                required
              />
            </div>
            <div>
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <Label>{editingAdmin ? "" : "كلمة السر"}</Label>
              {editingAdmin ? null : (
                <Input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  placeholder="••••••"
                  required
                />
              )}
            </div>
            <Button type="submit" className="w-full" disabled={adminSubmitting}>
              {adminSubmitting ? "جاري الحفظ..." : editingAdmin ? "حفظ التعديلات" : "إضافة المشرف"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>تغيير كلمة السر</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
            <div>
              <Label>تأكيد تغيير كلمة السر</Label>
              <p className="text-sm text-muted-foreground mt-2">
                سيتم إرسال رابط تغيير كلمة السر إلى البريد الإلكتروني الخاص بالمشرف
              </p>
            </div>
            <Button type="submit" className="w-full">
              إرسال رابط التغيير
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
