import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TrialState {
  endDate: string;
  active: boolean;
  setTrial: (endDate: string, active: boolean) => void;
}

export const useTrialStore = create<TrialState>()(
  persist(
    (set) => ({
      endDate: "",
      active: false,
      setTrial: (endDate, active) => set({ endDate, active }),
    }),
    {
      name: "a-plus-trial",
    }
  )
);
