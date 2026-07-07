<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useFacturasStore } from '@/stores/facturas'
import { destroyTour, startTour } from '@/composables/useTour'

const store = useFacturasStore()
const router = useRouter()

onMounted(() => {
  store.fetchAll(10)
})

onUnmounted(() => {
  destroyTour()
})

function onStartTour() {
  startTour(router)
}
</script>

<template>
  <div class="home">
    <div class="home__header">
      <div>
        <p class="home__eyebrow">Mostrador</p>
        <h1>Últimos movimientos</h1>
      </div>
      <div class="home__header-actions">
        <button class="btn-ghost" type="button" @click="onStartTour">Recorrido guiado</button>
        <RouterLink to="/facturas" class="home__ver-todas">Ver todas →</RouterLink>
      </div>
    </div>

    <p v-if="store.loading" class="home__empty">Cargando...</p>
    <p v-else-if="!store.facturas.length" class="home__empty">No hay facturas aún.</p>

    <ul v-else class="home__list">
      <li v-for="f in store.facturas" :key="f.id">
        <RouterLink :to="`/facturas/${f.id}`" class="home__row ticket-card">
          <div class="home__row-main">
            <span class="home__cliente">{{ f.cliente }}</span>
            <span class="home__concepto">{{ f.concepto }}</span>
          </div>
          <span class="home__fecha">{{ new Date(f.updated_at).toLocaleDateString() }}</span>
          <span class="home__monto">{{ f.monto_total.toFixed(2) }}</span>
          <span
            class="stamp-chip"
            :class="f.estado === 'pagada' ? 'stamp--pagada' : 'stamp--pendiente'"
          >
            {{ f.estado }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.home__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.home__eyebrow {
  margin: 0 0 var(--space-1);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.home__header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.home__ver-todas {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-accent);
  text-decoration: none;
}

.home__empty {
  color: var(--color-ink-muted);
  font-size: 14px;
}

.home__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.home__row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: var(--space-5);
  text-decoration: none;
  color: var(--color-ink);
  transition: border-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.home__row:hover {
  border-color: var(--color-accent);
}

.home__row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.home__cliente {
  font-size: 15px;
  font-weight: 600;
}

.home__concepto {
  font-size: 12.5px;
  color: var(--color-ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home__fecha {
  font-size: 12px;
  color: var(--color-ink-muted);
}

.home__monto {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 640px) {
  .home__row {
    grid-template-columns: 1fr;
    justify-items: start;
    gap: var(--space-2);
  }
}
</style>
