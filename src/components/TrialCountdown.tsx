import { useState, useEffect } from "react";
import { useTrialStore } from "@/store/trialStore";
import { Clock, AlertTriangle } from "lucide-react";

function getTimeLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

export default function TrialCountdown({ variant = "home" }: { variant?: "home" | "subject" }) {
  const {
    endDate,
    active,
    subjectActive,
    subjectTitle,
    subjectEndDate,
    loaded,
    startListening,
  } = useTrialStore();
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null);

  useEffect(() => {
    const unsub = startListening();
    return () => unsub();
  }, [startListening]);

  const isEnabled = variant === "home" ? active : subjectActive;
  const effectiveEndDate =
    variant === "home"
      ? endDate
      : subjectEndDate || endDate;

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!loaded || !isEnabled || !effectiveEndDate) {
      setTime(null);
      return;
    }
    setTime(getTimeLeft(effectiveEndDate));
    const id = setInterval(() => setTime(getTimeLeft(effectiveEndDate)), 1000);
    return () => clearInterval(id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isEnabled, effectiveEndDate, loaded]);

  if (!time) return null;

  const units = [
    { label: "يوم", value: time.days },
    { label: "ساعة", value: time.hours },
    { label: "دقيقة", value: time.minutes },
    { label: "ثانية", value: time.seconds },
  ];

  return (
    <section className="container mx-auto px-4 pb-8">
      <div
        className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 text-center ${
          time.expired
            ? "bg-red-500/10 border border-red-500/30"
            : "bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20"
        }`}
      >
        {time.expired ? (
          <div className="flex flex-col items-center gap-3">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <p className="text-xl font-bold text-red-500">
              {variant === "subject"
                ? `${subjectTitle} — انتهى الوقت`
                : "انتهت الفترة التجريبية"}
            </p>
            <p className="text-sm text-muted-foreground">يرجى التواصل مع الإدارة للحصول على اشتراك</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <p className="text-lg font-bold">
                {variant === "subject" ? subjectTitle : "الفترة التجريبية تنتهي خلال"}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 sm:gap-5">
              {units.map((u) => (
                <div key={u.label} className="flex flex-col items-center">
                  <div className="glass rounded-xl px-4 py-3 sm:px-6 sm:py-4 min-w-[64px] sm:min-w-[80px]">
                    <span className="text-3xl sm:text-5xl font-black text-primary tabular-nums">
                      {String(u.value).padStart(2, "0")}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground mt-2 font-medium">{u.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
