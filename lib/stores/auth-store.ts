import { create } from "zustand";
import type { User, UserRole } from "@/lib/types";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) =>
    set({
      user,
      role: user?.role ?? null,
      isAuthenticated: !!user,
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
