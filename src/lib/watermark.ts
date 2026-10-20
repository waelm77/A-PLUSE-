export type WatermarkKind = "pdf" | "image";

type WatermarkStudent = { username: string; displayName: string };

/** Arabic-aware canvas text needs the browser's own shaping, so everything is
 *  rendered to a transparent PNG tile that pdf-lib can stamp onto pages. */
const WATERMARK_LINE_2 = "لا أحلل نشره أو تداوله";

const BASE_ROTATION_DEG = -28;

function safeText(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

/** Deterministic djb2 hash of the student's username. Seeded into the grid
 *  offset, tile rotation and the fingerprint checksum so every student's copy
 *  differs — a single "remove this pattern" template no longer matches them all. */
function hashSeed(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/** Obfuscated identity carried inside the delivered file (PDF metadata /
 *  PNG tEXt / JPEG comment). Not encryption — a leak can be traced back to
 *  the student it was issued to, without the payload reading as plain text. */
function fingerprintPayload(username: string): string {
  const user = safeText(username) || "unknown";
  return `a+${encodeURIComponent(user)}+${hashSeed(user).toString(36)}`;
}

/** Counterpart of the payload above; used when inspecting a leaked copy. */
export function parseFingerprint(payload: string): string | null {
  const m = payload.match(/^a\+(.+)\+([0-9a-z]+)$/);
  if (!m) return null;
  try {
    const user = decodeURIComponent(m[1]);
    if (hashSeed(user).toString(36) !== m[2]) return null;
    return user;
  } catch {
    return null;
  }
}

/**
 * Renders a transparent tile containing the student's name and the usage
 * warning, rotated diagonally. The tile is what gets repeated across pages.
 * Text is drawn as an outline so the interior of every letter stays clear and
 * never obscures the content underneath it.
 */
export function renderWatermarkTile(studentName: string, rotationDeg: number = BASE_ROTATION_DEG): string {
  const scale = 2;
  const w = 420;
  const h = 210;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تهيئة لوحة الرسم للعلامة المائية");

  ctx.scale(scale, scale);
  ctx.translate(w / 2, h / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(20, 20, 30, 0.95)";
  ctx.fillStyle = "rgba(20, 20, 30, 0.08)";

  const name = safeText(studentName) || "طالب";

  ctx.font = "bold 26px 'Segoe UI', Tahoma, Arial, sans-serif";
  ctx.strokeText(name, 0, -14);
  ctx.fillText(name, 0, -14);

  ctx.font = "18px 'Segoe UI', Tahoma, Arial, sans-serif";
  ctx.strokeText(WATERMARK_LINE_2, 0, 20);
  ctx.fillText(WATERMARK_LINE_2, 0, 20);

  return canvas.toDataURL("image/png");
}

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("تعذّر قراءة الصورة"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function watermarkPdf(bytes: ArrayBuffer, student: WatermarkStudent): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const seed = hashSeed(student.username);
  const rotation = BASE_ROTATION_DEG + (seed % 7) - 3;
  const tile = renderWatermarkTile(student.displayName, rotation);
  const img = await pdf.embedPng(tile);

  const tw = 320;
  const th = 160;
  const offsetX = seed % tw;
  const offsetY = (seed >>> 8) % th;
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    for (let y = -th / 2 + offsetY; y < height + th; y += th) {
      for (let x = -tw / 2 + offsetX; x < width + tw; x += tw) {
        page.drawImage(img, { x, y, width: tw, height: th, opacity: 0.24 });
      }
    }
  }

  const payload = fingerprintPayload(student.username);
  pdf.setSubject(payload);
  pdf.setKeywords([payload]);

  const out = await pdf.save();
  return new Blob([out as BlobPart], { type: "application/pdf" });
}

// ─── Fingerprint embedding for raster images ────────────────────────────────

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function be32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Inserts a tEXt chunk right after IHDR (standard-conformant, readers ignore
 *  unknown text keys). The payload is ASCII-only thanks to encodeURIComponent. */
function injectPngText(bytes: Uint8Array, payload: string): Uint8Array {
  const type = new Uint8Array([0x74, 0x45, 0x58, 0x74]); // "tEXt"
  const data = concatBytes([
    new Uint8Array(new TextEncoder().encode("APlusComment")),
    new Uint8Array([0]),
    new Uint8Array(new TextEncoder().encode(payload)),
  ]);
  const chunk = concatBytes([be32(data.length), type, data, be32(crc32(concatBytes([type, data])))]);
  // Signature (8) + IHDR header (8) + IHDR data (13) + IHDR CRC (4) = 33
  return concatBytes([bytes.subarray(0, 33), chunk, bytes.subarray(33)]);
}

/** Inserts a COM marker right after SOI — the earliest legal comment position. */
function injectJpegComment(bytes: Uint8Array, payload: string): Uint8Array {
  const body = new Uint8Array(new TextEncoder().encode(payload));
  const marker = new Uint8Array(4 + body.length);
  marker[0] = 0xff;
  marker[1] = 0xfe;
  marker[2] = ((body.length + 2) >> 8) & 0xff;
  marker[3] = (body.length + 2) & 0xff;
  marker.set(body, 4);
  return concatBytes([bytes.subarray(0, 2), marker, bytes.subarray(2)]);
}

async function attachFingerprint(blob: Blob, username: string): Promise<Blob> {
  const payload = fingerprintPayload(username);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (blob.type === "image/png") {
    return new Blob([injectPngText(bytes, payload) as BlobPart], { type: "image/png" });
  }
  if (blob.type === "image/jpeg") {
    return new Blob([injectJpegComment(bytes, payload) as BlobPart], { type: "image/jpeg" });
  }
  return blob;
}

async function watermarkImage(blob: Blob, student: WatermarkStudent): Promise<Blob> {
  const img = await loadImageFromBlob(blob);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تهيئة لوحة الرسم للعلامة المائية");

  const seed = hashSeed(student.username);
  const rotation = BASE_ROTATION_DEG + (seed % 7) - 3;

  ctx.drawImage(img, 0, 0);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.globalAlpha = 0.28;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const step = Math.max(160, canvas.width / 3);
  const offsetX = seed % step;
  const offsetY = (seed >>> 8) % step;
  const name = safeText(student.displayName) || "طالب";
  for (let x = -canvas.width + offsetX; x < canvas.width; x += step) {
    for (let y = -canvas.height + offsetY; y < canvas.height; y += step) {
      ctx.font = `bold ${Math.max(20, canvas.width / 26)}px 'Segoe UI', Tahoma, Arial, sans-serif`;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#111827";
      ctx.fillStyle = "rgba(17, 24, 39, 0.1)";
      ctx.strokeText(name, x, y);
      ctx.fillText(name, x, y);
      ctx.font = `${Math.max(14, canvas.width / 38)}px 'Segoe UI', Tahoma, Arial, sans-serif`;
      ctx.strokeText(WATERMARK_LINE_2, x, y + Math.max(24, canvas.width / 20));
      ctx.fillText(WATERMARK_LINE_2, x, y + Math.max(24, canvas.width / 20));
    }
  }
  ctx.restore();

  const outType = blob.type === "image/png" ? "image/png" : "image/jpeg";
  const drawn = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر إنشاء الصورة"))), outType, 0.92);
  });
  return await attachFingerprint(drawn, student.username);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function buildFilename(title: string, studentName: string, ext: string): string {
  const t = safeText(title).replace(/[\\/:*?"<>|]+/g, "_") || "ملف";
  const n = safeText(studentName).replace(/[\\/:*?"<>|]+/g, "_") || "طالب";
  const safeExt = ext.startsWith(".") ? ext : `.${ext}`;
  return `${t} - ${n}${safeExt}`;
}

/**
 * Fetches the original bytes and returns a watermarked copy. Throws (the caller
 * must block access) when the file cannot be fetched or processed, so a failed
 * fetch never leaks the original file.
 */
export async function buildWatermarkedBlob(params: {
  url: string;
  kind: WatermarkKind;
  student: WatermarkStudent;
}): Promise<{ blob: Blob; ext: string }> {
  const { url, kind, student } = params;

  let blob: Blob;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    blob = await res.blob();
  } catch (err) {
    console.error("Watermark fetch error:", err);
    throw new Error("تعذّر جلب الملف بأمان — الرابط يمنع المعالجة. تواصل مع الإدارة");
  }

  if (kind === "pdf") {
    const bytes = await blob.arrayBuffer();
    try {
      return { blob: await watermarkPdf(bytes, student), ext: ".pdf" };
    } catch (err) {
      console.error("Watermark pdf error:", err);
      throw new Error("تعذّر تجهيز ملف PDF بالعلامة المائية");
    }
  }

  try {
    return { blob: await watermarkImage(blob, student), ext: blob.type === "image/png" ? ".png" : ".jpg" };
  } catch (err) {
    console.error("Watermark image error:", err);
    throw new Error("تعذّر تجهيز الصورة بالعلامة المائية");
  }
}

/**
 * Builds the watermarked file and downloads it.
 */
export async function deliverWatermarkedFile(params: {
  url: string;
  kind: WatermarkKind;
  title: string;
  student: WatermarkStudent;
}): Promise<void> {
  const { blob, ext } = await buildWatermarkedBlob(params);
  triggerDownload(blob, buildFilename(params.title, params.student.displayName, ext));
}
