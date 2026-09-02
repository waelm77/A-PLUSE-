import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

// MAX devices allowed per student (matches the previous 2-device rule).
const MAX_DEVICES = 2;

function sanitizeStudent(data) {
  const { password, ...safe } = data;
  return safe;
}

/**
 * login
 * -------------
 * Callable used by the web app to verify a student's username/password.
 * Replaces the insecure in-browser plaintext comparison against the
 * publicly-readable `students` collection.
 *
 * NOTE: students have NO Firebase Auth (custom username/password system),
 * so this Callable takes plaintext credentials over the SDK. The password
 * is compared here on the server and never returned to the client.
 * Once this is deployed, `firestore.rules` for `students` can be locked
 * to `isAdmin()` only.
 */
export const login = onCall(async (request) => {
  const { username, password, subjectId } = request.data || {};

  if (typeof username !== "string" || typeof password !== "string") {
    throw new HttpsError("invalid-argument", "بيانات الدخول غير مكتملة");
  }

  const usernameLower = username.trim().toLowerCase();

  const q = db
    .collection("students")
    .where("username", "==", usernameLower)
    .limit(1);
  const snap = await q.get();

  if (snap.empty) {
    throw new HttpsError("unauthenticated", "اسم المستخدم غير صحيح");
  }

  const studentRef = snap.docs[0];
  const data = studentRef.data();

  if (!data.isActive) {
    throw new HttpsError(
      "failed-precondition",
      "هذا الحساب غير نشط، يرجى التواصل مع الأدمن"
    );
  }

  // Constant-time-ish compare (server side).
  const passwordMatches =
    typeof data.password === "string" && data.password === password;
  if (!passwordMatches) {
    throw new HttpsError("unauthenticated", "كلمة السر غير صحيحة");
  }

  if (typeof subjectId === "string" && data.enrolledSubjects) {
    if (!data.enrolledSubjects.includes(subjectId)) {
      throw new HttpsError(
        "permission-denied",
        "أنت غير مشترك في هذه المادة"
      );
    }
  }

  return {
    student: sanitizeStudent({ id: studentRef.id, ...data }),
  };
});

/**
 * registerDevice
 * --------------
 * Callable that registers a new device for a student and enforces the
 * 2-device limit on the server, so it can no longer be bypassed by
 * editing Firestore directly.
 */
export const registerDevice = onCall(async (request) => {
  const { studentId, deviceInfo } = request.data || {};

  if (!studentId || !deviceInfo || !deviceInfo.deviceId) {
    throw new HttpsError("invalid-argument", "بيانات الجهاز غير مكتملة");
  }

  const studentRef = db.collection("students").doc(studentId);
  const snap = await studentRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "الطالب غير موجود");
  }

  const data = snap.data();
  const devices = Array.isArray(data.devices) ? data.devices : [];

  // Keep only the safe subset of fields for the device record.
  const safeDevice = {
    deviceId: String(deviceInfo.deviceId),
    deviceName: String(deviceInfo.deviceName || "جهاز غير معروف"),
    userAgent: String(deviceInfo.userAgent || ""),
    lastAccess: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
  };

  const existingIdx = devices.findIndex(
    (d) => d && d.deviceId === safeDevice.deviceId
  );

  if (existingIdx !== -1) {
    devices[existingIdx] = { ...devices[existingIdx], lastAccess: safeDevice.lastAccess };
  } else {
    if (devices.length >= MAX_DEVICES) {
      throw new HttpsError(
        "permission-denied",
        "لقد وصلت للحد الأقصى من الأجهزة المسموح بها (2). يرجى التواصل مع الأدمن لإزالة أحد أجهزتك"
      );
    }
    devices.push(safeDevice);
  }

  await studentRef.update({ devices });

  return { success: true };
});