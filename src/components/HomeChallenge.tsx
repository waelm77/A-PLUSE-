import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, BookOpen } from "lucide-react";
import { iconMap } from "@/lib/constants";
import type { Subject } from "@/types";

const GOLD = "#FFD700";

export default function HomeChallenge({ subjects }: { subjects: Subject[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);
  const activeSubjects = subjects.filter(
    (s) =>
      s.challengeActive &&
      (!s.challengeStartDate || now >= new Date(s.challengeStartDate).getTime()) &&
      s.challengeEndDate &&
      now < new Date(s.challengeEndDate).getTime()
  );

  if (activeSubjects.length === 0) return null;

  return (
    <section className="container mx-auto px-4 pb-8">
      <div
        className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
        style={{ background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}08)`, borderColor: GOLD + "55" }}
      >
        <div className="absolute -top-1/2 -right-1/2 h-[280px] w-[280px] rounded-full blur-[80px]" style={{ background: GOLD + "22" }} />
        <div className="relative z-10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg" style={{ backgroundColor: GOLD }}>
              <Trophy className="h-6 w-6 text-white" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">ساحة التحدي</h2>
              <p className="text-sm text-muted-foreground">شارك في تحديات المواد الآن</p>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {activeSubjects.map((s) => {
              const Icon = iconMap[s.icon] || BookOpen;
              return (
                <Link key={s.id} to={`/subject/${s.id}`} className="block">
                  <div
                    className="flex items-center gap-3 rounded-xl border p-3 transition-transform hover:-translate-y-1 hover:shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${s.color}22, ${s.color}08)`,
                      borderColor: s.color + "55",
                    }}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow"
                      style={{ backgroundColor: s.color, boxShadow: `0 4px 14px ${s.color}55` }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black" style={{ color: s.color }}>
                        {s.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">شارك في التحدي الآن</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}