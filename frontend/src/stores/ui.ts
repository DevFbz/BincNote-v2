import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarAberta: boolean;
  tema: "light" | "dark" | "system";
  toggleSidebar: () => void;
  setTema: (t: "light" | "dark" | "system") => void;
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      sidebarAberta: true,
      tema: "system",
      toggleSidebar: () => set((s) => ({ sidebarAberta: !s.sidebarAberta })),
      setTema: (t) => set({ tema: t }),
    }),
    { name: "bincnote-ui" }
  )
);

export function aplicarTema(tema: "light" | "dark" | "system") {
  const escuro =
    tema === "dark" ||
    (tema === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", escuro);
}