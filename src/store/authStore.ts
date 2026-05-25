import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

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
