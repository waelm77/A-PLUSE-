import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-grid">
      <div className="text-center">
        <h1 className="text-8xl font-black text-gradient mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">الصفحة غير موجودة</p>
        <Button asChild>
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    </div>
  );
}
