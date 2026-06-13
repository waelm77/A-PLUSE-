import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { loginWithEmail } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await loginWithEmail(email, password);
      toast.success("مرحباً! تم تسجيل الدخول بنجاح");
      navigate("/admin");
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      const msg = error?.message;
      const code = error?.code;
      if (msg === "تعذر تسجيل الدخول. الرجاء استخدام 'نسيت كلمة المرور'.") {
        toast.error(msg);
      } else if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("البريد أو الرقم السري غير صحيح");
      } else if (code === "auth/too-many-requests") {
        toast.error("تم حظر الحساب مؤقتاً. حاول لاحقاً.");
      } else if (code === "auth/email-already-in-use") {
        toast.error("البريد الإلكتروني مستخدم بالفعل في حساب آخر");
      } else {
        toast.error("حدث خطأ في تسجيل الدخول");
      }
    } finally {
      setSubmitting(false);
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
            أدخل بياناتك للوصول إلى لوحة التحكم
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
                placeholder="admin@example.com"
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>

          <div className="mt-6 border-t border-border/50 pt-4">
            <p className="text-xs text-muted-foreground text-center mb-3">دخول الأدمن فقط</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
