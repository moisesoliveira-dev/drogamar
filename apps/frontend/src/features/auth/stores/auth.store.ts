import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthSession } from '../infrastructure/auth.api'

type AuthState = {
  session: AuthSession | null
  rememberedEmail: string
  setSession: (session: AuthSession | null) => void
  setRememberedEmail: (email: string) => void
  clearRememberedEmail: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      rememberedEmail: '',
      setSession: (session) => set({ session }),
      setRememberedEmail: (email) => set({ rememberedEmail: email }),
      clearRememberedEmail: () => set({ rememberedEmail: '' }),
      logout: () => set({ session: null }),
    }),
    {
      name: 'drogamar.auth',
      partialize: (state) => ({
        rememberedEmail: state.rememberedEmail,
      }),
    },
  ),
)
