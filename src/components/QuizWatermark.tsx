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
    '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="105" viewBox="0 0 150 105">',
    '<text x="75" y="46" text-anchor="middle" fill="rgba(113,113,122,0.28)" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="bold" transform="rotate(-30 75 46)">لا أحلل نشره أو تداوله</text>',
    `<text x="75" y="66" text-anchor="middle" fill="rgba(113,113,122,0.42)" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="900" transform="rotate(-30 75 66)">\u00AB${safe}\u00BB</text>`,
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