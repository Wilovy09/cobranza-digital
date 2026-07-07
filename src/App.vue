<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'

const route = useRoute()

// El Designer y el login necesitan la pantalla completa; el resto de vistas
// vive en una columna centrada.
const fullBleed = computed(
  () =>
    route.name === 'plantilla-nueva' ||
    route.name === 'plantilla-editar' ||
    route.name === 'login',
)
</script>

<template>
  <div class="app-root">
    <AppNavbar v-if="route.name !== 'login'" />
    <main v-if="fullBleed" class="app-shell app-shell--full">
      <RouterView />
    </main>
    <main v-else class="app-shell">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.app-shell {
  flex: 1;
  min-height: 0;
  max-width: 880px;
  width: 100%;
  margin: 0 auto;
  padding: var(--space-8) var(--space-6) var(--space-8);
  overflow: auto;
}

.app-shell--full {
  max-width: none;
  padding: 0;
}

@media (max-width: 640px) {
  .app-shell {
    padding: var(--space-5) var(--space-4) var(--space-6);
  }
}
</style>
