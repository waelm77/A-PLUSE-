import { create } from "zustand";
import { getTrialSettings, updateTrialSettings } from "@/services/firestore";

interface TrialState {
  endDate: string;
  active: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  setTrial: (endDate: string, active: boolean) => Promise<void>;
}

export const useTrialStore = create<TrialState>()((set) => ({
  endDate: "",
  active: false,
  loaded: false,
  load: async () => {
    try {
      const data = await getTrialSettings();
      set({ endDate: data.endDate, active: data.active, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  setTrial: async (endDate, active) => {
    await updateTrialSettings({ endDate, active });
    set({ endDate, active });
  },
}));
