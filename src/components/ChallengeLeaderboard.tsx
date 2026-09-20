import type { ReactNode } from "react";
import { Trophy, Medal, Award, Star } from "lucide-react";
import { compareQuizResults } from "@/services/firestore";
import type { QuizResult } from "@/types";

export const MEDAL_COLORS = {
  gold: "#FFC000",
  silver: "#C4C9D0",
  bronze: "#A0522D",
} as const;

export const CERTIFICATE_COLOR = "#8B5CF6";

function attemptNote(r: QuizResult): string {
  return (r.bestAttempt || 1) === 1 ? "من المحاولة الأولى" : "من محاولتين";
}

function rankMeta(rank: number): {
  label: string;
  color: string;
  icon?: ReactNode;
  isCertificate: boolean;
} {
  if (rank === 0)
    return {
      label: "ذهبي",
      color: MEDAL_COLORS.gold,
      icon: <Trophy className="h-5 w-5 text-white" fill="currentColor" />,
      isCertificate: false,
    };
  if (rank === 1)
    return {
      label: "فضي",
      color: MEDAL_COLORS.silver,
      icon: <Medal className="h-5 w-5 text-white" fill="currentColor" />,
      isCertificate: false,
    };
  if (rank === 2)
    return {
      label: "برونزي",
      color: MEDAL_COLORS.bronze,
      icon: <Medal className="h-5 w-5 text-white" fill="currentColor" />,
      isCertificate: false,
    };
  return {
    label: "شهادة تقدير",
    color: CERTIFICATE_COLOR,
    icon: <Award className="h-5 w-5 text-white" fill="currentColor" />,
    isCertificate: true,
  };
}

export default function ChallengeLeaderboard({
  results,
  limit = 5,
  subjectColor = "#4f46e5",
  showMedalCounts,
  medalCounts,
  hideAttemptNote,
  emptyText = "لا توجد نتائج بعد — كن أول من يتحدى!",
}: {
  results: QuizResult[];
  limit?: number;
  subjectColor?: string;
  showMedalCounts?: boolean;
  medalCounts?: Record<string, number>;
  hideAttemptNote?: boolean;
  emptyText?: string;
}) {
  const top = [...results].sort(compareQuizResults).slice(0, limit);
  const maxScore = 100;

  if (top.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div>
      <div dir="ltr" className="w-full overflow-x-auto scrollbar-hide">
        <div className="relative min-w-[420px]" style={{ height: 220 }}>
          {/* Y axis gridlines */}
          <div className="absolute inset-0 flex flex-col justify-between pb-2">
            {[100, 75, 50, 25, 0].map((v) => (
              <div key={v} className="relative flex items-center">
                <div className="w-full border-t border-dashed border-border" />
                <span className="absolute -left-2 -translate-x-full text-[10px] text-muted-foreground tabular-nums">
                  {v}
                </span>
              </div>
            ))}
          </div>
          {/* Bars */}
          <div
            className="absolute inset-0 flex items-end justify-around gap-2 px-6"
            style={{ paddingBottom: 0 }}
          >
            {top.map((r, i) => {
              const meta = rankMeta(i);
              const barColor = i < 3 ? meta.color : subjectColor;
              const height = Math.max(8, (r.score / maxScore) * 100);
              return (
                <div key={r.id} className="flex flex-1 flex-col items-center justify-end h-full">
                  <span className="mb-1 text-sm font-black tabular-nums" style={{ color: barColor }}>
                    {r.score}%
                  </span>
                  <div
                    className="w-full max-w-[48px] rounded-t-md transition-all"
                    style={{
                      height: `${height}%`,
                      backgroundColor: i < 3 ? `color-mix(in srgb, ${barColor} 88%, white)` : subjectColor + "66",
                      boxShadow: i < 3 ? `0 -2px 12px ${barColor}55` : "none",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Names / medals row */}
      <div dir="ltr" className="mt-3 flex gap-2 px-6">
        {top.map((r, i) => {
          const meta = rankMeta(i);
          return (
            <div key={r.id} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full shadow-md"
                style={{
                  backgroundColor: meta.color,
                  boxShadow: meta.isCertificate ? `0 0 0 3px ${meta.color}33` : `0 2px 8px ${meta.color}66`,
                }}
              >
                {meta.icon}
                <span className="sr-only">{meta.label}</span>
              </div>
              <span className="max-w-full truncate text-xs font-bold">{r.studentName}</span>
              {!hideAttemptNote && (
                <span className="text-[10px] text-muted-foreground">{attemptNote(r)}</span>
              )}
              {showMedalCounts && medalCounts && medalCounts[r.username] ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  <Star className="h-3 w-3" fill="currentColor" />
                  {medalCounts[r.username]} ميدالية
                </span>
              ) : showMedalCounts ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  بلا ميداليات
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}