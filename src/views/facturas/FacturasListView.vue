<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useFacturasStore } from '@/stores/facturas'

const store = useFacturasStore()

onMounted(() => {
  store.fetchAll()
})

async function onDelete(id: string) {
  if (!confirm('¿Eliminar esta factura? Se borra también su historial de movimientos.')) return
  await store.remove(id)
  await store.fetchAll()
}
</script>

<template>
  <div class="facturas">
    <div class="facturas__header">
      <div>
        <p class="facturas__eyebrow">Talonario completo</p>
        <h1>Facturas</h1>
      </div>
      <RouterLink to="/facturas/nueva" class="btn-primary">Nueva factura</RouterLink>
    </div>

    <p v-if="store.loading" class="facturas__empty">Cargando...</p>
    <p v-else-if="!store.facturas.length" class="facturas__empty">No hay facturas aún.</p>

    <ul v-else class="facturas__list">
      <li v-for="f in store.facturas" :key="f.id">
        <div class="facturas__row ticket-card">
          <RouterLink :to="`/facturas/${f.id}`" class="facturas__row-main">
            <span class="facturas__cliente">{{ f.cliente }}</span>
            <span class="facturas__concepto">{{ f.concepto }}</span>
          </RouterLink>
          <span class="facturas__fecha">{{ new Date(f.updated_at).toLocaleDateString() }}</span>
          <span class="facturas__monto">{{ f.monto_total.toFixed(2) }}</span>
          <span
            class="stamp-chip"
            :class="f.estado === 'pagada' ? 'stamp--pagada' : 'stamp--pendiente'"
          >
            {{ f.estado }}
          </span>
          <button class="facturas__delete" @click="onDelete(f.id)">Eliminar</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.facturas__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.facturas__eyebrow {
  margin: 0 0 var(--space-1);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.facturas__empty {
  color: var(--color-ink-muted);
  font-size: 14px;
}

.facturas__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.facturas__row {
  display: grid;
  grid-template-columns: 1fr auto auto auto auto;
  align-items: center;
  gap: var(--space-5);
  transition: border-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
}

.facturas__row:hover {
  border-color: var(--color-accent);
}

.facturas__row-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  text-decoration: none;
  color: var(--color-ink);
}

.facturas__delete {
  background: transparent;
  border: none;
  color: var(--color-ink-muted);
  font-size: 13px;
  cursor: pointer;
}

.facturas__delete:hover {
  color: var(--stamp-pendiente);
}

.facturas__cliente {
  font-size: 15px;
  font-weight: 600;
}

.facturas__concepto {
  font-size: 12.5px;
  color: var(--color-ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.facturas__fecha {
  font-size: 12px;
  color: var(--color-ink-muted);
}

.facturas__monto {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 640px) {
  .facturas__row {
    grid-template-columns: 1fr;
    justify-items: start;
    gap: var(--space-2);
  }
}
</style>
