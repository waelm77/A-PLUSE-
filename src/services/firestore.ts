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
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { Subject, Video, FileItem, Assessment } from "../types";

let useLocalStorage = true;

try {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (apiKey && apiKey !== "YOUR_API_KEY" && apiKey.length >= 10 && import.meta.env.VITE_USE_FIREBASE === "true") {
    useLocalStorage = false;
    console.log("Firebase configured. Using Firestore.");
  } else {
    console.log("Using LocalStorage (add VITE_USE_FIREBASE=true to .env to enable Firebase).");
  }
} catch (e) {
  console.error("Error detecting environment:", e);
}

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

// Seed default subjects if none exist
export async function seedSubjects() {
  const existing = await getSubjects();
  if (existing.length === 0) {
    const defaults: Subject[] = [
      { id: generateId(), name: "الكيمياء العامة", description: "شرح شامل لمبادئ الكيمياء لطلاب السنة التحضيرية", color: "#00BCD4", icon: "FlaskConical", code: "chem101", createdAt: new Date().toISOString() },
      { id: generateId(), name: "الفيزياء العامة", description: "أساسيات الفيزياء الميكانيكية والكهربائية", color: "#3F51B5", icon: "Atom", code: "phys101", createdAt: new Date().toISOString() },
      { id: generateId(), name: "الكيمياء الحيوية", description: "دراسة العمليات الكيميائية داخل الكائنات الحية", color: "#E91E63", icon: "Dna", code: "biochem101", createdAt: new Date().toISOString() },
      { id: generateId(), name: "التشريح", description: "دراسة بنية جسم الإنسان وأنظمته المختلفة", color: "#F44336", icon: "Heart", code: "anat101", createdAt: new Date().toISOString() },
    ];
    if (useLocalStorage) {
      setLocalItems("subjects", defaults);
      // Seed content for the first subject
      seedContent(defaults[0].id);
    }
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

// Videos
export async function getAllVideos(): Promise<Video[]> {
  if (useLocalStorage) {
    return getLocalItems<Video>("videos");
  }
  const snapshot = await getDocs(collection(db, "videos"));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Video));
}

export async function getVideosBySubject(subjectId: string): Promise<Video[]> {
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos").filter((v) => v.subjectId === subjectId);
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createVideo(data: Omit<Video, "id" | "createdAt">): Promise<Video> {
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos");
    const newItem: Video = { id: generateId(), isFree: data.isFree ?? true, ...data, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    setLocalItems("videos", items);
    return newItem;
  }
  const ref = await addDoc(collection(db, "videos"), {
    ...data,
    isFree: data.isFree ?? true,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, isFree: data.isFree ?? true, createdAt: new Date().toISOString() };
}

export async function deleteVideo(id: string): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Video>("videos").filter((i) => i.id !== id);
    setLocalItems("videos", items);
    return;
  }
  await deleteDoc(doc(db, "videos", id));
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
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createFile(data: Omit<FileItem, "id" | "createdAt" | "downloads">): Promise<FileItem> {
  if (useLocalStorage) {
    const items = getLocalItems<FileItem>("files");
    const newItem: FileItem = { id: generateId(), ...data, isFree: data.isFree ?? true, downloads: 0, createdAt: new Date().toISOString() };
    items.unshift(newItem);
    setLocalItems("files", items);
    return newItem;
  }
  const ref = await addDoc(collection(db, "files"), {
    ...data,
    isFree: data.isFree ?? true,
    downloads: 0,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, isFree: data.isFree ?? true, downloads: 0, createdAt: new Date().toISOString() };
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
    const newItem: Assessment = { id: generateId(), ...data, isFree: data.isFree ?? true, createdAt: new Date().toISOString(), order: items.length };
    items.push(newItem);
    setLocalItems("assessments", items);
    return newItem;
  }
  const ref = await addDoc(collection(db, "assessments"), {
    ...data,
    isFree: data.isFree ?? true,
    order: 0,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, ...data, isFree: data.isFree ?? true, createdAt: new Date().toISOString() };
}

export async function deleteAssessment(id: string): Promise<void> {
  if (useLocalStorage) {
    const items = getLocalItems<Assessment>("assessments").filter((i) => i.id !== id);
    setLocalItems("assessments", items);
    return;
  }
  await deleteDoc(doc(db, "assessments", id));
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
