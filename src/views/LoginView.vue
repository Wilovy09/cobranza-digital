<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.signIn(email.value, password.value)
    router.push('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="login__panel">
      <p class="login__brand">Cobranza Digital</p>

      <form class="login__form ticket-card" @submit.prevent="onSubmit">
        <h1 class="login__title">Iniciar sesión</h1>

        <label class="login__field">
          <span>Correo</span>
          <input v-model="email" type="email" required autocomplete="email" />
        </label>

        <label class="login__field">
          <span>Contraseña</span>
          <input v-model="password" type="password" required autocomplete="current-password" />
        </label>

        <p v-if="error" class="login__error">{{ error }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login {
  height: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: var(--space-6);
}

.login__panel {
  width: 100%;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.login__brand {
  margin: 0;
  text-align: center;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-ink);
}

.login__form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-6) var(--space-6);
}

.login__title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--space-2);
}

.login__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-ink-soft);
}

.login__field input {
  padding: 10px var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-sunken);
  font-size: 14px;
  color: var(--color-ink);
}

.login__field input:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
}

.login__error {
  margin: 0;
  color: var(--stamp-pendiente);
  font-size: 13px;
}

.login__form button {
  margin-top: var(--space-1);
  padding: 11px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-bg);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
}

.login__form button:hover:not(:disabled) {
  opacity: 0.92;
}

.login__form button:active:not(:disabled) {
  transform: scale(0.97);
}

.login__form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
