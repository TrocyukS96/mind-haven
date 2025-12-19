import { create, StateCreator } from "zustand";

export interface AppSlice {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
  }

export const createAppSlice: StateCreator<AppSlice> = (set) => ({
    theme: 'dark',
    setTheme: (theme: 'light' | 'dark') => set({ theme }),
  });
  
  export const useAppStore = create<AppSlice>()(createAppSlice);