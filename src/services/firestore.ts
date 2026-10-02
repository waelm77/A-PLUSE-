import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  updateDoc,
  increment,
  setDoc,
  writeBatch,
  runTransaction,
  limit,
  orderBy,
  startAfter,
  onSnapshot,
} from "firebase/firestore";
import type { DocumentSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { normalizeSecretCode, normalizeUsername, usernameKey } from "../lib/studentForm";
import type { Subject, Video, FileItem, Assessment, Student, DeviceInfo, Ticker, Admin, DailyVisit, VideoStats, Quiz, QuizOption, QuizResult, StudentMedals, Medal, MaterialQuizDone } from "../types";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Verifies a document was truly removed from Firestore after a delete call.
 * Catches silent failures (rules, stale cache) so the UI never reports
 * success while the document still exists server-side.
 */
async function assertDeleted(collectionName: string, id: string): Promise<void> {
  const snap = await getDoc(doc(db, collectionName, id));
  if (snap.exists()) {
    throw new Error("تعذر الحذف من قاعدة البيانات، تحقق من الاتصال وصلاحيات الدخول ثم أعد المحاولة");
  }
}

// Seed default subjects if none exist (runs at most once per device)
const SEED_FLAG = "a-plus-seeded";

export async function seedSubjects() {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
    localStorage.setItem(SEED_FLAG, "1");
    const existing = await getSubjects();
    if (existing.length === 0) {
      const defaults = [
        { name: "الكيمياء العامة", description: "شرح شامل لمبادئ الكيمياء لطلاب السنة التحضيرية", color: "#00BCD4", icon: "FlaskConical", code: "chem101" },
        { name: "الفيزياء العامة", description: "أساسيات الفيزياء الميكانيكية والكهربائية", color: "#3F51B5", icon: "Atom", code: "phys101" },
        { name: "الكيمياء الحيوية", description: "دراسة العمليات الكيميائية داخل الكائنات الحية", color: "#E91E63", icon: "Dna", code: "biochem101" },
        { name: "التشريح", description: "دراسة بنية جسم الإنسان وأنظمته المختلفة", color: "#F44336", icon: "Heart", code: "anat101" },
      ];
      const col = collection(db, "subjects");
      for (const s of defaults) {
        try {
          await addDoc(col, { ...s, createdAt: serverTimestamp() });
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
}

// Subjects
export async function getSubjects(): Promise<Subject[]> {
  const snapshot = await getDocs(collection(db, "subjects"));
  return snapshot.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Subject;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Live subscription to the subjects collection. Delivers the current data
 * immediately on connect (much faster perceived first paint than a one-shot
 * getDocs) and keeps updating as documents change. Returns an unsubscribe.
 */
export function subscribeSubjects(
  onData: (items: Subject[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const unsub = onSnapshot(
    collection(db, "subjects"),
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as Subject;
      });
      onData(items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    },
    (err) => {
      onError?.(err);
    }
  );
  return unsub;
}

/**
 * Live subscription to a subject's videos. Delivers immediately on connect
 * (faster than a one-shot getDocs) and keeps updating as items change.
 */
export function subscribeVideosBySubject(
  subjectId: string,
  onData: (items: Video[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, "videos"), where("subjectId", "==", subjectId));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          } as Video;
        }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      );
    },
    (err) => onError?.(err)
  );
}

/**
 * Live subscription to a subject's files.
 */
export function subscribeFilesBySubject(
  subjectId: string,
  onData: (items: FileItem[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, "files"), where("subjectId", "==", subjectId));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          } as FileItem;
        }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      );
    },
    (err) => onError?.(err)
  );
}

/**
 * Live subscription to a subject's assessments/tests.
 */
export function subscribeAssessmentsBySubject(
  subjectId: string,
  onData: (items: Assessment[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, "assessments"), where("subjectId", "==", subjectId));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          } as Assessment;
        }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      );
    },
    (err) => onError?.(err)
  );
}

export async function getSubjectById(id: string): Promise<Subject | null> {
  const d = await getDoc(doc(db, "subjects", id));
  if (!d.exists()) return null;
  const data = d.data();
  const found = {
    id: d.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as Subject;
  return found;
}

export async function createSubject(data: Omit<Subject, "id" | "createdAt">): Promise<Subject> {
  if (!data.code) {
    data.code = generateId().slice(0, 6);
  }
  const ref = await addDoc(collection(db, "subjects"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: new Date().toISOString() };
}

export async function deleteSubject(id: string): Promise<void> {
  await deleteDoc(doc(db, "subjects", id));
}

export async function updateSubject(id: string, data: Partial<Omit<Subject, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "subjects", id), data);
}

// Videos

function clean<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === undefined) delete cleaned[key];
  }
  return cleaned as T;
}

/** Recursively removes `undefined` values from nested objects/arrays.
 *  Firestore rejects any field set to `undefined` (even nested), so quiz
 *  payloads that carry `image?: undefined` must be sanitized before writing. */
function deepClean<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value
      .filter((v) => v !== undefined)
      .map((v) => deepClean(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[key] = deepClean(v);
  }
  return out as T;
}

export async function createVideo(data: Omit<Video, "id" | "createdAt">): Promise<Video> {
  const cleaned = clean(data);
  const videosCol = collection(db, "videos");
  const ref = doc(videosCol);
  const counterRef = doc(db, "counters", `videos:${data.subjectId}`);
  const order = await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = (counter.data()?.value as number ?? 0) + 1;
    tx.set(counterRef, { value: next });
    tx.set(ref, { ...cleaned, order: next, isFree: data.isFree ?? true, createdAt: serverTimestamp() });
    return next;
  });
  return { id: ref.id, ...data, isFree: data.isFree ?? true, order, createdAt: new Date().toISOString() };
}

export async function updateVideo(id: string, data: Partial<Omit<Video, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "videos", id), clean(data as Record<string, unknown>));
}

/**
 * Persists a new display order for a list of video ids (index = order).
 * Uses a batch so the whole reorder is atomic.
 */
export async function reorderVideos(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "videos", id), { order: index });
  });
  await batch.commit();
}

export async function deleteVideo(id: string): Promise<void> {
  await deleteDoc(doc(db, "videos", id));
  await assertDeleted("videos", id);
}

export async function toggleVideoFreeStatus(id: string, isFree: boolean): Promise<void> {
  await updateDoc(doc(db, "videos", id), { isFree });
}

export async function toggleFileFreeStatus(id: string, isFree: boolean): Promise<void> {
  await updateDoc(doc(db, "files", id), { isFree });
}

export async function toggleFileDownloadStatus(id: string, canDownload: boolean): Promise<void> {
  await updateDoc(doc(db, "files", id), { canDownload });
}

export async function toggleFileViewStatus(id: string, canView: boolean): Promise<void> {
  await updateDoc(doc(db, "files", id), { canView });
}

export async function toggleAssessmentFreeStatus(id: string, isFree: boolean): Promise<void> {
  await updateDoc(doc(db, "assessments", id), { isFree });
}

export async function toggleVideoHidden(id: string, isHidden: boolean): Promise<void> {
  await updateDoc(doc(db, "videos", id), { isHidden });
}

export async function toggleFileHidden(id: string, isHidden: boolean): Promise<void> {
  await updateDoc(doc(db, "files", id), { isHidden });
}

export async function toggleAssessmentHidden(id: string, isHidden: boolean): Promise<void> {
  await updateDoc(doc(db, "assessments", id), { isHidden });
}

// Subject hiding: when hiding, push to the bottom (visible always on top).
export async function toggleSubjectHidden(id: string, isHidden: boolean): Promise<void> {
  const subjects = await getSubjects();
  const maxOrder = subjects.reduce((m, s) => Math.max(m, s.order ?? 0), -1);
  const order = isHidden ? maxOrder + 1 : 0;
  await updateDoc(doc(db, "subjects", id), { isHidden, order });
}

// For admin view: hidden subjects pushed to the bottom, visible on top (by order).
export function sortSubjectsForView(subjects: Subject[]): Subject[] {
  return [...subjects].sort((a, b) => {
    const ah = a.isHidden ? 1 : 0;
    const bh = b.isHidden ? 1 : 0;
    if (ah !== bh) return ah - bh;
    return (a.order ?? 0) - (b.order ?? 0);
  });
}

// For student-facing view: only visible subjects, ordered.
export function getVisibleSubjects(subjects: Subject[]): Subject[] {
  return subjects
    .filter((s) => !s.isHidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Persists a new display order for a list of subject ids (index = order).
export async function reorderSubjects(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "subjects", id), { order: index });
  });
  await batch.commit();
}

// Files
export async function reorderFiles(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "files", id), { order: index });
  });
  await batch.commit();
}

export async function reorderAssessments(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "assessments", id), { order: index });
  });
  await batch.commit();
}

export async function createFile(data: Omit<FileItem, "id" | "createdAt" | "downloads">): Promise<FileItem> {
  const filesCol = collection(db, "files");
  const ref = doc(filesCol);
  const counterRef = doc(db, "counters", `files:${data.subjectId}`);
  const order = await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = (counter.data()?.value as number ?? 0) + 1;
    tx.set(counterRef, { value: next });
    tx.set(ref, {
      ...clean(data),
      order: next,
      isFree: data.isFree ?? true,
      canDownload: data.canDownload ?? true,
      canView: data.canView ?? true,
      downloads: 0,
      createdAt: serverTimestamp(),
    });
    return next;
  });
  return {
    id: ref.id,
    ...data,
    order,
    isFree: data.isFree ?? true,
    canDownload: data.canDownload ?? true,
    canView: data.canView ?? true,
    downloads: 0,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteFile(id: string): Promise<void> {
  await deleteDoc(doc(db, "files", id));
  await assertDeleted("files", id);
}

// Assessments (Practice Tests)
export async function createAssessment(data: Omit<Assessment, "id" | "createdAt">): Promise<Assessment> {
  const assessmentsCol = collection(db, "assessments");
  const ref = doc(assessmentsCol);
  const counterRef = doc(db, "counters", `assessments:${data.subjectId}`);
  const order = await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = (counter.data()?.value as number ?? 0) + 1;
    tx.set(counterRef, { value: next });
    tx.set(ref, {
      ...data,
      isFree: data.isFree ?? true,
      order: next,
      createdAt: serverTimestamp(),
    });
    return next;
  });
  return { id: ref.id, ...data, isFree: data.isFree ?? true, order, createdAt: new Date().toISOString() };
}

export async function deleteAssessment(id: string): Promise<void> {
  await deleteDoc(doc(db, "assessments", id));
  await assertDeleted("assessments", id);
}

// Progress Tracking
export function getLocalProgress(userId: string): string[] {
  const data = localStorage.getItem(`a-plus-progress-${userId}`);
  return data ? JSON.parse(data) : [];
}

export function toggleLocalProgress(userId: string, itemId: string): string[] {
  const current = getLocalProgress(userId);
  const updated = current.includes(itemId)
    ? current.filter((id) => id !== itemId)
    : [...current, itemId];
  localStorage.setItem(`a-plus-progress-${userId}`, JSON.stringify(updated));
  return updated;
}

// ─── Admin Management ───────────────────────────────────────────

export async function getAdmins(): Promise<Admin[]> {
  const snapshot = await getDocs(collection(db, "admins"));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data } as Admin;
  });
}

// ─── Student Management ─────────────────────────────────────────

export async function createStudent(data: {
  username: string;
  password: string;
  displayName: string;
  enrolledSubjects: string[];
}): Promise<Student> {
  // Normalise the same way normalizeSecretCode already normalised the password:
  // the exact-match login lookup can only ever find what was stored cleanly.
  const payload = {
    ...data,
    username: normalizeUsername(data.username),
    password: normalizeSecretCode(data.password),
    isActive: true,
    devices: [],
  };
  const ref = await addDoc(collection(db, "students"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return {
    ...payload,
    id: ref.id,
    createdAt: new Date().toISOString(),
  } as Student;
}

export async function updateStudent(
  id: string,
  data: {
    username?: string;
    displayName?: string;
    password?: string;
    enrolledSubjects?: string[];
    isActive?: boolean;
  }
): Promise<void> {
  await updateDoc(doc(db, "students", id), {
    ...data,
    ...(data.username !== undefined ? { username: normalizeUsername(data.username) } : {}),
    ...(data.password !== undefined ? { password: normalizeSecretCode(data.password) } : {}),
  });
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, "students", id));
  await assertDeleted("students", id);
}

function mapStudentDoc(d: DocumentSnapshot): Student {
  const data = d.data() ?? {};
  return {
    id: d.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as Student;
}

/**
 * Fast path is the exact match, which is every account written after the
 * username was normalised on the way in.
 *
 * The fallback exists for accounts that were not: they hold a stray space or a
 * capital letter and an exact query can never reach them. Rather than migrating
 * production data, compare the way findDuplicateUsername compares and let them
 * sign in as they always meant to. This only runs after the fast path misses, so
 * it costs a collection read for a student who is already locked out, and
 * nothing at all for everyone else.
 */
async function getStudentByUsername(username: string): Promise<Student | null> {
  const wanted = usernameKey(username);
  if (!wanted) return null;

  const exact = await getDocs(
    query(collection(db, "students"), where("username", "==", normalizeUsername(username)))
  );
  if (!exact.empty) return mapStudentDoc(exact.docs[0]);

  const all = await getDocs(collection(db, "students"));
  const hit = all.docs.find((d) => usernameKey(d.data().username) === wanted);
  return hit ? mapStudentDoc(hit) : null;
}

export async function verifyStudentCredentials(
  username: string,
  password: string,
  subjectId: string
): Promise<{ valid: boolean; student: Student | null; error?: string }> {
  const student = await getStudentByUsername(username);
  if (!student) {
    return { valid: false, student: null, error: "اسم المستخدم غير صحيح" };
  }
  if (!student.isActive) {
    return { valid: false, student: null, error: "هذا الحساب غير نشط، يرجى التواصل مع الأدمن" };
  }
  if (student.password !== password.replace(/\s+/g, "")) {
    return { valid: false, student: null, error: "كلمة السر غير صحيحة" };
  }
  if (!student.enrolledSubjects.includes(subjectId)) {
    return { valid: false, student: null, error: "أنت غير مشترك في هذه المادة" };
  }
  return { valid: true, student };
}

export async function registerDevice(
  studentId: string,
  deviceInfo: DeviceInfo
): Promise<{ success: boolean; error?: string }> {
  // Firestore — atomic read+check+write so two simultaneous registrations
  // can never push a student's device count past the limit.
  const studentRef = doc(db, "students", studentId);
  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(studentRef);
      if (!snap.exists()) {
        throw new Error("NOT_FOUND");
      }
      const studentData = snap.data() as Student;
      const devices = studentData.devices || [];

      const existingIdx = devices.findIndex((d: DeviceInfo) => d.deviceId === deviceInfo.deviceId);
      if (existingIdx !== -1) {
        devices[existingIdx] = { ...devices[existingIdx], lastAccess: deviceInfo.lastAccess };
        tx.update(studentRef, { devices });
        return { success: true as boolean };
      }

      if (devices.length >= 2) {
        throw new Error("LIMIT");
      }

      devices.push(deviceInfo);
      tx.update(studentRef, { devices });
      return { success: true as boolean };
    });
    return result;
  } catch (e) {
    if (e instanceof Error && e.message === "LIMIT") {
      return {
        success: false,
        error: "لقد وصلت للحد الأقصى من الأجهزة المسموح بها (2). يرجى التواصل مع الأدمن لإزالة أحد أجهزتك",
      };
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return { success: false, error: "الطالب غير موجود" };
    }
    // Concurrency conflict — retryable in practice; surface a clear error.
    return {
      success: false,
      error: "تعذر تسجيل الجهاز الآن، أعد المحاولة",
    };
  }
}

export async function removeDevice(studentId: string, deviceId: string): Promise<void> {
  const studentRef = doc(db, "students", studentId);
  const studentSnap = await getDoc(studentRef);
  if (!studentSnap.exists()) return;
  const studentData = studentSnap.data() as Student;
  const devices = (studentData.devices || []).filter((d: DeviceInfo) => d.deviceId !== deviceId);
  await updateDoc(studentRef, { devices });
}

export function getDeviceId(): string {
  // Store the id in two independent locations (localStorage + sessionStorage)
  // so clearing one alone doesn't silently mint a brand-new device slot.
  // This raises the practical cost of bypassing the 2-device limit without
  // requiring server-side enforcement.
  const KEYS = ["a-plus-device-id", "a-plus-dev-id"];
  const read = (): string => {
    for (const k of KEYS) {
      try {
        const v = localStorage.getItem(k) || sessionStorage.getItem(k);
        if (v) return v;
      } catch {
        // storage may be blocked — continue
      }
    }
    return "";
  };

  const existing = read();
  if (existing) {
    // Re-persist to both spots so a partial clear self-heals next load.
    for (const k of KEYS) {
      try { localStorage.setItem(k, existing); } catch { /* ignore */ }
      try { sessionStorage.setItem(k, existing); } catch { /* ignore */ }
    }
    return existing;
  }

  let deviceId = "";
  try {
    deviceId = crypto.randomUUID();
  } catch {
    deviceId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
  for (const k of KEYS) {
    try { localStorage.setItem(k, deviceId); } catch { /* ignore */ }
    try { sessionStorage.setItem(k, deviceId); } catch { /* ignore */ }
  }
  return deviceId;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  let browser = "متصفح غير معروف";
  if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Edge")) browser = "Edge";
  let os = "نظام غير معروف";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "Mac";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  return `${browser} - ${os}`;
}

// ─── Ticker ──────────────────────────────────────────

export async function getTicker(): Promise<Ticker> {
  const snap = await getDoc(doc(db, "settings", "ticker"));
  if (!snap.exists()) return { text: "", color: "#FFD700", active: false };
  return snap.data() as Ticker;
}

export async function updateTicker(data: Ticker): Promise<void> {
  await setDoc(doc(db, "settings", "ticker"), data, { merge: true });
}

// ─── Statistics ────────────────────────────────────────────────

/** Local YYYY-MM-DD so "visitors today" aligns with the admins' local day. */
function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

let lastVisitBeat = 0;

/**
 * Registers a visit when a page opens. Keeps a single-document-per-day counter
 * with a unique device set so refreshes don't inflate "visitors" but total
 * pageviews still add up. Throttled so a single page load counts once.
 */
export async function trackVisit(deviceId: string): Promise<void> {
  try {
    const now = Date.now();
    if (now - lastVisitBeat < 30_000) return;
    lastVisitBeat = now;

    const key = todayKey();
    const ref = doc(db, "stats", `visit_${key}`);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data() as DailyVisit) : null;

    const deviceIds = existing?.deviceIds?.includes(deviceId)
      ? existing.deviceIds
      : [...(existing?.deviceIds || []), deviceId];

    await setDoc(
      ref,
      { date: key, deviceIds, pageviews: (existing?.pageviews || 0) + 1 },
      { merge: true }
    );
  } catch (e) {
    console.error("trackVisit error:", e);
  }
}

/**
 * Increments a video's play counter (deduped per video per session) and records
 * a dated play for the trend view.
 */
export async function trackVideoPlay(video: Video): Promise<void> {
  try {
    const key = video.id;
    const statKey = todayKey();

    const events = localStorage.getItem(`a-plus-played-${key}`);
    if (events) {
      const map = JSON.parse(events) as Record<string, boolean>;
      if (map[statKey]) return; // already counted this video today
      map[statKey] = true;
      localStorage.setItem(`a-plus-played-${key}`, JSON.stringify(map));
    } else {
      localStorage.setItem(`a-plus-played-${key}`, JSON.stringify({ [statKey]: true }));
    }

    const ref = doc(db, "stats", `video_${key}`);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data() as VideoStats) : null;

    await setDoc(
      ref,
      {
        videoId: video.id,
        subjectId: video.subjectId,
        title: video.title,
        views: (existing?.views || 0) + 1,
        watchSeconds: existing?.watchSeconds || 0,
        lastViewedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // dated play for "views per day"
    await setDoc(doc(db, "stats", `play_${key}_${statKey}`), {
      videoId: video.id,
      date: statKey,
      count: 1,
    }, { merge: true });
  } catch (e) {
    console.error("trackVideoPlay error:", e);
  }
}

/**
 * Adds elapsed watch time to a video (called periodically while playing).
 * Throttled server-side-ish via increments to stay cheap.
 */
export async function trackVideoWatchTime(videoId: string, seconds: number): Promise<void> {
  if (!videoId || seconds <= 0) return;
  try {
    const ref = doc(db, "stats", `video_${videoId}`);
    await setDoc(ref, { watchSeconds: increment(seconds) }, { merge: true });
  } catch (e) {
    console.error("trackVideoWatchTime error:", e);
  }
}

export interface StatsData {
  visitorsToday: number;
  totalVisitors: number;
  totalPageviews: number;
  topVideos: VideoStats[];
  totalVideos: number;
  totalWatchHours: number;
}

/**
 * Aggregates all analytics for the admin dashboard.
 */
export async function getStats(): Promise<StatsData> {
  const visitsSnap = await getDocs(collection(db, "stats"));
  const visitDocs: DailyVisit[] = [];
  const videoMap = new Map<string, VideoStats>();
  let totalWatchSeconds = 0;

  for (const d of visitsSnap.docs) {
    const data = d.data();
    if (d.id.startsWith("visit_")) {
      visitDocs.push(data as DailyVisit);
    } else if (d.id.startsWith("video_")) {
      const vs = data as VideoStats;
      videoMap.set(vs.videoId, vs);
      totalWatchSeconds += vs.watchSeconds || 0;
    }
  }

  const todayV = todayKey();
  const visitorsToday = visitDocs
    .filter((v) => v.date === todayV)
    .reduce((sum, v) => sum + v.deviceIds.length, 0);
  const uniqueAll = new Set<string>();
  visitDocs.forEach((v) => v.deviceIds.forEach((id) => uniqueAll.add(id)));
  const totalPageviews = visitDocs.reduce((sum, v) => sum + (v.pageviews || 0), 0);

  const topVideos = Array.from(videoMap.values())
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  return {
    visitorsToday,
    totalVisitors: uniqueAll.size,
    totalPageviews,
    topVideos,
    totalVideos: videoMap.size,
    totalWatchHours: Math.round((totalWatchSeconds / 3600) * 10) / 10,
  };
}

/**
 * Deletes every document in the stats collection so analytics start from zero.
 * Deletes in Firestore-managed batches of 500 to stay within write limits.
 * Also clears the per-device "already counted today" flags so a new term/year
 * starts counting afresh.
 */
export async function resetStats(): Promise<void> {
  // Clear local dedup flags for plays/visits so users aren't blocked from
  // re-counting in the new period
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("a-plus-played-")) {
      localStorage.removeItem(key);
    }
  }

  // Paginate the read by document ID so we never pull the whole collection
  // into memory at once (safe even for very large stats collections).
  const pageSize = 500;
  const statsCol = collection(db, "stats");
  let lastDoc: DocumentSnapshot | null = null;
  let remaining = true;

  while (remaining) {
    let q = query(statsCol, orderBy("__name__"), limit(pageSize));
    if (lastDoc) {
      q = query(statsCol, orderBy("__name__"), startAfter(lastDoc), limit(pageSize));
    }
    const snap = await getDocs(q);
    if (snap.empty) break;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < pageSize) remaining = false;
  }
}

// ─── Challenge (منصة التحدي) ──────────────────────────────────

export const MAX_QUIZ_ATTEMPTS = 2;

/**
 * Upgrades any stored quiz doc into the current question shape.
 * Legacy docs stored options as plain strings with a text-matched
 * `correctText`; the new shape uses stable per-option ids and optional
 * question/option images. Reading-side migration keeps old quizzes working.
 */
function normalizeQuiz(quiz: Quiz): Quiz {
  const questions = (Array.isArray(quiz.questions) ? quiz.questions : []).map((raw) => {
    const legacy = raw as unknown as {
      text?: string;
      image?: string;
      options: unknown[];
      correctText?: string;
      correctId?: string;
      optionsImages?: (string | undefined)[];
    };
    const optionsArr = Array.isArray(legacy.options) ? legacy.options : [];
    const isLegacy = optionsArr.length === 0 || typeof optionsArr[0] === "string";

    let options: QuizOption[];
    let correctId: string;

    if (isLegacy) {
      const texts = optionsArr as string[];
      const imgs = Array.isArray(legacy.optionsImages) ? legacy.optionsImages : [];
      options = texts.map((t, i) => ({ id: `opt_${i}`, text: t || "", image: imgs[i] }));
      correctId = legacy.correctId ?? "";
      if (!correctId && legacy.correctText) {
        const idx = texts.indexOf(legacy.correctText);
        if (idx >= 0) correctId = `opt_${idx}`;
      }
    } else {
      options = (optionsArr as QuizOption[]).map((opt, i) => ({
        id: opt && opt.id && opt.id.trim() ? opt.id : `opt_${i}`,
        text: opt ? opt.text ?? "" : "",
        image: opt ? opt.image ?? undefined : undefined,
      }));
      correctId = legacy.correctId ?? "";
    }

    return {
      text: legacy.text ?? "",
      image: legacy.image ?? undefined,
      options,
      correctId,
    };
  });
  return { ...quiz, questions };
}

function quizResultFromDoc(d: DocumentSnapshot): QuizResult {
  const data = d.data()!;
  return {
    id: d.id,
    ...data,
    score: Number(data.score) || 0,
    correctCount: Number(data.correctCount) || 0,
    totalQuestions: Number(data.totalQuestions) || 0,
    attempts: Number(data.attempts) || 0,
    bestAttempt: Number(data.bestAttempt) || 0,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as QuizResult;
}

export function subscribeQuizzesBySubject(
  subjectId: string,
  onData: (items: Quiz[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, "quizzes"), where("subjectId", "==", subjectId));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs
          .map((d) => {
            const data = d.data();
            return normalizeQuiz({
              id: d.id,
              ...data,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            } as Quiz);
          })
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      );
    },
    (err) => onError?.(err)
  );
}

export function subscribeQuizResults(
  subjectId: string,
  onData: (items: QuizResult[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, "quizResults"), where("subjectId", "==", subjectId));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(quizResultFromDoc)),
    (err) => onError?.(err)
  );
}

export function subscribeStudentMedals(
  onData: (items: StudentMedals[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, "studentMedals"),
    (snapshot) => onData(
      snapshot.docs.map((d) => {
        const data = d.data();
        return {
          username: d.id,
          ...data,
          gold: Number(data.gold) || 0,
          silver: Number(data.silver) || 0,
          bronze: Number(data.bronze) || 0,
          totalMedals: Number(data.totalMedals) || 0,
          lastScore: Number(data.lastScore) || 0,
          lastUpdatedAt: data.lastUpdatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as StudentMedals;
      })
    ),
    (err) => onError?.(err)
  );
}

/**
 * Sort rule for leaderboards:
 *  1) highest best-score,
 *  2) fewer attempts to reach it (first-attempt wins ties),
 *  3) earliest achieved.
 */
export function compareQuizResults(a: QuizResult, b: QuizResult): number {
  if (b.score !== a.score) return b.score - a.score;
  if ((a.bestAttempt || 1) !== (b.bestAttempt || 1)) return (a.bestAttempt || 1) - (b.bestAttempt || 1);
  return (a.updatedAt || "").localeCompare(b.updatedAt || "");
}

/**
 * Rank the given subject results and write their medal fields back.
 * Returns the updated results (with medals) — also updates studentMedals counters.
 */
async function recomputeMedals(_subjectId: string, results: QuizResult[]): Promise<QuizResult[]> {
  const sorted = [...results].sort(compareQuizResults);
  const newMedals = new Map<string, Medal | undefined>();
  const medalOf = (index: number): Medal | undefined =>
    index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "bronze" : undefined;

  sorted.forEach((r, i) => newMedals.set(r.username, medalOf(i)));

  const batch = writeBatch(db);
  for (const r of results) {
    const next = newMedals.get(r.username);
    if (r.medal !== next) {
      batch.update(doc(db, "quizResults", r.id), { medal: next ?? null });
    }
  }

  // Rebuild the affected students' medal counters (simple & consistent).
  const affected = new Set(results.map((r) => r.username));
  const counterSnaps = await Promise.all(
    [...affected].map((u) => getDoc(doc(db, "studentMedals", u)))
  );
  const counterData = new Map<string, { gold: number; silver: number; bronze: number }>();
  counterSnaps.forEach((snap, i) => {
    const username = [...affected][i];
    const data = snap.data();
    counterData.set(username, {
      gold: Number(data?.gold) || 0,
      silver: Number(data?.silver) || 0,
      bronze: Number(data?.bronze) || 0,
    });
  });
  for (const r of results) {
    const medal = newMedals.get(r.username);
    const counts = { ...counterData.get(r.username)! };
    if (medal !== r.medal) {
      if (r.medal) counts[r.medal] = Math.max(0, counts[r.medal] - 1);
      if (medal) counts[medal] = counts[medal] + 1;
    }
    counterData.set(r.username, counts);
  }
  for (const [username, counts] of counterData) {
    batch.set(
      doc(db, "studentMedals", username),
      { ...counts, totalMedals: counts.gold + counts.silver + counts.bronze },
      { merge: true }
    );
  }

  await batch.commit();
  return sorted.map((r) => ({ ...r, medal: newMedals.get(r.username) }));
}

export async function submitQuizResult(input: {
  subjectId: string;
  username: string;
  studentName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
}): Promise<{ result: QuizResult; attempt: number; saved: boolean }> {
  const resultId = `${input.subjectId}_${input.username}`;
  const ref = doc(db, "quizResults", resultId);
  const existingSnap = await getDoc(ref);
  const existing = existingSnap.exists() ? quizResultFromDoc(existingSnap) : null;

  if (existing && existing.attempts >= MAX_QUIZ_ATTEMPTS) {
    return { result: existing, attempt: existing.attempts, saved: false };
  }

  const attempt = (existing?.attempts || 0) + 1;
  const improved = !existing || input.score > existing.score;
  const bestScore = improved ? input.score : existing!.score;
  const bestAttempt = improved ? attempt : existing!.bestAttempt;

  await setDoc(
    ref,
    {
      subjectId: input.subjectId,
      username: input.username,
      studentName: input.studentName,
      score: bestScore,
      correctCount: improved ? input.correctCount : existing!.correctCount,
      totalQuestions: input.totalQuestions,
      attempts: attempt,
      bestAttempt,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Keep the "آخر اختبار" score for the global leaderboard.
  await setDoc(
    doc(db, "studentMedals", input.username),
    {
      username: input.username,
      studentName: input.studentName,
      lastScore: input.score,
      lastUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Recompute the subject podium + medal counters.
  const subjectSnap = await getDocs(
    query(collection(db, "quizResults"), where("subjectId", "==", input.subjectId))
  );
  const subjectResults = subjectSnap.docs.map(quizResultFromDoc);
  await recomputeMedals(input.subjectId, subjectResults);

  const fresh = await getDoc(ref);
  const finalResult = fresh.exists() ? quizResultFromDoc(fresh) : {
    id: resultId,
    subjectId: input.subjectId,
    username: input.username,
    studentName: input.studentName,
    score: bestScore,
    correctCount: improved ? input.correctCount : existing!.correctCount,
    totalQuestions: input.totalQuestions,
    attempts: attempt,
    bestAttempt,
    updatedAt: new Date().toISOString(),
  } as QuizResult;

  return { result: finalResult, attempt, saved: true };
}

export async function createQuiz(data: Omit<Quiz, "id" | "createdAt">): Promise<Quiz> {
  const cleaned = deepClean({ ...data });
  const quizzesCol = collection(db, "quizzes");
  const ref = doc(quizzesCol);
  const counterRef = doc(db, "counters", `quizzes:${data.subjectId}`);
  const order = await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = (counter.data()?.value as number ?? 0) + 1;
    tx.set(counterRef, { value: next });
    tx.set(ref, {
      ...cleaned,
      isFree: cleaned.isFree ?? true,
      order: next,
      createdAt: serverTimestamp(),
    });
    return next;
  });
  return { id: ref.id, ...cleaned, isFree: cleaned.isFree ?? true, order, createdAt: new Date().toISOString() };
}

export async function updateQuiz(id: string, data: Partial<Omit<Quiz, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "quizzes", id), deepClean({ ...data }));
}

export async function deleteQuiz(id: string): Promise<void> {
  await deleteDoc(doc(db, "quizzes", id));
  await assertDeleted("quizzes", id);
}

export async function toggleQuizFree(id: string, isFree: boolean): Promise<void> {
  await updateDoc(doc(db, "quizzes", id), { isFree });
}

export async function toggleQuizHidden(id: string, isHidden: boolean): Promise<void> {
  await updateDoc(doc(db, "quizzes", id), { isHidden });
}

// ─── Material quizzes (اختبارات تفاعلية من المنصة) ─────────────

function materialQuizFromDoc(d: DocumentSnapshot): Quiz {
  const data = d.data()!;
  return normalizeQuiz({
    id: d.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as Quiz);
}

export function subscribeMaterialQuizzesBySubject(
  subjectId: string,
  onData: (items: Quiz[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, "materialQuizzes"), where("subjectId", "==", subjectId));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs
          .map(materialQuizFromDoc)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      );
    },
    (err) => onError?.(err)
  );
}

export function subscribeAllMaterialQuizzes(
  onData: (items: Quiz[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, "materialQuizzes"),
    (snapshot) =>
      onData(
        snapshot.docs.map(materialQuizFromDoc).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      ),
    (err) => onError?.(err)
  );
}

export function subscribeAllMaterialQuizResults(
  onData: (items: QuizResult[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, "materialQuizResults"),
    (snapshot) => onData(snapshot.docs.map(quizResultFromDoc)),
    (err) => onError?.(err)
  );
}

/** Unlimited attempts: keep best score, always records the newest attempt. */
export async function submitMaterialQuizResult(input: {
  subjectId: string;
  quizId: string;
  quizTitle: string;
  username: string;
  studentName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
}): Promise<{ result: QuizResult; attempt: number; saved: boolean }> {
  // One best-score document per student per QUIZ (not per subject), so the
  // statistics can report how many students took each specific interactive quiz.
  const resultId = `${input.quizId}_${input.username}`;
  const ref = doc(db, "materialQuizResults", resultId);
  const existingSnap = await getDoc(ref);
  const existing = existingSnap.exists() ? quizResultFromDoc(existingSnap) : null;

  const attempt = (existing?.attempts || 0) + 1;
  const improved = !existing || input.score > existing.score;
  const bestScore = improved ? input.score : existing!.score;
  const bestAttempt = improved ? attempt : existing!.bestAttempt;

  await setDoc(
    ref,
    {
      subjectId: input.subjectId,
      quizId: input.quizId,
      quizTitle: input.quizTitle,
      username: input.username,
      studentName: input.studentName,
      score: bestScore,
      correctCount: improved ? input.correctCount : existing!.correctCount,
      totalQuestions: input.totalQuestions,
      attempts: attempt,
      bestAttempt,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  const fresh = await getDoc(ref);
  const finalResult = fresh.exists()
    ? quizResultFromDoc(fresh)
    : {
        id: resultId,
        subjectId: input.subjectId,
        quizId: input.quizId,
        quizTitle: input.quizTitle,
        username: input.username,
        studentName: input.studentName,
        score: bestScore,
        correctCount: improved ? input.correctCount : existing!.correctCount,
        totalQuestions: input.totalQuestions,
        attempts: attempt,
        bestAttempt,
        updatedAt: new Date().toISOString(),
      } as QuizResult;

  return { result: finalResult, attempt, saved: true };
}

export async function createMaterialQuiz(data: Omit<Quiz, "id" | "createdAt">): Promise<Quiz> {
  const cleaned = deepClean({ ...data });
  const col = collection(db, "materialQuizzes");
  const ref = doc(col);
  const counterRef = doc(db, "counters", `materialQuizzes:${data.subjectId}`);
  const order = await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = (counter.data()?.value as number ?? 0) + 1;
    tx.set(counterRef, { value: next });
    tx.set(ref, {
      ...cleaned,
      isFree: cleaned.isFree ?? true,
      order: next,
      createdAt: serverTimestamp(),
    });
    return next;
  });
  return { id: ref.id, ...cleaned, isFree: cleaned.isFree ?? true, order, createdAt: new Date().toISOString() };
}

export async function updateMaterialQuiz(id: string, data: Partial<Omit<Quiz, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "materialQuizzes", id), deepClean({ ...data }));
}

export async function deleteMaterialQuiz(id: string): Promise<void> {
  await deleteDoc(doc(db, "materialQuizzes", id));
  await assertDeleted("materialQuizzes", id);
}

export async function toggleMaterialQuizFree(id: string, isFree: boolean): Promise<void> {
  await updateDoc(doc(db, "materialQuizzes", id), { isFree });
}

export async function toggleMaterialQuizHidden(id: string, isHidden: boolean): Promise<void> {
  await updateDoc(doc(db, "materialQuizzes", id), { isHidden });
}

export async function deleteMaterialQuizResult(resultId: string): Promise<void> {
  await deleteDoc(doc(db, "materialQuizResults", resultId));
}

// ─── Student "done" marks for material quizzes (علامة إنجاز الطالب) ────
// One doc per student + quiz (id `${quizId}_${username}`) so the mark follows
// the account across devices and is visible to the teacher in the admin panel.

function materialQuizDoneFromDoc(d: DocumentSnapshot): MaterialQuizDone {
  const data = d.data()!;
  return {
    id: d.id,
    subjectId: String(data.subjectId || ""),
    quizId: String(data.quizId || ""),
    username: String(data.username || ""),
    done: data.done !== false,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  };
}

export async function setMaterialQuizDone(input: {
  subjectId: string;
  quizId: string;
  username: string;
  done: boolean;
}): Promise<void> {
  const ref = doc(db, "materialQuizDone", `${input.quizId}_${input.username}`);
  await setDoc(
    ref,
    {
      subjectId: input.subjectId,
      quizId: input.quizId,
      username: input.username,
      done: input.done,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function subscribeMaterialQuizDone(
  subjectId: string,
  username: string,
  onData: (quizIds: string[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(
    collection(db, "materialQuizDone"),
    where("subjectId", "==", subjectId),
    where("username", "==", username)
  );
  return onSnapshot(
    q,
    (snapshot) =>
      onData(snapshot.docs.map(materialQuizDoneFromDoc).filter((m) => m.done).map((m) => m.quizId)),
    (err) => onError?.(err)
  );
}

export function subscribeAllMaterialQuizDone(
  onData: (items: MaterialQuizDone[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, "materialQuizDone"),
    (snapshot) => onData(snapshot.docs.map(materialQuizDoneFromDoc)),
    (err) => onError?.(err)
  );
}
