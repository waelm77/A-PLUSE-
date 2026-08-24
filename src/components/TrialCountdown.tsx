import { useState, useEffect } from "react";
import { useTrialStore } from "@/store/trialStore";
import { Clock, AlertTriangle } from "lucide-react";
import type { Subject } from "@/types";

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

function CountdownBox({
  title,
  endDate,
  expiredTitle,
}: {
  title: string;
  endDate: string;
  expiredTitle?: string;
}) {
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(() => getTimeLeft(endDate));

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setTime(getTimeLeft(endDate));
    const id = setInterval(() => setTime(getTimeLeft(endDate)), 1000);
    return () => clearInterval(id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [endDate]);

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
            <p className="text-xl font-bold text-red-500">{expiredTitle || `${title} — انتهى الوقت`}</p>
            <p className="text-sm text-muted-foreground">يرجى التواصل مع الإدارة للحصول على اشتراك</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              <p className="text-lg font-bold">{title}</p>
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

export default function TrialCountdown() {
  const { endDate, active, loaded, startListening } = useTrialStore();

  useEffect(() => {
    const unsub = startListening();
    return () => unsub();
  }, [startListening]);

  if (!loaded || !active || !endDate) return null;

  return (
    <CountdownBox title="الفترة التجريبية تنتهي خلال" endDate={endDate} expiredTitle="انتهت الفترة التجريبية" />
  );
}

export function SubjectCountdown({ subject }: { subject: Subject }) {
  if (!subject.countdownActive || !subject.countdownEndDate) return null;

  return (
    <CountdownBox
      title={subject.countdownTitle?.trim() || "الفترة التجريبية تنتهي خلال"}
      endDate={subject.countdownEndDate}
    />
  );
}
