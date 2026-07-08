import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  isSuperAdmin: boolean
  login: (token: string, isSuperAdmin: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      isSuperAdmin: false,
      login: (token, isSuperAdmin) => set({ token, isSuperAdmin }),
      logout: () => set({ token: null, isSuperAdmin: false }),
    }),
    {
      name: 'lectureflow-auth',
      storage: {
        getItem: (name) => {
          const item = sessionStorage.getItem(name)
          return item ? JSON.parse(item) : null
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name)
        },
      },
    },
  ),
)
