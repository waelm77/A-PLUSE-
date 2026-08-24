import { create } from "zustand";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TrialConfig {
  endDate: string;
  active: boolean;
  subjectActive: boolean;
  subjectTitle: string;
  subjectEndDate: string;
}

interface TrialState extends TrialConfig {
  loaded: boolean;
  startListening: () => () => void;
  save: (config: Partial<TrialConfig>) => Promise<void>;
}

const DEFAULT_SUBJECT_TITLE = "الفترة التجريبية تنتهي خلال";

export const useTrialStore = create<TrialState>()(() => ({
  endDate: "",
  active: false,
  subjectActive: false,
  subjectTitle: DEFAULT_SUBJECT_TITLE,
  subjectEndDate: "",
  loaded: false,
  startListening: () => {
    const unsub = onSnapshot(
      doc(db, "settings", "trial"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          useTrialStore.setState({
            endDate: data.endDate || "",
            active: data.active || false,
            subjectActive: data.subjectActive || false,
            subjectTitle: data.subjectTitle || DEFAULT_SUBJECT_TITLE,
            subjectEndDate: data.subjectEndDate || "",
            loaded: true,
          });
        } else {
          useTrialStore.setState({ loaded: true });
        }
      },
      () => {
        useTrialStore.setState({ loaded: true });
      }
    );
    return unsub;
  },
  save: async (config) => {
    await setDoc(doc(db, "settings", "trial"), config, { merge: true });
  },
}));
