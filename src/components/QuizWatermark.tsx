import { useAuthStore } from "@/store/authStore";

/**
 * Diagonal watermark repeated over the WHOLE quiz dialog (covers every
 * question as the student scrolls, not just the first viewport):
 *   «لا أحلل نشره أو تداوله»   (top line)
 *   «اسم الطالب»              (below it)
 * Implemented as a tiled SVG background so density is uniform for any content
 * height, pointer-events-none so it never blocks clicks. Admins/guests (no
 * student session) get no watermark.
 */
function watermarkTile(name: string): string {
  const safe = name.replace(/["'<>]/g, "").slice(0, 40);
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="260" height="190" viewBox="0 0 260 190">',
    '<text x="130" y="80" text-anchor="middle" fill="rgba(113,113,122,0.18)" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold" transform="rotate(-30 130 80)">لا أحلل نشره أو تداوله</text>',
    `<text x="130" y="112" text-anchor="middle" fill="rgba(113,113,122,0.24)" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" transform="rotate(-30 130 112)">\u00AB${safe}\u00BB</text>`,
    "</svg>",
  ].join("");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/'/g, "%27")}`;
}

export default function QuizWatermark() {
  const name = useAuthStore((s) => s.studentSession?.displayName)?.trim();
  if (!name) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-2 z-10 select-none"
      style={{ backgroundImage: `url("${watermarkTile(name)}")`, backgroundRepeat: "repeat" }}
    />
  );
}