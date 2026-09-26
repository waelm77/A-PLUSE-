import { useAuthStore } from "@/store/authStore";

const TILE_COUNT = 24;

/**
 * Diagonal watermark shown over the quiz dialog while a student is solving:
 *   «لا أحلل نشره أو تداوله»
 *   «اسم الطالب»
 * It travels with the scrollable content (covers every question) and never
 * blocks clicks (pointer-events-none). No watermark for admins/guests.
 */
export default function QuizWatermark() {
  const name = useAuthStore((s) => s.studentSession?.displayName)?.trim();
  if (!name) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-16 z-10 flex flex-wrap content-center items-center justify-center gap-x-8 gap-y-6 overflow-hidden rotate-[-30deg] select-none"
    >
      {Array.from({ length: TILE_COUNT }).map((_, i) => (
        <span key={i} className="flex flex-col items-center gap-1 whitespace-nowrap">
          <span className="text-sm font-bold text-foreground/10">لا أحلل نشره أو تداوله</span>
          <span className="text-xl font-black text-foreground/15">«{name}»</span>
        </span>
      ))}
    </div>
  );
}