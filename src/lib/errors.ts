/**
 * Turns a thrown value into a message worth showing an admin.
 *
 * The codebase used to swallow every failure behind a fixed string ("حدث خطأ أثناء
 * الحذف"), which made real problems — a permission-denied write, a typo'd field, a
 * dead network — indistinguishable from each other in production. This maps the
 * Firebase codes we can actually act on, and falls back to the raw message when we
 * cannot, so the toast still carries information.
 */

/** Firebase Firestore error codes worth naming explicitly. */
const FIRESTORE_MESSAGES: Record<string, string> = {
  "permission-denied": "لا تملك صلاحية تنفيذ هذه العملية",
  unavailable: "تعذّر الوصول إلى الخادم — تحقّق من الاتصال",
  "deadline-exceeded": "انتهت مهلة الطلب — حاول مرة أخرى",
  "not-found": "العنصر غير موجود أو تم حذفه",
  "already-exists": "العنصر موجود بالفعل",
  "resource-exhausted": "تم تجاوز الحد المسموح — جرّب بعد قليل",
  "failed-precondition": "العملية لا يمكن تنفيذها في الحالة الحالية",
  unauthenticated: "انتهت الجلسة — سجّل الدخول من جديد",
}

/** Firebase Auth error codes. `auth/` is stripped before the lookup. */
const AUTH_MESSAGES: Record<string, string> = {
  "invalid-credential": "اسم المستخدم أو كلمة المرور غير صحيحة",
  "user-not-found": "لا يوجد حساب بهذا الاسم",
  "wrong-password": "كلمة المرور غير صحيحة",
  "invalid-email": "صيغة البريد الإلكتروني غير صحيحة",
  "email-already-in-use": "هذا البريد مستخدم بالفعل",
  "weak-password": "كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل",
  "too-many-requests": "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة",
  "network-request-failed": "فشل الاتصال بالشبكة",
  "popup-closed-by-user": "أُلغيت عملية تسجيل الدخول",
  "requires-recent-login": "سجّل الدخول من جديد لإتمام هذه العملية",
  "user-disabled": "هذا الحساب معطّل",
}

function looksLikeCode(value: string, table: Record<string, string>) {
  if (value in table) return table[value]
  // Auth errors arrive as "auth/wrong-password"; Firestore sometimes as
  // "firestore/permission-denied" once they pass through a wrapper.
  const tail = value.includes("/") ? value.slice(value.indexOf("/") + 1) : value
  return table[tail]
}

/**
 * @param error   The caught value.
 * @param fallback Message to use when `error` carries nothing useful. Keep it
 *                 specific about the action ("تعذّر حذف الاختبار") rather than generic.
 */
export function errorMessage(error: unknown, fallback: string): string {
  if (error == null) return fallback

  // Plain strings and Firestore/Auth error objects both expose `message`, and the
  // latter expose `code` — prefer `code` because it is stable across SDK versions.
  if (typeof error === "object" || error instanceof Error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === "string") {
      const mapped = looksLikeCode(code, FIRESTORE_MESSAGES) ?? looksLikeCode(code, AUTH_MESSAGES)
      if (mapped) return mapped
    }
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message
  }

  if (typeof error === "string" && error.trim()) return error
  return fallback
}
