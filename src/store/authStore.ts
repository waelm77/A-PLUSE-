import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

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
// Flag set during migration to prevent onAuthStateChanged from overwriting
let isMigrationInProgress = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      if (!authInitialized) {
        authInitialized = true;
        onAuthStateChanged(auth, async (firebaseUser) => {
          // If migration is in progress, let loginWithEmail handle everything
          if (isMigrationInProgress) return;

          if (firebaseUser) {
            try {
              const snap = await getDoc(doc(db, "admins", firebaseUser.uid));
              const name = snap.exists()
                ? snap.data().name
                : firebaseUser.email;
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
            } catch (e) {
              console.error("onAuthStateChanged error", e);
              set({ isLoading: false });
            }
          } else {
            const { studentSession } = get();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              studentSession,
            });
          }
        });
      }

      return {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        studentSession: null,
        setUser: (user) =>
          set({ user, isAuthenticated: !!user, isLoading: false }),
        setLoading: (isLoading) => set({ isLoading }),
        setStudentSession: (session) => set({ studentSession: session }),
        loginWithEmail: async (email: string, password: string) => {
          try {
            // 1) Try direct sign-in
            const cred = await signInWithEmailAndPassword(
              auth,
              email,
              password
            );
            const uid = cred.user.uid;
            const docSnap = await getDoc(doc(db, "admins", uid));
            set({
              user: {
                uid,
                email,
                name: docSnap.exists()
                  ? docSnap.data().name || email
                  : email,
                role: "admin",
              },
              isAuthenticated: true,
              isLoading: false,
            });
          } catch (err: any) {
            const code = err?.code;

            // 2) Handle missing / wrong-password for old-system admins
            if (
              code === "auth/user-not-found" ||
              code === "auth/wrong-password"
            ) {
              const q = query(
                collection(db, "admins"),
                where("email", "==", email)
              );
              const snap = await getDocs(q);
              if (!snap.empty) {
                const oldDoc = snap.docs[0];
                const adminData = oldDoc.data();

                // Only proceed if the old Firestore password matches
                if (adminData.password === password) {
                  isMigrationInProgress = true;

                  try {
                    // Try creating a Firebase Auth account (works for user-not-found)
                    // For wrong-password this will fail with email-already-in-use
                    const cred = await createUserWithEmailAndPassword(
                      auth,
                      email,
                      password
                    );
                    await setDoc(doc(db, "admins", cred.user.uid), {
                      name: adminData.name,
                      email: adminData.email,
                    });
                    await deleteDoc(oldDoc.ref);
                    set({
                      user: {
                        uid: cred.user.uid,
                        email,
                        name: adminData.name,
                        role: "admin",
                      },
                      isAuthenticated: true,
                      isLoading: false,
                    });
                    return;
                  } catch (createErr: any) {
                    if (
                      createErr?.code === "auth/email-already-in-use"
                    ) {
                      // Firebase Auth account exists with a different password
                      // We can't change the password without Admin SDK,
                      // but we can sign in with the existing account
                      // if the email/user-not-found case somehow got here
                      try {
                        const cred = await signInWithEmailAndPassword(
                          auth,
                          email,
                          password
                        );
                        await setDoc(
                          doc(db, "admins", cred.user.uid),
                          { name: adminData.name, email },
                          { merge: true }
                        );
                        await deleteDoc(oldDoc.ref);
                        set({
                          user: {
                            uid: cred.user.uid,
                            email,
                            name: adminData.name,
                            role: "admin",
                          },
                          isAuthenticated: true,
                          isLoading: false,
                        });
                        return;
                      } catch {
                        // Both create and sign-in failed
                        isMigrationInProgress = false;
                        throw new Error(
                          "تعذر تسجيل الدخول. الرجاء استخدام 'نسيت كلمة المرور'."
                        );
                      }
                    }
                    isMigrationInProgress = false;
                    throw createErr;
                  } finally {
                    isMigrationInProgress = false;
                  }
                }
              }
            }
            throw err;
          }
        },
        logout: async () => {
          await signOut(auth);
          const { studentSession } = get();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            studentSession,
          });
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
