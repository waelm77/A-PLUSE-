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
import type { Subject, Video, FileItem, Assessment, Student, DeviceInfo, Ticker, Admin, DailyVisit, VideoStats, Quiz, QuizOption, QuizResult, StudentMedals, Medal } from "../types";

const useLocalStorage = false;

// LocalStorage helpers
function getLocalItems<T>(key: string): T[] {
  const data = localStorage.getItem(`a-plus-${key}`);
  return data ? JSON.parse(data) : [];
}

function setLocalItems<T>(key: string, items: T[]) {
  localStorage.setItem(`a-plus-${key}`, JSON.stringify(items));
}

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
    if (useLocalStorage) {
      const existing = getLocalItems<Subject>("subjects");
      if (existing.length > 0) return;
      const defaults: Subject[] = [
        { id: generateId(), name: "الكيمياء العامة", description: "شرح شامل لمبادئ الكيمياء لطلاب السنة التحضيرية", color: "#00BCD4", icon: "FlaskConical", code: "chem101", createdAt: new Date().toISOString() },
        { id: generateId(), name: "الفيزياء العامة", description: "أساسيات الفيزياء الميكانيكية والكهربائية", color: "#3F51B5", icon: "Atom", code: "phys101", createdAt: new Date().toISOString() },
        { id: generateId(), name: "الكيمياء الحيوية", description: "دراسة العمليات الكيميائية داخل الكائنات الحية", color: "#E91E63", icon: "Dna", code: "biochem101", createdAt: new Date().toISOString() },
        { id: generateId(), name: "التشريح", description: "دراسة بنية جسم الإنسان وأنظمته المختلفة", color: "#F44336", icon: "Heart", code: "anat101", createdAt: new Date().toISOString() },
      ];
      setLocalItems("subjects", defaults);
      seedContent(defaults[0].id);
      return;
    }
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

async function seedContent(subjectId: string) {
  if (!useLocalStorage) return;

  const existingVideos = getLocalItems<Video>("videos");
  if (existingVideos.length === 0) {
    const videos: Video[] = [
      {
        id: generateId(),
        subjectId,
        title: "مقدمة في الكيمياء العامة",
        type: "theory",
        sourceType: "youtube",
        url: "https://www.youtube.com/watch?v=k3rRrl9J2F4",
        thumbnail: "https://img.youtube.com/vi/k3rRrl9J2F4/mqdefault.jpg",
        duration: "10:15",
        isFree: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        subjectId,
        title: "مراجعة الفصل الأول",
        type: "review",
        sourceType: "youtube",
        url: "https://www.youtube.com/watch?v=k3rRrl9J2F4",
        thumbnail: "https://img.youtube.com/vi/k3rRrl9J2F4/mqdefault.jpg",
        duration: "05:30",
        isFree: false,
        createdAt: new Date().toISOString(),
      },
    ];
    setLocalItems("videos", videos);
  }

  const existingFiles = getLocalItems<FileItem>("files");
  if (existingFiles.length === 0) {
    const files: FileItem[] = [
      {
        id: generateId(),
        subjectId,
        title: "ملخص قوانين الكيمياء",
        fileType: "pdf",
        size: "1.2 MB",
        downloadUrl: "https://www.orimi.com/pdf-test.pdf",
        downloads: 12,
        isFree: true,
        canDownload: true,
        canView: true,
        createdAt: new Date().toISOString(),
      },
    ];
    setLocalItems("files", files);
  }

  const existingAssessments = getLocalItems<Assessment>("assessments");
  if (existingAssessments.length === 0) {
    const assessments: Assessment[] = [
      {
        id: generateId(),
        subjectId,
        title: "اختبار تجريبي - الوحدة الأولى",
        url: "https://docs.google.com/forms/d/e/1FAIpQLSfD7P-S2qZ0E-yX-T8X0-W-Y-M-R-X-E/viewform",
        isFree: true,
        order: 0,
        createdAt: new Date().toISOString(),
      },
    ];
    setLocalItems("assessments", assessments);
  }
}

// Subjects
export async function getSubjects(): Promise<Subject[]> {
  if (useLocalStorage) {
    return getLocalItems<Subject>("subjects");
  }
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
  const isLocal = useLocalStorage;
  if (isLocal) {
    onData(getLocalItems<Subject>("subjects"));
    return () => {};
  }
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
  if (useLocalStorage) {
    onData(getLocalItems<Video>("videos").filter((v) => v.subjectId === subjectId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return () => {};
  }
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
  if (useLocalStorage) {
    onData(getLocalItems<FileItem>("files").filter((f) => f.subjectId === subjectId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return () => {};
  }
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
  if (useLocalStorage) {
    onData(getLocalItems<Assessment>("assessments").filter((a) => a.subjectId === subjectId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    return () => {};
  }
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
  if (useLocalStorage) {
    const items = getLocalItems<Subject>("subjects");
    const found = items.find((i) => i.id === id) || null;
    console.log("getSubjectById (local):", id, "found:", found);
    return found;
  }
  const d = await getDoc(doc(db, "subjects", id));
  if (!d.exists()) return null;
  const data = d.data();
  const found = {
    id: d.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as Subject;
  console.log("getSubjectById (firebase):", id, "found:", found);
  return found;
}

export async function createSubject(data: Omit<Subject, "id" | "createdAt">): Promise<Subject> {
  if (!data.code) {
    data.code = generateId().slice(0, 6);
  }
  if (useLocalStorage) {
    const items = getLocalItems<Subject>("subjects");
    const newItem: Subject = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    setLocalItems("subjects", items);
    return newItem;
  }
  const ref = await addDoc(collection(db, "subjects"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, createdAt: new Date().toISOString() };
}

export async function deleteSubject(id: string): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Subject>("subjects").filter((i) => i.id !== id);
    setLocalItems("subjects", items);
    return;
  }
  await deleteDoc(doc(db, "subjects", id));
}

export async function updateSubject(id: string, data: Partial<Omit<Subject, "id" | "createdAt">>): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Subject>("subjects").map((s) =>
      s.id === id ? { ...s, ...data } : s
    );
    setLocalItems("subjects", items);
    return;
  }
  await updateDoc(doc(db, "subjects", id), data);
}

// Videos

export async function getVideosBySubject(subjectId: string): Promise<Video[]> {
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos").filter((v) => v.subjectId === subjectId);
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  const q = query(
    collection(db, "videos"),
    where("subjectId", "==", subjectId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Video;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function clean<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === undefined) delete cleaned[key];
  }
  return cleaned as T;
}

export async function createVideo(data: Omit<Video, "id" | "createdAt">): Promise<Video> {
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos");
    const maxOrder = items.reduce((m, v) => Math.max(m, v.order ?? 0), -1);
    const newItem: Video = { id: generateId(), isFree: data.isFree ?? true, order: maxOrder + 1, ...data, createdAt: new Date().toISOString() };
    items.push(newItem);
    setLocalItems("videos", items);
    return newItem;
  }
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
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos").map((v) =>
      v.id === id ? { ...v, ...data } : v
    );
    setLocalItems("videos", items);
    return;
  }
  await updateDoc(doc(db, "videos", id), clean(data as Record<string, unknown>));
}

/**
 * Persists a new display order for a list of video ids (index = order).
 * Uses a batch so the whole reorder is atomic.
 */
export async function reorderVideos(orderedIds: string[]): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos");
    const byId = new Map(items.map((v) => [v.id, v]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Video[];
    const rest = items.filter((v) => !orderedIds.includes(v.id));
    setLocalItems("videos", [...ordered, ...rest].map((v, i) => ({ ...v, order: i })));
    return;
  }
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "videos", id), { order: index });
  });
  await batch.commit();
}

export async function deleteVideo(id: string): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos").filter((i) => i.id !== id);
    setLocalItems("videos", items);
    return;
  }
  await deleteDoc(doc(db, "videos", id));
  await assertDeleted("videos", id);
}

export async function toggleVideoFreeStatus(id: string, isFree: boolean): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos").map((v) =>
      v.id === id ? { ...v, isFree } : v
    );
    setLocalItems("videos", items);
    return;
  }
  await updateDoc(doc(db, "videos", id), { isFree });
}

export async function toggleFileFreeStatus(id: string, isFree: boolean): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files").map((f) =>
      f.id === id ? { ...f, isFree } : f
    );
    setLocalItems("files", items);
    return;
  }
  await updateDoc(doc(db, "files", id), { isFree });
}

export async function toggleFileDownloadStatus(id: string, canDownload: boolean): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files").map((f) =>
      f.id === id ? { ...f, canDownload } : f
    );
    setLocalItems("files", items);
    return;
  }
  await updateDoc(doc(db, "files", id), { canDownload });
}

export async function toggleFileViewStatus(id: string, canView: boolean): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files").map((f) =>
      f.id === id ? { ...f, canView } : f
    );
    setLocalItems("files", items);
    return;
  }
  await updateDoc(doc(db, "files", id), { canView });
}

export async function toggleAssessmentFreeStatus(id: string, isFree: boolean): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Assessment>("assessments").map((a) =>
      a.id === id ? { ...a, isFree } : a
    );
    setLocalItems("assessments", items);
    return;
  }
  await updateDoc(doc(db, "assessments", id), { isFree });
}

async function toggleHiddenLocal<T extends { id: string }>(key: string, id: string, isHidden: boolean): Promise<void> {
  const items = getLocalItems<T>(key).map((i) => (i.id === id ? { ...i, isHidden } as T : i));
  setLocalItems(key, items);
}

export async function toggleVideoHidden(id: string, isHidden: boolean): Promise<void> {
  if (useLocalStorage) return toggleHiddenLocal<Video>("videos", id, isHidden);
  await updateDoc(doc(db, "videos", id), { isHidden });
}

export async function toggleFileHidden(id: string, isHidden: boolean): Promise<void> {
  if (useLocalStorage) return toggleHiddenLocal<FileItem>("files", id, isHidden);
  await updateDoc(doc(db, "files", id), { isHidden });
}

export async function toggleAssessmentHidden(id: string, isHidden: boolean): Promise<void> {
  if (useLocalStorage) return toggleHiddenLocal<Assessment>("assessments", id, isHidden);
  await updateDoc(doc(db, "assessments", id), { isHidden });
}

// Subject hiding: when hiding, push to the bottom (visible always on top).
export async function toggleSubjectHidden(id: string, isHidden: boolean): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Subject>("subjects");
    const maxOrder = items.reduce((m, s) => Math.max(m, s.order ?? 0), -1);
    const next = items.map((s) =>
      s.id === id ? { ...s, isHidden, order: isHidden ? maxOrder + 1 : 0 } as Subject : s
    );
    setLocalItems("subjects", next);
    return;
  }
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
  if (useLocalStorage) {
    const items = getLocalItems<Subject>("subjects");
    const byId = new Map(items.map((s) => [s.id, s]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Subject[];
    const rest = items.filter((s) => !orderedIds.includes(s.id));
    setLocalItems("subjects", [...ordered, ...rest].map((s, i) => ({ ...s, order: i })));
    return;
  }
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "subjects", id), { order: index });
  });
  await batch.commit();
}

// Files
export async function getAllFiles(): Promise<FileItem[]> {
  if (useLocalStorage) {
    return getLocalItems<FileItem>("files");
  }
  const snapshot = await getDocs(collection(db, "files"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FileItem));
}

export async function getFilesBySubject(subjectId: string): Promise<FileItem[]> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files").filter((f) => f.subjectId === subjectId);
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  const q = query(
    collection(db, "files"),
    where("subjectId", "==", subjectId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as FileItem;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function reorderFiles(orderedIds: string[]): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files");
    const byId = new Map(items.map((f) => [f.id, f]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as FileItem[];
    const rest = items.filter((f) => !orderedIds.includes(f.id));
    setLocalItems("files", [...ordered, ...rest].map((f, i) => ({ ...f, order: i })));
    return;
  }
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "files", id), { order: index });
  });
  await batch.commit();
}

export async function reorderAssessments(orderedIds: string[]): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Assessment>("assessments");
    const byId = new Map(items.map((a) => [a.id, a]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter(Boolean) as Assessment[];
    const rest = items.filter((a) => !orderedIds.includes(a.id));
    setLocalItems("assessments", [...ordered, ...rest].map((a, i) => ({ ...a, order: i })));
    return;
  }
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, "assessments", id), { order: index });
  });
  await batch.commit();
}

export async function createFile(data: Omit<FileItem, "id" | "createdAt" | "downloads">): Promise<FileItem> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files");
    const maxOrder = items.reduce((m, f) => Math.max(m, f.order ?? 0), -1);
    const newItem: FileItem = {
      id: generateId(),
      ...data,
      order: maxOrder + 1,
      isFree: data.isFree ?? true,
      canDownload: data.canDownload ?? true,
      canView: data.canView ?? true,
      downloads: 0,
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    setLocalItems("files", items);
    return newItem;
  }
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

export async function incrementFileDownloads(id: string): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files").map((f) =>
      f.id === id ? { ...f, downloads: f.downloads + 1 } : f
    );
    setLocalItems("files", items);
    return;
  }
  await updateDoc(doc(db, "files", id), { downloads: increment(1) });
}

export async function deleteFile(id: string): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files").filter((i) => i.id !== id);
    setLocalItems("files", items);
    return;
  }
  await deleteDoc(doc(db, "files", id));
  await assertDeleted("files", id);
}

// Assessments (Practice Tests)
export async function getAssessmentsBySubject(subjectId: string): Promise<Assessment[]> {
  if (useLocalStorage) {
    const items = getLocalItems<Assessment>("assessments").filter((a) => a.subjectId === subjectId);
    return items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  const q = query(
    collection(db, "assessments"),
    where("subjectId", "==", subjectId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as Assessment;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function createAssessment(data: Omit<Assessment, "id" | "createdAt">): Promise<Assessment> {
  if (useLocalStorage) {
    const items = getLocalItems<Assessment>("assessments");
    const maxOrder = items.reduce((m, i) => Math.max(m, i.order ?? 0), -1);
    const newItem: Assessment = { id: generateId(), ...data, isFree: data.isFree ?? true, createdAt: new Date().toISOString(), order: maxOrder + 1 };
    items.push(newItem);
    setLocalItems("assessments", items);
    return newItem;
  }
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
  if (useLocalStorage) {
    const items = getLocalItems<Assessment>("assessments").filter((i) => i.id !== id);
    setLocalItems("assessments", items);
    return;
  }
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

// User Profile & Enrolled Subjects
export async function getUserProfile(userId: string) {
  if (useLocalStorage) {
    const data = localStorage.getItem(`a-plus-user-${userId}`);
    return data ? JSON.parse(data) : { enrolled_subjects: [] };
  }
  const userDoc = await getDoc(doc(db, "users", userId));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return { enrolled_subjects: [] };
}

export async function activateSubject(userId: string, subjectId: string, code: string): Promise<boolean> {
  // Get the subject to check its activation code
  const subject = await getSubjectById(subjectId);
  if (!subject) {
    throw new Error("المادة غير موجودة");
  }
  if (code !== subject.code) {
    throw new Error("كود التفعيل غير صحيح");
  }

  if (useLocalStorage) {
    const profile = await getUserProfile(userId);
    const enrolled = profile.enrolled_subjects || [];
    if (!enrolled.includes(subjectId)) {
      enrolled.push(subjectId);
    }
    localStorage.setItem(`a-plus-user-${userId}`, JSON.stringify({ ...profile, enrolled_subjects: enrolled }));
    return true;
  }

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  
  const userData = userSnap.exists() ? userSnap.data() : { enrolled_subjects: [] };
  const currentSubjects = userData.enrolled_subjects || [];
  
  if (!currentSubjects.includes(subjectId)) {
    currentSubjects.push(subjectId);
    
    if (!userSnap.exists()) {
      await setDoc(userRef, { enrolled_subjects: currentSubjects }, { merge: true });
    } else {
      await updateDoc(userRef, { enrolled_subjects: currentSubjects });
    }
  }
  
  return true;
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

export async function getStudents(): Promise<Student[]> {
  if (useLocalStorage) {
    return getLocalItems<Student>("students");
  }
  const snapshot = await getDocs(collection(db, "students"));
  return snapshot.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() } as Student;
  });
}

export async function createStudent(data: {
  username: string;
  password: string;
  displayName: string;
  enrolledSubjects: string[];
}): Promise<Student> {
  if (useLocalStorage) {
    const items = getLocalItems<Student>("students");
    const newItem: Student = {
      id: generateId(),
      username: data.username,
      password: data.password,
      displayName: data.displayName,
      isActive: true,
      enrolledSubjects: data.enrolledSubjects,
      devices: [],
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    setLocalItems("students", items);
    return newItem;
  }
  const ref = await addDoc(collection(db, "students"), {
    ...data,
    isActive: true,
    devices: [],
    createdAt: serverTimestamp(),
  });
  return {
    id: ref.id,
    ...data,
    isActive: true,
    devices: [],
    createdAt: new Date().toISOString(),
  };
}

export async function updateStudent(
  id: string,
  data: { displayName?: string; password?: string; enrolledSubjects?: string[]; isActive?: boolean }
): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Student>("students").map((s) =>
      s.id === id ? { ...s, ...data } : s
    );
    setLocalItems("students", items);
    return;
  }
  await updateDoc(doc(db, "students", id), data);
}

export async function deleteStudent(id: string): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Student>("students").filter((s) => s.id !== id);
    setLocalItems("students", items);
    return;
  }
  await deleteDoc(doc(db, "students", id));
  await assertDeleted("students", id);
}

export async function getStudentByUsername(username: string): Promise<Student | null> {
  if (useLocalStorage) {
    const items = getLocalItems<Student>("students");
    return items.find((s) => s.username === username) || null;
  }
  const q = query(collection(db, "students"), where("username", "==", username));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  const data = d.data();
  return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() } as Student;
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
  if (useLocalStorage) {
    const items = getLocalItems<Student>("students");
    const idx = items.findIndex((s) => s.id === studentId);
    if (idx === -1) return { success: false, error: "الطالب غير موجود" };

    const student = items[idx];
    const existingDevice = student.devices.find((d) => d.deviceId === deviceInfo.deviceId);
    if (existingDevice) {
      // تحديث تاريخ آخر وصول
      student.devices = student.devices.map((d) =>
        d.deviceId === deviceInfo.deviceId
          ? { ...d, lastAccess: deviceInfo.lastAccess }
          : d
      );
      items[idx] = student;
      setLocalItems("students", items);
      return { success: true };
    }

    if (student.devices.length >= 2) {
      return {
        success: false,
        error: "لقد وصلت للحد الأقصى من الأجهزة المسموح بها (2). يرجى التواصل مع الأدمن لإزالة أحد أجهزتك",
      };
    }

    student.devices.push(deviceInfo);
    items[idx] = student;
    setLocalItems("students", items);
    return { success: true };
  }

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
  if (useLocalStorage) {
    const items = getLocalItems<Student>("students").map((s) =>
      s.id === studentId
        ? { ...s, devices: s.devices.filter((d) => d.deviceId !== deviceId) }
        : s
    );
    setLocalItems("students", items);
    return;
  }
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

// ─── Trial Settings ──────────────────────────────────

export async function getTrialSettings(): Promise<{ endDate: string; active: boolean }> {
  const snap = await getDoc(doc(db, "settings", "trial"));
  if (!snap.exists()) return { endDate: "", active: false };
  return snap.data() as { endDate: string; active: boolean };
}

export async function updateTrialSettings(data: { endDate: string; active: boolean }): Promise<void> {
  await setDoc(doc(db, "settings", "trial"), data, { merge: true });
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
export function normalizeQuiz(quiz: Quiz): Quiz {
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

export function subscribeAllQuizResults(
  onData: (items: QuizResult[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return onSnapshot(
    collection(db, "quizResults"),
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
  const quizzesCol = collection(db, "quizzes");
  const ref = doc(quizzesCol);
  const counterRef = doc(db, "counters", `quizzes:${data.subjectId}`);
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

export async function updateQuiz(id: string, data: Partial<Omit<Quiz, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "quizzes", id), data);
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

export function subscribeMaterialQuizResults(
  subjectId: string,
  onData: (items: QuizResult[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const q = query(collection(db, "materialQuizResults"), where("subjectId", "==", subjectId));
  return onSnapshot(
    q,
    (snapshot) => onData(snapshot.docs.map(quizResultFromDoc)),
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
  username: string;
  studentName: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
}): Promise<{ result: QuizResult; attempt: number; saved: boolean }> {
  const resultId = `${input.subjectId}_${input.username}`;
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
  const col = collection(db, "materialQuizzes");
  const ref = doc(col);
  const counterRef = doc(db, "counters", `materialQuizzes:${data.subjectId}`);
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

export async function updateMaterialQuiz(id: string, data: Partial<Omit<Quiz, "id" | "createdAt">>): Promise<void> {
  await updateDoc(doc(db, "materialQuizzes", id), data);
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
