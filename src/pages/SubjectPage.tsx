import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import TickerBar from "@/components/TickerBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Play,
  FileText,
  FlaskConical,
  BookOpen,
  Clock,
  Download,
  Plus,
  Youtube,
  ExternalLink,
  CheckCircle2,
  Circle,
  Eye,
  LayoutDashboard,
  Trash2,
  Lock,
  Unlock,
  Pencil,
  User,
  Key,
  LogIn,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import {
  getSubjectById,
  getVideosBySubject,
  getFilesBySubject,
  getAssessmentsBySubject,
  createVideo,
  updateVideo,
  createFile,
  createAssessment,
  deleteVideo,
  deleteFile,
  deleteAssessment,
  getLocalProgress,
  toggleLocalProgress,
  toggleVideoFreeStatus,
  toggleFileFreeStatus,
  toggleFileDownloadStatus,
  toggleFileViewStatus,
  toggleAssessmentFreeStatus,
  verifyStudentCredentials,
  registerDevice,
  getDeviceId,
  getDeviceName,
} from "@/services/firestore";
import type { Subject, Video, FileItem, Assessment } from "@/types";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const { user, studentSession } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const [subject, setSubject] = useState<Subject | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [filesList, setFilesList] = useState<FileItem[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSubjectAccess, setHasSubjectAccess] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessUsername, setAccessUsername] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [accessSubmitting, setAccessSubmitting] = useState(false);
  const [accessError, setAccessError] = useState("");

  const [videoOpen, setVideoOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [fileOpen, setFileOpen] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const VIDEO_COLORS = ["#3B82F6", "#22C55E", "#F97316", "#8B5CF6", "#EC4899", "#14B8A6", "#EAB308", "#84CC16", "#06B6D4", "#F43F5E"];
  const [videoForm, setVideoForm] = useState({
    title: "",
    type: "theory" as "theory" | "review" | "practical",
    sourceType: "youtube" as "youtube" | "telegram" | "upload",
    url: "",
    thumbnail: "",
    duration: "",
    isFree: true,
    color: "#3B82F6",
  });

  const [fileForm, setFileForm] = useState({
    title: "",
    fileType: "pdf",
    size: "",
    downloadUrl: "",
    isFree: true,
    canDownload: true,
    canView: true,
  });

  const [assessmentForm, setAssessmentForm] = useState({
    title: "",
    url: "",
    isFree: true,
  });

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sub, vids, files, tests] = await Promise.all([
        getSubjectById(id),
        getVideosBySubject(id),
        getFilesBySubject(id),
        getAssessmentsBySubject(id),
      ]);
      setSubject(sub);
      setVideos(vids);
      setFilesList(files);
      setAssessments(tests);
      if (user) {
        setCompletedItems(getLocalProgress(user.uid));
      }
      if (studentSession && id && studentSession.enrolledSubjects.includes(id)) {
        setHasSubjectAccess(true);
      }
    } catch (e) {
      console.error("loadData error:", e);
      toast.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  };

  const openAccessDialog = () => {
    setAccessUsername("");
    setAccessPassword("");
    setAccessError("");
    setAccessDialogOpen(true);
  };

  const handleAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessUsername.trim() || !accessPassword.trim() || !id) return;
    setAccessSubmitting(true);
    setAccessError("");
    try {
      const result = await verifyStudentCredentials(accessUsername, accessPassword, id);
      if (!result.valid || !result.student) {
        setAccessError(result.error || "بيانات الدخول غير صحيحة");
        setAccessSubmitting(false);
        return;
      }

      // Register device
      const deviceId = getDeviceId();
      const deviceName = getDeviceName();
      const deviceResult = await registerDevice(result.student.id, {
        deviceId,
        deviceName,
        userAgent: navigator.userAgent,
        lastAccess: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      });

      if (!deviceResult.success) {
        setAccessError(deviceResult.error || "حدث خطأ في تسجيل الجهاز");
        setAccessSubmitting(false);
        return;
      }

      // Save student session
      useAuthStore.getState().setStudentSession({
        username: result.student.username,
        displayName: result.student.displayName,
        enrolledSubjects: result.student.enrolledSubjects,
        deviceId,
        loggedInAt: new Date().toISOString(),
      });

      toast.success(`مرحباً ${result.student.displayName}!`);
      setHasSubjectAccess(true);
      setAccessDialogOpen(false);
    } catch (e) {
      console.error("Login error:", e);
      setAccessError("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setAccessSubmitting(false);
    }
  };

  const handleLogout = () => {
    useAuthStore.getState().setStudentSession(null);
    setHasSubjectAccess(false);
    toast.success("تم تسجيل الخروج");
  };

  const handleToggleProgress = (itemId: string) => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول لتتبع تقدمك");
      return;
    }
    const updated = toggleLocalProgress(user.uid, itemId);
    setCompletedItems(updated);
  };

  const theoryVideos = videos.filter((v) => v.type === "theory");
  const reviewVideos = videos.filter((v) => v.type === "review");
  const practicalVideos = videos.filter((v) => v.type === "practical");

  const openVideoDialog = (video?: Video, presetType?: "theory" | "review" | "practical") => {
    if (video) {
      setEditingVideo(video);
      setVideoForm({
        title: video.title,
        type: video.type,
        sourceType: video.sourceType,
        url: video.url,
        thumbnail: video.thumbnail || "",
        duration: video.duration || "",
        isFree: video.isFree ?? true,
        color: video.color || "#3B82F6",
      });
    } else {
      setEditingVideo(null);
      setVideoForm({ title: "", type: presetType || "theory", sourceType: "youtube", url: "", thumbnail: "", duration: "", isFree: true, color: "#3B82F6" });
    }
    setVideoOpen(true);
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !videoForm.title.trim() || !videoForm.url.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        title: videoForm.title,
        type: videoForm.type,
        sourceType: videoForm.sourceType,
        url: videoForm.url,
        thumbnail: videoForm.thumbnail || undefined,
        duration: videoForm.duration || undefined,
        isFree: videoForm.isFree,
        color: videoForm.color || "#3B82F6",
      };
      if (editingVideo) {
        await updateVideo(editingVideo.id, data);
        toast.success("تم تعديل الفيديو بنجاح");
      } else {
        await createVideo({ subjectId: id, ...data });
        toast.success("تم إضافة الفيديو بنجاح");
      }
      setVideoOpen(false);
      setEditingVideo(null);
      setVideoForm({ title: "", type: "theory", sourceType: "youtube", url: "", thumbnail: "", duration: "", isFree: true, color: "#3B82F6" });
      await loadData();
    } catch (e) {
      console.error("Video submit error:", e);
      toast.error(editingVideo ? "حدث خطأ أثناء التعديل" : "حدث خطأ أثناء الإضافة");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !fileForm.title.trim() || !fileForm.downloadUrl.trim()) return;
    setSubmitting(true);
    try {
      await createFile({
        subjectId: id,
        title: fileForm.title,
        fileType: fileForm.fileType,
        size: fileForm.size || undefined,
        downloadUrl: fileForm.downloadUrl,
        isFree: fileForm.isFree,
        canDownload: fileForm.canDownload,
        canView: fileForm.canView,
      });
      toast.success("تم إضافة الملف بنجاح");
      setFileOpen(false);
      setFileForm({ title: "", fileType: "pdf", size: "", downloadUrl: "", isFree: true, canDownload: true, canView: true });
      await loadData();
    } catch (e) {
      console.error("Add file error:", e);
      toast.error("حدث خطأ أثناء إضافة الملف");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssessmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !assessmentForm.title.trim() || !assessmentForm.url.trim()) return;
    setSubmitting(true);
    try {
      await createAssessment({
        subjectId: id,
        title: assessmentForm.title,
        url: assessmentForm.url,
        isFree: assessmentForm.isFree,
      });
      toast.success("تم إضافة الاختبار بنجاح");
      setAssessmentOpen(false);
      setAssessmentForm({ title: "", url: "", isFree: true });
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء إضافة الاختبار");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (type: "video" | "file" | "assessment", itemId: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      if (type === "video") await deleteVideo(itemId);
      if (type === "file") await deleteFile(itemId);
      if (type === "assessment") await deleteAssessment(itemId);
      toast.success("تم الحذف بنجاح");
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
    }
  };

  const handleToggleFree = async (videoId: string, currentIsFree: boolean) => {
    try {
      await toggleVideoFreeStatus(videoId, !currentIsFree);
      toast.success(!currentIsFree ? "تم جعل الفيديو مجاني" : "تم جعل الفيديو للمشتركين فقط");
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء تغيير الحالة");
    }
  };

  const handleToggleFileFree = async (fileId: string, currentIsFree: boolean) => {
    try {
      await toggleFileFreeStatus(fileId, !currentIsFree);
      toast.success(!currentIsFree ? "تم جعل الملف مجاني" : "تم جعل الملف للمشتركين فقط");
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء تغيير الحالة");
    }
  };

  const handleToggleFileDownload = async (fileId: string, current: boolean) => {
    try {
      await toggleFileDownloadStatus(fileId, !current);
      toast.success(!current ? "تم تفعيل التحميل" : "تم تعطيل التحميل");
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء تغيير الحالة");
    }
  };

  const handleToggleFileView = async (fileId: string, current: boolean) => {
    try {
      await toggleFileViewStatus(fileId, !current);
      toast.success(!current ? "تم تفعيل المشاهدة" : "تم تعطيل المشاهدة");
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء تغيير الحالة");
    }
  };

  const handleToggleAssessmentFree = async (assessmentId: string, currentIsFree: boolean) => {
    try {
      await toggleAssessmentFreeStatus(assessmentId, !currentIsFree);
      toast.success(!currentIsFree ? "تم جعل الاختبار مجاني" : "تم جعل الاختبار للمشتركين فقط");
      await loadData();
    } catch (e) {
      toast.error("حدث خطأ أثناء تغيير الحالة");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" style={{ borderColor: `hsl(var(--primary))`, borderTopColor: 'transparent' }} />
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">المادة غير موجودة</h1>
          <Button asChild>
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Header */}
      <div
        className="relative overflow-hidden px-4 py-12"
      >
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${subject.color}, ${subject.color}88)` }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[80px]" style={{ background: subject.color + '30' }} />
        <div className="container mx-auto max-w-5xl relative">
          <Button variant="secondary" size="sm" asChild className="mb-4">
            <Link to="/" className="gap-1">
              <ArrowRight className="h-4 w-4" />
              العودة للمواد
            </Link>
          </Button>
          <h1 className="text-4xl font-black">{subject.name}</h1>
          {subject.description && (
            <p className="mt-2 text-lg opacity-90">{subject.description}</p>
          )}

          {subject.tickerActive && subject.tickerText && (
            <div className="mt-4">
              <TickerBar
                text={subject.tickerText}
                color={subject.tickerColor || "#FFD700"}
                bgColor={subject.tickerBgColor || "#1a1a2e"}
                active={true}
                speed={subject.tickerSpeed || 20}
                fontSize={subject.tickerFontSize || "14px"}
              />
            </div>
          )}

          {!isAdmin && !hasSubjectAccess && (
            <Card className="mt-6 glass border-white/10 text-white max-w-md">
              <CardContent className="p-4 flex flex-col gap-3">
                <p className="font-semibold flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  المحتوى المغلق يحتاج إلى تسجيل دخول الطالب
                </p>
                <Button
                  variant="secondary"
                  onClick={openAccessDialog}
                  className="gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  تسجيل الدخول لعرض المحتوى
                </Button>
              </CardContent>
            </Card>
          )}
          {!isAdmin && hasSubjectAccess && (
             <div className="mt-6 flex items-center gap-4">
               <div className="flex items-center gap-2 font-medium">
                 <Unlock className="h-5 w-5 text-green-400" />
                 <span className="text-foreground">تم تسجيل الدخول — {studentSession?.displayName}</span>
               </div>
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={handleLogout}
                 className="text-white/70 hover:text-white"
               >
                 تسجيل خروج
               </Button>
             </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-5xl px-4 py-8"
        style={{
          '--foreground': '225 25% 10%',
          '--card': '0 0% 98%',
          '--card-foreground': '225 25% 10%',
          '--muted': '225 20% 95%',
          '--muted-foreground': '215 20% 50%',
          '--border': '225 20% 90%',
          '--secondary': '225 20% 95%',
          '--secondary-foreground': '225 25% 10%',
          '--popover': '0 0% 98%',
          '--popover-foreground': '225 25% 10%',
          '--accent': '252 70% 55%',
          '--accent-foreground': '0 0% 100%',
        } as React.CSSProperties}
      >
        <Tabs defaultValue="theory" className="w-full">
          <div className="relative mb-6">
            <TabsList className="flex w-full justify-start overflow-x-auto bg-transparent p-0 scrollbar-hide">
              <div className="flex gap-2">
                <TabsTrigger
                  value="theory"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-2.5 rounded-full border transition-all"
                  style={{
                    borderColor: subject.color + "40",
                    "--active-bg": subject.color,
                  } as any}
                >
                  <BookOpen className="ml-2 h-4 w-4" />
                  شرح
                </TabsTrigger>
                <TabsTrigger
                  value="review"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-2.5 rounded-full border transition-all"
                  style={{ borderColor: subject.color + "40" } as any}
                >
                  <Clock className="ml-2 h-4 w-4" />
                  مراجعة
                </TabsTrigger>
                <TabsTrigger
                  value="practical"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-2.5 rounded-full border transition-all"
                  style={{ borderColor: subject.color + "40" } as any}
                >
                  <FlaskConical className="ml-2 h-4 w-4" />
                  عملي
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-2.5 rounded-full border transition-all"
                  style={{ borderColor: subject.color + "40" } as any}
                >
                  <FileText className="ml-2 h-4 w-4" />
                  ملفات
                </TabsTrigger>
                <TabsTrigger
                  value="tests"
                  className="data-[state=active]:bg-primary data-[state=active]:text-white px-6 py-2.5 rounded-full border transition-all"
                  style={{ borderColor: subject.color + "40" } as any}
                >
                  <LayoutDashboard className="ml-2 h-4 w-4" />
                  اختبارات تدريبية
                </TabsTrigger>
              </div>
            </TabsList>
          </div>

          {/* Theory Videos */}
          <TabsContent value="theory" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">شرح</h2>
              {isAdmin && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => openVideoDialog(undefined, "theory")}
                >
                  <Plus className="h-4 w-4" />
                  إضافة فيديو
                </Button>
              )}
            </div>
            {theoryVideos.length > 0 ? (
              <div className="grid gap-4 grid-cols-1">
                {theoryVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isActive={activeVideo === video.id}
                    onPlay={() => setActiveVideo(video.id)}
                    isAdmin={isAdmin}
                    onDelete={(id) => handleDeleteItem("video", id)}
                    isCompleted={completedItems.includes(video.id)}
                    onToggleComplete={handleToggleProgress}
                    color={subject.color}
                    hasSubjectAccess={hasSubjectAccess}
                    onToggleFree={handleToggleFree}
                    onOpenAccess={openAccessDialog}
                    onEdit={openVideoDialog}
                    onClose={() => setActiveVideo(null)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={BookOpen} text="لا توجد فيديوهات شرح متاحة" />
            )}
          </TabsContent>

          {/* Review Videos */}
          <TabsContent value="review" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">مراجعة</h2>
              {isAdmin && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => openVideoDialog(undefined, "review")}
                >
                  <Plus className="h-4 w-4" />
                  إضافة فيديو
                </Button>
              )}
            </div>
            {reviewVideos.length > 0 ? (
              <div className="grid gap-4 grid-cols-1">
                {reviewVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isActive={activeVideo === video.id}
                    onPlay={() => setActiveVideo(video.id)}
                    isAdmin={isAdmin}
                    onDelete={(id) => handleDeleteItem("video", id)}
                    isCompleted={completedItems.includes(video.id)}
                    onToggleComplete={handleToggleProgress}
                    color={subject.color}
                    hasSubjectAccess={hasSubjectAccess}
                    onToggleFree={handleToggleFree}
                    onOpenAccess={openAccessDialog}
                    onEdit={openVideoDialog}
                    onClose={() => setActiveVideo(null)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Clock} text="لا توجد فيديوهات مراجعة متاحة" />
            )}
          </TabsContent>

          {/* Files */}
          <TabsContent value="files" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">ملفات</h2>
              {isAdmin && (
                <Dialog open={fileOpen} onOpenChange={setFileOpen}>
                  <Button size="sm" className="gap-1" onClick={() => setFileOpen(true)}>
                    <Plus className="h-4 w-4" />
                    إضافة ملف
                  </Button>
                  <DialogContent className="max-w-md" dir="rtl" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>إضافة ملف جديد</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFileSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label>العنوان</Label>
                        <Input
                          value={fileForm.title}
                          onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })}
                          placeholder="عنوان الملف"
                          required
                        />
                      </div>
                      <div>
                        <Label>رابط الملف</Label>
                        <Input
                          value={fileForm.downloadUrl}
                          onChange={(e) => setFileForm({ ...fileForm, downloadUrl: e.target.value })}
                          placeholder="رابط مباشر للملف (PDF)"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="fileIsFree"
                          checked={fileForm.isFree}
                          onChange={(e) => setFileForm({ ...fileForm, isFree: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="fileIsFree">ملف مجاني (متاح للجميع)</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="fileCanDownload"
                          checked={fileForm.canDownload}
                          onChange={(e) => setFileForm({ ...fileForm, canDownload: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="fileCanDownload">متاح للتحميل</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="fileCanView"
                          checked={fileForm.canView}
                          onChange={(e) => setFileForm({ ...fileForm, canView: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="fileCanView">متاح للمشاهدة المباشرة</Label>
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? "جاري الإضافة..." : "إضافة الملف"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {filesList.length > 0 ? (
              <div className="space-y-3">
                {filesList.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    isAdmin={isAdmin}
                    onDelete={(id) => handleDeleteItem("file", id)}
                    onPreview={setPreviewFile}
                    isCompleted={completedItems.includes(file.id)}
                    onToggleComplete={handleToggleProgress}
                    color={subject.color}
                    hasSubjectAccess={hasSubjectAccess}
                    onToggleFree={handleToggleFileFree}
                    onToggleDownload={handleToggleFileDownload}
                    onToggleView={handleToggleFileView}
                    onOpenAccess={openAccessDialog}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} text="لا توجد ملفات متاحة" />
            )}
          </TabsContent>

          {/* Practical Videos */}
          <TabsContent value="practical" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">عملي</h2>
              {isAdmin && (
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={() => openVideoDialog(undefined, "practical")}
                >
                  <Plus className="h-4 w-4" />
                  إضافة فيديو
                </Button>
              )}
            </div>
            {practicalVideos.length > 0 ? (
              <div className="grid gap-4 grid-cols-1">
                {practicalVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isActive={activeVideo === video.id}
                    onPlay={() => setActiveVideo(video.id)}
                    isAdmin={isAdmin}
                    onDelete={(id) => handleDeleteItem("video", id)}
                    isCompleted={completedItems.includes(video.id)}
                    onToggleComplete={handleToggleProgress}
                    color={subject.color}
                    hasSubjectAccess={hasSubjectAccess}
                    onToggleFree={handleToggleFree}
                    onOpenAccess={openAccessDialog}
                    onEdit={openVideoDialog}
                    onClose={() => setActiveVideo(null)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={FlaskConical} text="لا توجد فيديوهات عملي متاحة" />
            )}
          </TabsContent>

          {/* Tests */}
          <TabsContent value="tests" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">اختبارات تدريبية</h2>
              {isAdmin && (
                <Dialog open={assessmentOpen} onOpenChange={setAssessmentOpen}>
                  <Button size="sm" className="gap-1" onClick={() => setAssessmentOpen(true)}>
                    <Plus className="h-4 w-4" />
                    إضافة اختبار
                  </Button>
                  <DialogContent className="max-w-md" dir="rtl" aria-describedby={undefined}>
                    <DialogHeader>
                      <DialogTitle>إضافة رابط اختبار إلكتروني</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAssessmentSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label>عنوان الاختبار</Label>
                        <Input
                          value={assessmentForm.title}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                          placeholder="مثال: اختبار الكيمياء - الفصل الأول"
                          required
                        />
                      </div>
                      <div>
                        <Label>رابط الاختبار (Google Forms / Microsoft Forms)</Label>
                        <Input
                          value={assessmentForm.url}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, url: e.target.value })}
                          placeholder="أدخل رابط الاختبار هنا"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="assessmentIsFree"
                          checked={assessmentForm.isFree}
                          onChange={(e) => setAssessmentForm({ ...assessmentForm, isFree: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor="assessmentIsFree">اختبار مجاني (متاح للجميع)</Label>
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? "جاري الإضافة..." : "إضافة الاختبار"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {assessments.length > 0 ? (
              <div className="space-y-3">
                {assessments.map((test) => (
                  <AssessmentCard
                    key={test.id}
                    assessment={test}
                    isAdmin={isAdmin}
                    onDelete={(id) => handleDeleteItem("assessment", id)}
                    isCompleted={completedItems.includes(test.id)}
                    onToggleComplete={handleToggleProgress}
                    color={subject.color}
                    hasSubjectAccess={hasSubjectAccess}
                    onToggleFree={handleToggleAssessmentFree}
                    onOpenAccess={openAccessDialog}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={LayoutDashboard} text="لا توجد اختبارات تدريبية متاحة" />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Shared Video Dialog for all tabs */}
      <Dialog open={videoOpen} onOpenChange={(o) => { if (!o) { setEditingVideo(null); } setVideoOpen(o); }}>
        <DialogContent className="max-w-md" dir="rtl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingVideo ? "تعديل " : "إضافة "}
              {videoForm.type === "theory" ? "فيديو شرح" : videoForm.type === "review" ? "فيديو مراجعة" : "فيديو عملي"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVideoSubmit} className="space-y-4 mt-4">
            <div>
              <Label>العنوان</Label>
              <Input
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="عنوان الفيديو"
                required
              />
            </div>
            <div>
              <Label>المصدر</Label>
              <Select
                value={videoForm.sourceType}
                onValueChange={(v: "youtube" | "telegram" | "upload") =>
                  setVideoForm({ ...videoForm, sourceType: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="telegram">Telegram</SelectItem>
                  <SelectItem value="upload">رابط مباشر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الرابط</Label>
              <Input
                value={videoForm.url}
                onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                placeholder="رابط الفيديو"
                required
              />
            </div>
            <div>
              <Label>اللون المميز</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {VIDEO_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setVideoForm({ ...videoForm, color: c })}
                    className={`h-8 w-8 rounded-full border-2 transition-all ${
                      videoForm.color === c ? "border-black scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isFree"
                checked={videoForm.isFree}
                onChange={(e) => setVideoForm({ ...videoForm, isFree: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isFree">فيديو مجاني (متاح للجميع)</Label>
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "جاري الحفظ..." : editingVideo ? "حفظ التعديلات" : "إضافة الفيديو"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Content Access Dialog */}
      <Dialog open={accessDialogOpen} onOpenChange={(open) => {
        if (!open) setAccessDialogOpen(false);
      }}>
        <DialogContent className="max-w-sm" dir="rtl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              تسجيل دخول الطالب
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAccessSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="access-username" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                اسم المستخدم
              </Label>
              <Input
                id="access-username"
                value={accessUsername}
                onChange={(e) => setAccessUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
            <div>
              <Label htmlFor="access-password" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                كلمة السر
              </Label>
              <Input
                id="access-password"
                type="password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="أدخل كلمة السر"
                required
              />
            </div>
            {accessError && (
              <p className="text-sm text-red-500 font-medium">{accessError}</p>
            )}
            <Button
              type="submit"
              className="w-full gap-2"
              disabled={accessSubmitting}
            >
              {accessSubmitting ? (
                "جاري التحقق..."
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  دخول
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0" aria-describedby={undefined}>
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{previewFile?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted">
            {previewFile && (
              <iframe
                src={`${previewFile.downloadUrl}#toolbar=0`}
                className="w-full h-full border-none"
                title={previewFile.title}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VideoCard({
  video,
  isActive,
  onPlay,
  isAdmin,
  onDelete,
  isCompleted,
  onToggleComplete,
  color,
  hasSubjectAccess,
  onToggleFree,
  onOpenAccess,
  onEdit,
  onClose,
}: {
  video: Video;
  isActive: boolean;
  onPlay: () => void;
  isAdmin: boolean;
  onDelete: (id: string) => void;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
  color: string;
  hasSubjectAccess: boolean;
  onToggleFree: (videoId: string, currentIsFree: boolean) => void;
  onOpenAccess: () => void;
  onEdit?: (video: Video) => void;
  onClose?: () => void;
}) {
  const youtubeId = video.sourceType === "youtube" ? extractYouTubeId(video.url) : null;
  const isTelegram = video.sourceType === "telegram";
  
  const canPlay = isAdmin || video.isFree || hasSubjectAccess;

  const handlePlayClick = () => {
    if (canPlay) {
      onPlay();
    } else {
      onOpenAccess();
    }
  };

  const typeColor = video.color || ({ theory: "#3B82F6", review: "#22C55E", practical: "#F97316" }[video.type] || color);

  if (isActive && canPlay) {
    return (
      <Card className="overflow-hidden glass" style={{ borderColor: color + '40' }}>
        <div style={{ height: "6px", backgroundColor: typeColor }} />
        <div className="aspect-video bg-black overflow-hidden relative">
          <button
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          {youtubeId ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              className="h-full w-full"
              src={video.url}
              controls
              autoPlay
              muted
              playsInline
            >
              <div className="flex h-full flex-col items-center justify-center bg-black text-white p-4">
                <p className="mb-2 text-lg">{video.title}</p>
                <Button asChild variant="secondary" size="sm">
                  <a href={video.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 ml-1" />
                    فتح الفيديو
                  </a>
                </Button>
              </div>
            </video>
          )}
        </div>
        <CardContent className="p-3 flex justify-between items-center">
          <div>
            <p className="font-semibold text-lg">{video.title}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {video.duration && <span>{video.duration}</span>}
              {isTelegram && <span>Telegram</span>}
            </div>
          </div>
          <button
            onClick={() => onToggleComplete(video.id)}
            className="transition-colors"
            style={{ color: isCompleted ? color : "currentColor" }}
          >
            {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={`group cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl card-3d ${!canPlay ? 'opacity-80' : ''} glass`}
      onClick={handlePlayClick}
      style={{ borderColor: color + '30', borderLeft: `1.5cm solid ${typeColor}` }}
    >
      <div className="flex flex-row">
        {/* Thumbnail */}
        <div className="relative w-48 shrink-0 bg-muted">
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className="h-full w-full object-cover" />
          ) : youtubeId ? (
            <img
              src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
              alt={video.title}
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              {video.sourceType === "youtube" ? (
                <Youtube className="h-10 w-10 text-red-500" />
              ) : (
                <Play className="h-10 w-10 text-primary/60" />
              )}
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
              {canPlay ? (
                 <Play className="h-5 w-5 ml-0.5" style={{ color: color }} />
              ) : (
                 <Lock className="h-5 w-5" style={{ color: color }} />
              )}
            </div>
          </div>
          {!canPlay && (
            <div className="absolute top-2 left-2 rounded-full bg-black/60 p-1 shadow-sm text-white backdrop-blur-md">
              <Lock className="h-3 w-3" />
            </div>
          )}
          {video.isFree && !isAdmin && (
            <div className="absolute top-2 left-2 rounded bg-green-500/90 px-1.5 py-0.5 text-[10px] text-white shadow-sm font-bold">
              متاح للجميع
            </div>
          )}
          {video.duration && (
            <div className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
              {video.duration}
            </div>
          )}
        </div>

        {/* Info */}
        <CardContent className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <div>
            <p className="font-semibold text-lg line-clamp-2">{video.title}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {video.type === "theory" && <span>شرح</span>}
              {video.type === "review" && <span>مراجعة</span>}
              {video.type === "practical" && <span>عملي</span>}
              {video.sourceType === "youtube" && <Youtube className="h-3 w-3 text-red-500" />}
              {video.sourceType === "telegram" && <span>Telegram</span>}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {isAdmin && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`p-1.5 h-auto ${video.isFree ? 'text-green-600 hover:text-orange-600' : 'text-orange-600 hover:text-green-600'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFree(video.id, !!video.isFree);
                    }}
                    title={video.isFree ? 'تحويل للمشتركين فقط' : 'تحويل لمجاني'}
                  >
                    {video.isFree ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-1.5 h-auto"
                  title="تعديل الفيديو"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Edit video clicked:", video.id);
                    onEdit?.(video);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive p-1.5 h-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(video.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                </>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleComplete(video.id);
              }}
              className="transition-colors"
              style={{ color: isCompleted ? color : "currentColor" }}
            >
              {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6 text-muted-foreground" />}
            </button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function FileCard({
  file,
  onPreview,
  onDelete,
  isAdmin,
  isCompleted,
  onToggleComplete,
  color,
  hasSubjectAccess,
  onToggleFree,
  onToggleDownload,
  onToggleView,
  onOpenAccess,
}: {
  file: FileItem;
  onPreview: (file: FileItem) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
  color: string;
  hasSubjectAccess: boolean;
  onToggleFree: (fileId: string, currentIsFree: boolean) => void;
  onToggleDownload: (fileId: string, current: boolean) => void;
  onToggleView: (fileId: string, current: boolean) => void;
  onOpenAccess: () => void;
}) {
  const canAccess = isAdmin || file.isFree || hasSubjectAccess;

  return (
    <Card className={`hover:border-primary/50 transition-all group ${!canAccess ? 'opacity-80' : ''}`}>
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onToggleComplete(file.id)}
            className="transition-colors shrink-0"
            style={{ color: isCompleted ? color : "currentColor" }}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
            style={{ backgroundColor: color + "20" }}
          >
            <FileText className="h-5 w-5" style={{ color: color }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">{file.title}</p>
            <p className="text-xs text-muted-foreground">
              {file.fileType.toUpperCase()} {file.size && `• ${file.size}`}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {file.isFree && !isAdmin && (
                <span className="rounded bg-green-500/90 px-1.5 py-0.5 text-[10px] text-white font-bold">
                  مجاني
                </span>
              )}
              {file.canDownload && (
                <span className="rounded bg-orange-500/90 px-1.5 py-0.5 text-[10px] text-white font-bold">
                  تحميل
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          {!canAccess && (
            <div className="rounded-full bg-black/60 p-1.5 shadow-sm text-white backdrop-blur-md ml-1">
              <Lock className="h-4 w-4" />
            </div>
          )}
          {canAccess ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => onPreview(file)} className="gap-1">
                <Eye className="h-4 w-4" />
                <span className="hidden sm:inline">معاينة</span>
              </Button>
              {file.canDownload && (
                <Button
                  size="sm"
                  className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  asChild
                >
                  <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4" />
                    تحميل
                  </a>
                </Button>
              )}
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={onOpenAccess} className="gap-1">
              <Lock className="h-4 w-4" />
              تسجيل دخول
            </Button>
          )}
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className={`p-2 h-auto ${file.isFree ? 'text-green-600 hover:text-orange-600 hover:bg-orange-50' : 'text-orange-600 hover:text-green-600 hover:bg-green-50'}`}
                onClick={() => onToggleFree(file.id, !!file.isFree)}
                title={file.isFree ? 'تحويل للمشتركين فقط' : 'تحويل لمجاني'}
              >
                {file.isFree ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`p-2 h-auto ${file.canDownload ? 'text-orange-600 hover:text-orange-800' : 'text-muted-foreground hover:text-orange-600'}`}
                onClick={() => onToggleDownload(file.id, !!file.canDownload)}
                title={file.canDownload ? 'تعطيل التحميل' : 'تفعيل التحميل'}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`p-2 h-auto ${file.canView ? 'text-blue-600 hover:text-blue-800' : 'text-muted-foreground hover:text-blue-600'}`}
                onClick={() => onToggleView(file.id, !!file.canView)}
                title={file.canView ? 'تعطيل المشاهدة' : 'تفعيل المشاهدة'}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(file.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AssessmentCard({
  assessment,
  onDelete,
  isAdmin,
  isCompleted,
  onToggleComplete,
  color,
  hasSubjectAccess,
  onToggleFree,
  onOpenAccess,
}: {
  assessment: Assessment;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  isCompleted: boolean;
  onToggleComplete: (id: string) => void;
  color: string;
  hasSubjectAccess: boolean;
  onToggleFree: (assessmentId: string, currentIsFree: boolean) => void;
  onOpenAccess: () => void;
}) {
  const canAccess = isAdmin || assessment.isFree || hasSubjectAccess;

  return (
    <Card className={`hover:border-primary/50 transition-all ${!canAccess ? 'opacity-80' : ''}`}>
      <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onToggleComplete(assessment.id)}
            className="transition-colors shrink-0"
            style={{ color: isCompleted ? color : "currentColor" }}
          >
            {isCompleted ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
            style={{ backgroundColor: color + "20" }}
          >
            <LayoutDashboard className="h-5 w-5" style={{ color: color }} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{assessment.title}</p>
            <p className="text-xs text-muted-foreground">رابط اختبار إلكتروني</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          {!canAccess && (
            <div className="rounded-full bg-black/60 p-1.5 shadow-sm text-white backdrop-blur-md ml-1">
              <Lock className="h-4 w-4" />
            </div>
          )}
          {assessment.isFree && !isAdmin && (
            <span className="rounded bg-green-500/90 px-2 py-0.5 text-xs text-white font-bold">
              مجاني
            </span>
          )}
          {canAccess ? (
            <Button size="sm" className="gap-1" asChild style={{ backgroundColor: color }}>
              <a href={assessment.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">بدء الاختبار</span>
                <span className="sm:hidden">اختبار</span>
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={onOpenAccess} className="gap-1">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">تسجيل دخول</span>
            </Button>
          )}
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className={`p-2 h-auto ${assessment.isFree ? 'text-green-600 hover:text-orange-600 hover:bg-orange-50' : 'text-orange-600 hover:text-green-600 hover:bg-green-50'}`}
                onClick={() => onToggleFree(assessment.id, !!assessment.isFree)}
                title={assessment.isFree ? 'تحويل للمشتركين فقط' : 'تحويل لمجاني'}
              >
                {assessment.isFree ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(assessment.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ComponentType<{ className?: string }>; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
