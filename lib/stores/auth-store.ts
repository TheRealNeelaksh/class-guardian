"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { UserRecord } from "@/lib/db";

interface AuthState {
  user: UserRecord | null;
  setUser: (user: UserRecord) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "classguard-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function isRoastMode(user: UserRecord | null | undefined): boolean {
  if (!user) return false;
  return user.toneMode === "roast";
}
