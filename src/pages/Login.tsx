import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const DEMO_USERS = [
  { name: "أحمد محمد", email: "student1@example.com", password: "123456", role: "student" as const },
  { name: "سارة عبدالله", email: "student2@example.com", password: "123456", role: "student" as const },
  { name: "خالد سعد", email: "student3@example.com", password: "123456", role: "student" as const },
  { name: "نورة فهد", email: "student4@example.com", password: "123456", role: "student" as const },
  { name: "عبدالرحمن علي", email: "student5@example.com", password: "123456", role: "student" as const },
  { name: "د. وائل عبد الفتاح", email: "admin@example.com", password: "admin123", role: "admin" as const },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = DEMO_USERS.find((u) => u.email === email && u.password === password);
    if (user) {
      setUser({
        uid: user.email,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      toast.success(`مرحباً ${user.name}!`);
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
            <p className="text-xs text-muted-foreground text-center mb-3">حسابات تجريبية</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>طالب: student1@example.com / 123456</p>
              <p>أدمن: admin@example.com / admin123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
