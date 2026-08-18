import { create } from "zustand";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TrialState {
  endDate: string;
  active: boolean;
  loaded: boolean;
  startListening: () => () => void;
  save: (endDate: string, active: boolean) => Promise<void>;
}

export const useTrialStore = create<TrialState>()(() => ({
  endDate: "",
  active: false,
  loaded: false,
  startListening: () => {
    const unsub = onSnapshot(
      doc(db, "settings", "trial"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          useTrialStore.setState({ endDate: data.endDate || "", active: data.active || false, loaded: true });
        } else {
          useTrialStore.setState({ endDate: "", active: false, loaded: true });
        }
      },
      () => {
        useTrialStore.setState({ loaded: true });
      }
    );
    return unsub;
  },
  save: async (endDate, active) => {
    await setDoc(doc(db, "settings", "trial"), { endDate, active }, { merge: true });
  },
}));
