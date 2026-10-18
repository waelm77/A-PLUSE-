export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB
export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png"];

// Cloudinary product environment. Fill these from your Cloudinary dashboard:
// - CLOUDINARY_CLOUD_NAME: shown on the dashboard home ("Cloud name").
// - CLOUDINARY_UPLOAD_PRESET: an *unsigned* upload preset name.
export const CLOUDINARY_CLOUD_NAME = "dgaw8ggo";
export const CLOUDINARY_UPLOAD_PRESET = "ml_default";

/**
 * Uploads a PDF/image to Cloudinary (unsigned) and returns both the delivery
 * URL and the asset's public id (kept for reference; see deleteStorageObject).
 */
export async function uploadFile(
  file: File,
  subjectId: string,
  onProgress?: (percent: number) => void
): Promise<{ downloadUrl: string; storagePath: string }> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("لم يتم إعداد خدمة تخزين الملفات بعد (Cloudinary)");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("حجم الملف يتجاوز الحد الأقصى (50 ميجابايت)");
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    throw new Error("يُسمح فقط بملفات PDF أو صور JPEG / PNG");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", `files/${subjectId}`);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

  return new Promise<{ downloadUrl: string; storagePath: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as { secure_url?: string; public_id?: string };
          if (!data.secure_url) throw new Error("رد غير متوقع من خدمة التخزين");
          resolve({ downloadUrl: data.secure_url, storagePath: data.public_id || "" });
        } catch (err) {
          reject(err);
        }
      } else {
        let msg = `فشل رفع الملف (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          if (parsed?.error?.message) msg = parsed.error.message;
        } catch {
          // keep the generic message
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("فشل الاتصال بخدمة التخزين"));
    xhr.send(form);
  });
}

/**
 * Cloudinary unsigned uploads can only be deleted from the client within 10
 * minutes of upload. Beyond that a signed server-side request is required, so
 * the asset is intentionally left in the Media Library (the Firestore record is
 * still removed by the caller). Kept best-effort and non-fatal.
 */
export async function deleteStorageObject(publicId: string): Promise<void> {
  console.warn("Cloudinary asset not removed (client-side delete unavailable):", publicId);
}
