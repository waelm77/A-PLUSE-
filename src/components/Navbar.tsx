import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  LogOut,
  Shield,
  User,
} from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";

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
          {isAuthenticated ? (
            <>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="gap-1 px-2 sm:px-3"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">لوحة التحكم</span>
                </Button>
              )}
              <div className="flex items-center gap-1 sm:gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium max-w-[80px] sm:max-w-[120px] truncate hidden sm:inline">{user?.name || user?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1 px-2 sm:px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">خروج</span>
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate("/login")}>
              تسجيل الدخول
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
