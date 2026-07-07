import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const ready = ref(false)

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    ready.value = true

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession
    })
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
  }

  async function updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    session.value = { ...session.value!, user: data.user }
  }

  return { session, ready, init, signIn, signOut, updatePassword }
})
