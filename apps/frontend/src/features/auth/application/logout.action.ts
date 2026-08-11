import { logoutRequest } from '../infrastructure/auth.api'
import { useAuthStore } from '../stores/auth.store'

export async function logoutAction(): Promise<void> {
  try {
    await logoutRequest()
  } finally {
    useAuthStore.getState().logoutLocal()
  }
}
