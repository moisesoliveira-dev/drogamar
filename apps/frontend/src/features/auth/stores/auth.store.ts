import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '../domain/login.schema'

type AuthState = {
  user: AuthUser | null
  bootstrapped: boolean
  rememberedEmail: string
  setUser: (user: AuthUser | null) => void
  setBootstrapped: (value: boolean) => void
  setRememberedEmail: (email: string) => void
  clearRememberedEmail: () => void
  logoutLocal: () => void
}

/**
 * Estado de UI/sessão.
 * NÃO armazena tokens/senhas — cookies HttpOnly cuidam da autenticação real.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      bootstrapped: false,
      rememberedEmail: '',
      setUser: (user) => set({ user }),
      setBootstrapped: (bootstrapped) => set({ bootstrapped }),
      setRememberedEmail: (email) => set({ rememberedEmail: email }),
      clearRememberedEmail: () => set({ rememberedEmail: '' }),
      logoutLocal: () => set({ user: null }),
    }),
    {
      name: 'drogamar.auth',
      partialize: (state) => ({
        rememberedEmail: state.rememberedEmail,
      }),
    },
  ),
)
