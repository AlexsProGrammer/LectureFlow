import { create } from 'zustand'
import api from '../lib/api'

interface SetupState {
  hasSuperAdmin: boolean | null
  checkStatus: () => Promise<void>
}

export const useSetupStore = create<SetupState>((set) => ({
  hasSuperAdmin: null,
  checkStatus: async () => {
    const { data } = await api.get('/setup/status')
    set({ hasSuperAdmin: data.hasSuperAdmin })
  },
}))
