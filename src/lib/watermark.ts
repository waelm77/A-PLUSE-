export type WatermarkKind = "pdf" | "image";

type WatermarkStudent = { username: string; displayName: string };

/** Arabic-aware canvas text needs the browser's own shaping, so everything is
 *  rendered to a transparent PNG tile that pdf-lib can stamp onto pages. */
const WATERMARK_LINE_2 = "لا أحلل نشره أو تداوله";

function safeText(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

/**
 * Renders a transparent tile containing the student's name and the usage
 * warning, rotated diagonally. The tile is what gets repeated across pages.
 */
export function renderWatermarkTile(studentName: string, subjectName?: string): string {
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
  ctx.rotate((-28 * Math.PI) / 180);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(20, 20, 30, 0.85)";

  const name = safeText(studentName) || "طالب";
  const subject = safeText(subjectName);

  ctx.font = "bold 26px 'Segoe UI', Tahoma, Arial, sans-serif";
  ctx.fillText(name, 0, subject ? -18 : 0);

  ctx.font = "18px 'Segoe UI', Tahoma, Arial, sans-serif";
  if (subject) ctx.fillText(subject, 0, 12);
  ctx.fillText(WATERMARK_LINE_2, 0, subject ? 40 : 26);

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

async function watermarkPdf(bytes: ArrayBuffer, studentName: string, subjectName?: string): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const tile = renderWatermarkTile(studentName, subjectName);
  const img = await pdf.embedPng(tile);

  const tw = 360;
  const th = 180;
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    for (let y = -th / 2; y < height + th; y += th) {
      for (let x = -tw / 2; x < width + tw; x += tw) {
        page.drawImage(img, { x, y, width: tw, height: th, opacity: 0.12 });
      }
    }
  }
  const out = await pdf.save();
  return new Blob([out as BlobPart], { type: "application/pdf" });
}

async function watermarkImage(blob: Blob, studentName: string, subjectName?: string): Promise<Blob> {
  const img = await loadImageFromBlob(blob);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر تهيئة لوحة الرسم للعلامة المائية");

  ctx.drawImage(img, 0, 0);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((-28 * Math.PI) / 180);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const step = Math.max(160, canvas.width / 3);
  const name = safeText(studentName) || "طالب";
  const subject = safeText(subjectName);
  for (let x = -canvas.width; x < canvas.width; x += step) {
    for (let y = -canvas.height; y < canvas.height; y += step) {
      ctx.font = `bold ${Math.max(20, canvas.width / 26)}px 'Segoe UI', Tahoma, Arial, sans-serif`;
      ctx.fillText(name, x, y);
      if (subject) {
        ctx.font = `${Math.max(14, canvas.width / 38)}px 'Segoe UI', Tahoma, Arial, sans-serif`;
        ctx.fillText(subject, x, y + Math.max(24, canvas.width / 20));
      }
    }
  }
  ctx.restore();

  const outType = blob.type === "image/png" ? "image/png" : "image/jpeg";
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("تعذّر إنشاء الصورة"))), outType, 0.92);
  });
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
  subjectName?: string;
}): Promise<{ blob: Blob; ext: string }> {
  const { url, kind, student, subjectName } = params;

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
      return { blob: await watermarkPdf(bytes, student.displayName, subjectName), ext: ".pdf" };
    } catch (err) {
      console.error("Watermark pdf error:", err);
      throw new Error("تعذّر تجهيز ملف PDF بالعلامة المائية");
    }
  }

  try {
    return { blob: await watermarkImage(blob, student.displayName, subjectName), ext: blob.type === "image/png" ? ".png" : ".jpg" };
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
  subjectName?: string;
}): Promise<void> {
  const { blob, ext } = await buildWatermarkedBlob(params);
  triggerDownload(blob, buildFilename(params.title, params.student.displayName, ext));
}
