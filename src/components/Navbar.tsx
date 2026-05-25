import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  LogOut,
  Shield,
  User,
  UserCheck,
  LogIn,
  Key,
} from "lucide-react";
import {
  verifyStudentCredentials,
  registerDevice,
  getDeviceId,
  getDeviceName,
} from "@/services/firestore";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, isAuthenticated, studentSession, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [studentUsername, setStudentUsername] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentSubmitting, setStudentSubmitting] = useState(false);

  const handleStudentLogout = () => {
    useAuthStore.getState().setStudentSession(null);
    navigate("/");
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentUsername.trim() || !studentPassword.trim()) return;
    setStudentSubmitting(true);
    try {
      const result = await verifyStudentCredentials(
        studentUsername,
        studentPassword,
        ""
      );
      if (!result.valid || !result.student) {
        toast.error(result.error || "بيانات الدخول غير صحيحة");
        return;
      }

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
        toast.error(deviceResult.error || "حدث خطأ في تسجيل الجهاز");
        return;
      }

      useAuthStore.getState().setStudentSession({
        username: result.student.username,
        displayName: result.student.displayName,
        enrolledSubjects: result.student.enrolledSubjects,
        deviceId,
        loggedInAt: new Date().toISOString(),
      });

      toast.success(`مرحباً ${result.student.displayName}!`);
      setStudentDialogOpen(false);
    } catch {
      toast.error("حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setStudentSubmitting(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="icon-3d">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <span className="font-black">منصة <span style={{ color: '#FFD700' }}>A+</span></span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          {isAuthenticated && isAdmin ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin")}
                className="gap-1 px-2 sm:px-3"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </Button>
              <div className="flex items-center gap-1 sm:gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline">{user?.name || user?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1 px-2 sm:px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
            </>
          ) : studentSession ? (
            <>
              <div className="flex items-center gap-1 sm:gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium max-w-[80px] sm:max-w-[120px] truncate">{studentSession.displayName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleStudentLogout} className="gap-1 px-2 sm:px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStudentDialogOpen(true)}
                className="gap-1 px-2 sm:px-3"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">تسجيل دخول</span>
              </Button>
              <Button size="sm" onClick={() => navigate("/login")} className="gap-1 px-2 sm:px-3">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">مدير</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Student Login Dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-sm" dir="rtl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5" />
              تسجيل دخول الطالب
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStudentLogin} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="nav-student-user" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                اسم المستخدم
              </Label>
              <Input
                id="nav-student-user"
                value={studentUsername}
                onChange={(e) => setStudentUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
            <div>
              <Label htmlFor="nav-student-pass" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                كلمة السر
              </Label>
              <Input
                id="nav-student-pass"
                type="password"
                value={studentPassword}
                onChange={(e) => setStudentPassword(e.target.value)}
                placeholder="أدخل كلمة السر"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={studentSubmitting}>
              {studentSubmitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </nav>
  );
}
