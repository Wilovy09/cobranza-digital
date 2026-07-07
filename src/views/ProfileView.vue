<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const nuevaPassword = ref('')
const confirmarPassword = ref('')
const error = ref('')
const success = ref('')
const saving = ref(false)

async function onGuardarPassword() {
  error.value = ''
  success.value = ''

  if (nuevaPassword.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres'
    return
  }

  if (nuevaPassword.value !== confirmarPassword.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  saving.value = true
  try {
    await auth.updatePassword(nuevaPassword.value)
    success.value = 'Contraseña actualizada'
    nuevaPassword.value = ''
    confirmarPassword.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al actualizar la contraseña'
  } finally {
    saving.value = false
  }
}

async function onLogout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="perfil">
    <div class="perfil__intro">
      <p class="perfil__eyebrow">Mi perfil</p>
      <h1>Cuenta</h1>
    </div>

    <div class="perfil__card ticket-card">
      <section class="perfil__section">
        <p class="perfil__label">Correo</p>
        <p class="perfil__email">{{ auth.session?.user.email }}</p>
      </section>

      <form class="perfil__section perfil__section--form" @submit.prevent="onGuardarPassword">
        <p class="perfil__subhead">Cambiar contraseña</p>

        <label class="perfil__field">
          <span>Nueva contraseña</span>
          <input
            v-model="nuevaPassword"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </label>

        <label class="perfil__field">
          <span>Confirmar contraseña</span>
          <input
            v-model="confirmarPassword"
            type="password"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </label>

        <p v-if="error" class="perfil__error">{{ error }}</p>
        <p v-if="success" class="perfil__success">{{ success }}</p>

        <button class="btn-primary" :disabled="saving" type="submit">
          {{ saving ? 'Guardando...' : 'Guardar contraseña' }}
        </button>
      </form>

      <section class="perfil__section perfil__section--logout">
        <button class="perfil__logout" type="button" @click="onLogout">Cerrar sesión</button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.perfil {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
}

.perfil__intro {
  text-align: center;
}

.perfil__eyebrow {
  margin: 0 0 var(--space-1);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.perfil__card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 380px;
  padding: 0;
}

.perfil__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
}

.perfil__section:not(:last-child) {
  border-bottom: 1px dashed var(--color-border);
}

.perfil__section--form {
  gap: var(--space-4);
}

.perfil__section--logout {
  align-items: center;
  padding: var(--space-4) var(--space-6);
}

.perfil__label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.perfil__email {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.perfil__subhead {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink-soft);
}

.perfil__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-ink-soft);
}

.perfil__field input {
  padding: 9px var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-sunken);
  font-size: 14px;
  color: var(--color-ink);
}

.perfil__field input:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
}

.perfil__error {
  margin: 0;
  color: var(--stamp-pendiente);
  font-size: 13px;
}

.perfil__success {
  margin: 0;
  color: var(--stamp-pagada);
  font-size: 13px;
}

.perfil__logout {
  background: transparent;
  border: none;
  color: var(--color-ink-muted);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.perfil__logout:hover {
  color: var(--stamp-pendiente);
}
</style>
