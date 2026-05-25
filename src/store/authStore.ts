import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";

interface User {
  uid: string;
  email: string | null;
  name: string | null;
  role: "student" | "admin";
  enrolled_subjects?: string[];
}

interface StudentSession {
  username: string;
  displayName: string;
  enrolledSubjects: string[];
  deviceId: string;
  loggedInAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  studentSession: StudentSession | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setStudentSession: (session: StudentSession | null) => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

let authInitialized = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      if (!authInitialized) {
        authInitialized = true;
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const snap = await getDoc(doc(db, "admins", firebaseUser.uid));
              const name = snap.exists() ? snap.data().name : firebaseUser.email;
              set({
                user: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  name,
                  role: "admin",
                },
                isAuthenticated: true,
                isLoading: false,
              });
            } catch {
              set({ isLoading: false });
            }
          } else {
            const { studentSession } = get();
            set({ user: null, isAuthenticated: false, isLoading: false, studentSession });
          }
        });
      }

      return {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        studentSession: null,
        setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
        setLoading: (isLoading) => set({ isLoading }),
        setStudentSession: (session) => set({ studentSession: session }),
        loginWithEmail: async (email: string, password: string) => {
          try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;
            const docSnap = await getDoc(doc(db, "admins", uid));
            let name = cred.user.email;
            if (docSnap.exists()) {
              name = docSnap.data().name || email;
            }
            set({
              user: { uid, email, name, role: "admin" },
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (err: any) {
            if (err?.code === "auth/user-not-found") {
              // Migration: check if admin exists in Firestore (old system)
              const q = query(collection(db, "admins"), where("email", "==", email));
              const snap = await getDocs(q);
              if (!snap.empty) {
                const oldDoc = snap.docs[0];
                const adminData = oldDoc.data();
                if (adminData.password === password) {
                  // Create Firebase Auth account
                  const cred = await createUserWithEmailAndPassword(auth, email, password);
                  // Migrate admin doc to use Firebase Auth UID
                  await setDoc(doc(db, "admins", cred.user.uid), {
                    name: adminData.name,
                    email: adminData.email,
                  });
                  await deleteDoc(oldDoc.ref);
                  set({
                    user: { uid: cred.user.uid, email, name: adminData.name, role: "admin" },
                    isAuthenticated: true,
                    isLoading: false,
                  });
                  return;
                }
              }
            }
            throw err;
          }
        },
        logout: async () => {
          await signOut(auth);
          const { studentSession } = get();
          set({ user: null, isAuthenticated: false, isLoading: false, studentSession });
        },
      };
    },
    {
      name: "a-plus-auth",
      partialize: (state) => ({
        studentSession: state.studentSession,
      }),
    }
  )
);
