import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  displayName: string | null;
  login: (token: string, displayName: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:       null,
      displayName: null,
      login:  (token, displayName) => set({ token, displayName }),
      logout: ()                   => set({ token: null, displayName: null }),
    }),
    { name: 'chesstise-auth' },
  ),
);
