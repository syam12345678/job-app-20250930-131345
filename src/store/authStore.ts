import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@shared/types';
// We omit passwordHash from the user object stored in the frontend
type StoredUser = Omit<User, 'passwordHash'>;
interface AuthState {
  user: StoredUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: StoredUser, token: string) => void;
  logout: () => void;
  setUser: (user: StoredUser) => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set((state) => ({ ...state, user })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);