<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { usePlantillasStore, type Plantilla } from '@/stores/plantillas'
import { useFacturasStore, type Factura } from '@/stores/facturas'
import { useTourStore } from '@/stores/tour'
import { destroyTour, runPlantillasListDoneTour, runPlantillasListTour } from '@/composables/useTour'

const store = usePlantillasStore()
const facturasStore = useFacturasStore()
const tourStore = useTourStore()
const router = useRouter()

const dialogRef = ref<HTMLDialogElement | null>(null)
const plantillaEnBorrado = ref<Plantilla | null>(null)
const facturasEnUso = ref<Factura[]>([])
const borrandoPlantilla = ref(false)

onMounted(() => {
  store.fetchAll()

  if (tourStore.active && tourStore.segment === 'plantillas-list') {
    runPlantillasListTour(router)
  } else if (tourStore.active && tourStore.segment === 'plantillas-list-done') {
    runPlantillasListDoneTour(router)
  }
})

onUnmounted(() => {
  destroyTour()
})

async function onDelete(p: Plantilla) {
  if (!confirm('¿Eliminar esta plantilla?')) return

  try {
    await store.remove(p.id)
    await store.fetchAll()
  } catch (e) {
    const code = (e as { code?: string })?.code
    if (code !== '23503') throw e

    plantillaEnBorrado.value = p
    facturasEnUso.value = await facturasStore.fetchByPlantilla(p.id)
    dialogRef.value?.showModal()
  }
}

async function onDeleteFacturaEnModal(facturaId: string) {
  await facturasStore.remove(facturaId)
  if (plantillaEnBorrado.value) {
    facturasEnUso.value = await facturasStore.fetchByPlantilla(plantillaEnBorrado.value.id)
  }
}

async function onConfirmarEliminarPlantilla() {
  if (!plantillaEnBorrado.value) return

  borrandoPlantilla.value = true
  try {
    await store.remove(plantillaEnBorrado.value.id)
    await store.fetchAll()
    dialogRef.value?.close()
  } finally {
    borrandoPlantilla.value = false
  }
}

function onCerrarModal() {
  dialogRef.value?.close()
}
</script>

<template>
  <div class="plantillas">
    <div class="plantillas__header">
      <div>
        <p class="plantillas__eyebrow">Diseños guardados</p>
        <h1>Mis plantillas</h1>
      </div>
      <RouterLink id="tour-nueva-plantilla" to="/plantillas/nueva" class="btn-primary">
        Nueva plantilla
      </RouterLink>
    </div>

    <p v-if="store.loading" class="plantillas__empty">Cargando...</p>
    <p v-else-if="!store.plantillas.length" class="plantillas__empty">
      No tienes plantillas aún.
    </p>

    <ul v-else class="plantillas__list">
      <li v-for="p in store.plantillas" :key="p.id">
        <div class="plantillas__row ticket-card">
          <RouterLink :to="`/plantillas/${p.id}`" class="plantillas__nombre">
            {{ p.nombre }}
          </RouterLink>
          <span class="plantillas__fecha">
            {{ new Date(p.updated_at).toLocaleDateString() }}
          </span>
          <button class="plantillas__delete" @click="onDelete(p)">Eliminar</button>
        </div>
      </li>
    </ul>

    <dialog ref="dialogRef" class="modal">
      <div class="modal__panel">
        <p class="modal__eyebrow">En uso</p>
        <h2>"{{ plantillaEnBorrado?.nombre }}" está en {{ facturasEnUso.length }} factura(s)</h2>
        <p class="modal__hint">
          Bórralas aquí (o edítalas para quitarles la plantilla) y luego elimina la plantilla.
        </p>

        <ul v-if="facturasEnUso.length" class="modal__list">
          <li v-for="f in facturasEnUso" :key="f.id" class="modal__row">
            <div class="modal__row-main">
              <span class="modal__cliente">{{ f.cliente }}</span>
              <span class="modal__concepto">{{ f.concepto }}</span>
            </div>
            <button class="modal__row-delete" @click="onDeleteFacturaEnModal(f.id)">
              Eliminar factura
            </button>
          </li>
        </ul>
        <p v-else class="modal__empty">Ya no hay facturas usando esta plantilla.</p>

        <div class="modal__actions">
          <button class="btn-ghost" type="button" @click="onCerrarModal">Cancelar</button>
          <button
            class="btn-primary"
            type="button"
            :disabled="facturasEnUso.length > 0 || borrandoPlantilla"
            @click="onConfirmarEliminarPlantilla"
          >
            {{ borrandoPlantilla ? 'Eliminando...' : 'Eliminar plantilla' }}
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.plantillas__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.plantillas__eyebrow {
  margin: 0 0 var(--space-1);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.plantillas__empty {
  color: var(--color-ink-muted);
  font-size: 14px;
}

.plantillas__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.plantillas__row {
  display: flex;
  align-items: center;
  gap: var(--space-5);
}

.plantillas__nombre {
  flex: 1;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-ink);
  text-decoration: none;
}

.plantillas__nombre:hover {
  color: var(--color-accent);
}

.plantillas__fecha {
  font-size: 12px;
  color: var(--color-ink-muted);
}

.plantillas__delete {
  background: transparent;
  border: none;
  color: var(--color-ink-muted);
  font-size: 13px;
  cursor: pointer;
}

.plantillas__delete:hover {
  color: var(--stamp-pendiente);
}

@media (max-width: 640px) {
  .plantillas__row {
    flex-wrap: wrap;
  }

  .plantillas__nombre {
    flex-basis: 100%;
  }
}

/* modal: chrome base (dialog/panel/eyebrow/hint/actions) vive en tokens.css */
.modal__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-height: 260px;
  overflow-y: auto;
}

.modal__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-sunken);
}

.modal__row-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.modal__cliente {
  font-size: 13.5px;
  font-weight: 600;
}

.modal__concepto {
  font-size: 12px;
  color: var(--color-ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal__row-delete {
  background: transparent;
  border: none;
  color: var(--stamp-pendiente);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.modal__empty {
  margin: 0;
  font-size: 13px;
  color: var(--stamp-pagada);
}
</style>
