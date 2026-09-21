export interface CompressOptions {
  /** Max width in px; aspect ratio is preserved — images are never cropped. */
  maxW?: number;
  quality?: number; // JPEG quality 0..1
}

/**
 * Resizes an image file client-side to a small JPEG data URL.
 * Only downscales — it never crops or changes the aspect ratio, so the
 * whole image always fits. Used for Firestore-embedded images (1MB doc limit).
 */
export function compressImage(file: File, options: CompressOptions = {}): Promise<string> {
  const { maxW = 480, quality = 0.75 } = options;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas unavailable"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("invalid image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Rough byte size of a base64 data URL (used to guard the Firestore doc limit). */
export function dataUrlBytes(url: string): number {
  const sep = url.indexOf(",");
  const base64 = sep === -1 ? url : url.slice(sep + 1);
  return Math.round(base64.length * 0.75);
}