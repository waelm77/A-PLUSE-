import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getAdmins } from "@/services/firestore";
import type { Admin } from "@/types";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    getAdmins().then(setAdmins).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const admin = admins.find((a) => a.email === email && a.password === password);
    if (admin) {
      setUser({
        uid: admin.id,
        email: admin.email,
        name: admin.name,
        role: "admin",
      });
      toast.success(`مرحباً ${admin.name}!`);
      navigate("/");
    } else if (email === "admin@example.com" && password === "admin123" && admins.length === 0) {
      // Bootstrap fallback when no admins exist in Firestore yet
      setUser({
        uid: "admin@example.com",
        email: "admin@example.com",
        name: "د. وائل عبد الفتاح",
        role: "admin",
      });
      toast.success("مرحباً! يرجى إضافة مشرف جديد من لوحة التحكم.");
      navigate("/");
    } else {
      toast.error("البريد أو الرقم السري غير صحيح");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-grid p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <Card className="w-full max-w-md relative glass border-none">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-black">
            <span className="text-gradient">تسجيل الدخول</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            أدخل بياناتك للوصول إلى المنصة
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student1@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">الرقم السري</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              تسجيل الدخول
            </Button>
          </form>

          <div className="mt-6 border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground text-center mb-3">دخول الأدمن فقط</p>
            {admins.length === 0 && !loading && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>الأدمن الافتراضي: admin@example.com / admin123</p>
                <p className="text-amber-500">قم بإضافة مشرف جديد بعد تسجيل الدخول</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
