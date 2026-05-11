import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      studentSession: null,
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      setStudentSession: (session) => set({ studentSession: session }),
      logout: () => set({ user: null, isAuthenticated: false, isLoading: false, studentSession: null }),
    }),
    {
      name: "a-plus-auth",
    }
  )
);
