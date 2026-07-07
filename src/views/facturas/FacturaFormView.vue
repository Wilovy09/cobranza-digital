<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFacturasStore, type Factura, type Movimiento } from '@/stores/facturas'
import { usePlantillasStore, type Plantilla } from '@/stores/plantillas'
import { downloadPdf, generatePdf, getPlantillaFields, matchCampoReservado, type PlantillaField } from '@/utils/pdf'
import PlantillaCampoInput from '@/components/PlantillaCampoInput.vue'
import { useTourStore } from '@/stores/tour'
import { destroyTour, runFacturaFormTour } from '@/composables/useTour'

const route = useRoute()
const router = useRouter()
const facturasStore = useFacturasStore()
const plantillasStore = usePlantillasStore()
const tourStore = useTourStore()

const facturaId = route.params.id as string | undefined
const error = ref('')
const saving = ref(false)

// --- crear nueva factura ---
const cliente = ref('')
const concepto = ref('')
const montoTotal = ref<number | null>(null)
const plantillaId = ref<string>('')

// --- campos custom de la plantilla elegida (texto/imagen que llena el usuario) ---
const plantillaFields = ref<PlantillaField[]>([])
const camposPlantilla = ref<Record<string, string>>({})

// --- factura existente ---
const factura = ref<Factura | null>(null)
const movimientos = ref<Movimiento[]>([])
const nuevoMonto = ref<number | null>(null)
const nuevoTipo = ref<'abono' | 'cargo'>('abono')
const metodoPago = ref('')
const nota = ref('')

const saldo = computed(() =>
  factura.value ? facturasStore.calcularSaldo(factura.value, movimientos.value) : 0,
)

// campos de la plantilla que NO se auto-llenan (todo lo que no matchea cliente/concepto/monto/saldo/fecha)
const camposManuales = computed(() =>
  plantillaFields.value.filter((f) => !matchCampoReservado(f.name)),
)

// mantiene sincronizados los campos reservados con lo que ya se escribió en el formulario
watchEffect(() => {
  for (const field of plantillaFields.value) {
    const kind = matchCampoReservado(field.name)
    if (!kind) continue

    if (kind === 'cliente') camposPlantilla.value[field.name] = cliente.value || factura.value?.cliente || ''
    else if (kind === 'concepto')
      camposPlantilla.value[field.name] = concepto.value || factura.value?.concepto || ''
    else if (kind === 'monto_total')
      camposPlantilla.value[field.name] = String(montoTotal.value ?? factura.value?.monto_total ?? '')
    else if (kind === 'saldo') camposPlantilla.value[field.name] = saldo.value.toFixed(2)
    else if (kind === 'fecha') camposPlantilla.value[field.name] = new Date().toLocaleDateString()
  }
})

async function cargarCamposPlantilla(id: string, valoresPrevios?: Record<string, string>) {
  const plantilla = (await plantillasStore.fetchById(id)) as Plantilla
  plantillaFields.value = getPlantillaFields(plantilla.schema)

  const valores: Record<string, string> = {}
  for (const field of plantillaFields.value) {
    valores[field.name] = valoresPrevios?.[field.name] ?? field.content
  }
  camposPlantilla.value = valores
}

watch(plantillaId, (id) => {
  if (id) cargarCamposPlantilla(id)
  else {
    plantillaFields.value = []
    camposPlantilla.value = {}
  }
})

onMounted(async () => {
  await plantillasStore.fetchAll()

  if (facturaId) {
    factura.value = await facturasStore.fetchById(facturaId)
    movimientos.value = await facturasStore.fetchMovimientos(facturaId)

    if (factura.value.plantilla_id) {
      await cargarCamposPlantilla(factura.value.plantilla_id, factura.value.inputs)
    }
  } else if (tourStore.active && tourStore.segment === 'factura-form') {
    runFacturaFormTour()
  }
})

onUnmounted(() => {
  destroyTour()
})

async function onCrear() {
  error.value = ''
  if (!cliente.value.trim() || !concepto.value.trim() || !montoTotal.value) {
    error.value = 'Completa cliente, concepto y monto total'
    return
  }

  saving.value = true
  try {
    const nueva = await facturasStore.create({
      cliente: cliente.value,
      concepto: concepto.value,
      monto_total: montoTotal.value,
      plantilla_id: plantillaId.value || null,
      inputs: camposPlantilla.value,
    })
    router.push(`/facturas/${nueva.id}`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al crear la factura'
  } finally {
    saving.value = false
  }
}

async function onAgregarMovimiento() {
  if (!factura.value || !nuevoMonto.value) return

  error.value = ''
  saving.value = true
  try {
    const monto = nuevoTipo.value === 'abono' ? -Math.abs(nuevoMonto.value) : Math.abs(nuevoMonto.value)

    await facturasStore.addMovimiento({
      factura_id: factura.value.id,
      monto,
      metodo_pago: metodoPago.value || null,
      nota: nota.value || null,
    })

    factura.value = await facturasStore.fetchById(factura.value.id)
    movimientos.value = await facturasStore.fetchMovimientos(factura.value.id)

    nuevoMonto.value = null
    metodoPago.value = ''
    nota.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al registrar el movimiento'
  } finally {
    saving.value = false
  }
}

async function onEliminarFactura() {
  if (!factura.value) return
  if (!confirm('¿Eliminar esta factura? Se borra también su historial de movimientos.')) return

  await facturasStore.remove(factura.value.id)
  router.push('/facturas')
}

async function onGuardarDatos() {
  if (!factura.value) return

  error.value = ''
  saving.value = true
  try {
    factura.value = await facturasStore.updateInputs(factura.value.id, camposPlantilla.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar los datos'
  } finally {
    saving.value = false
  }
}

async function onGenerarPdf() {
  if (!factura.value?.plantilla_id) {
    error.value = 'Esta factura no tiene plantilla asignada'
    return
  }

  error.value = ''
  saving.value = true
  try {
    const plantilla = (await plantillasStore.fetchById(factura.value.plantilla_id)) as Plantilla
    factura.value = await facturasStore.updateInputs(factura.value.id, camposPlantilla.value)

    const blob = await generatePdf(plantilla.schema, [camposPlantilla.value])
    downloadPdf(blob, `${factura.value.cliente}-${factura.value.id.slice(0, 8)}.pdf`)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al generar el PDF'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="factura">
    <template v-if="!facturaId">
      <p class="factura__eyebrow">Nuevo talón</p>
      <h1>Nueva factura</h1>

      <form class="factura__panel ticket-card" @submit.prevent="onCrear">
        <label id="tour-campo-cliente" class="factura__field">
          <span>Cliente</span>
          <input v-model="cliente" type="text" required />
        </label>

        <label class="factura__field">
          <span>Concepto</span>
          <input v-model="concepto" type="text" required placeholder="Paquete vacacional" />
        </label>

        <label class="factura__field">
          <span>Monto total</span>
          <input v-model.number="montoTotal" type="number" step="0.01" required />
        </label>

        <label id="tour-select-plantilla" class="factura__field">
          <span>Plantilla (opcional)</span>
          <select v-model="plantillaId">
            <option value="">Sin plantilla</option>
            <option v-for="p in plantillasStore.plantillas" :key="p.id" :value="p.id">
              {{ p.nombre }}
            </option>
          </select>
        </label>

        <template v-if="camposManuales.length">
          <p class="factura__subhead">Datos de la plantilla</p>
          <PlantillaCampoInput
            v-for="field in camposManuales"
            :key="field.name"
            :field="field"
            :model-value="camposPlantilla[field.name] ?? ''"
            @update:model-value="camposPlantilla[field.name] = $event"
          />
        </template>

        <p v-if="error" class="factura__error">{{ error }}</p>

        <button id="tour-crear-factura" class="btn-primary" :disabled="saving" type="submit">
          {{ saving ? 'Creando...' : 'Crear factura' }}
        </button>
      </form>
    </template>

    <template v-else-if="factura">
      <div class="factura__hero ticket-card">
        <span
          class="stamp"
          :class="factura.estado === 'pagada' ? 'stamp--pagada' : 'stamp--pendiente'"
        >
          {{ factura.estado === 'pagada' ? 'Pagada' : 'Pendiente' }}
        </span>

        <p class="factura__eyebrow">{{ factura.concepto }}</p>
        <h1 class="factura__cliente">{{ factura.cliente }}</h1>

        <div class="factura__metrics">
          <div>
            <p class="factura__metric-label">Total</p>
            <p class="factura__metric-value">{{ factura.monto_total.toFixed(2) }}</p>
          </div>
          <div>
            <p class="factura__metric-label">Saldo</p>
            <p
              class="factura__metric-value"
              :class="saldo <= 0 ? 'factura__metric-value--pagada' : 'factura__metric-value--pendiente'"
            >
              {{ saldo.toFixed(2) }}
            </p>
          </div>
        </div>

        <div v-if="factura.plantilla_id" class="factura__hero-actions">
          <button
            v-if="!camposManuales.length"
            class="btn-primary"
            :disabled="saving"
            type="button"
            @click="onGenerarPdf"
          >
            {{ saving ? 'Generando...' : 'Generar PDF' }}
          </button>
        </div>

        <button class="factura__delete" type="button" @click="onEliminarFactura">
          Eliminar factura
        </button>
      </div>

      <template v-if="camposManuales.length">
        <form class="factura__panel ticket-card" @submit.prevent="onGenerarPdf">
          <p class="factura__subhead">Datos de la plantilla</p>
          <PlantillaCampoInput
            v-for="field in camposManuales"
            :key="field.name"
            :field="field"
            :model-value="camposPlantilla[field.name] ?? ''"
            @update:model-value="camposPlantilla[field.name] = $event"
          />

          <div class="factura__panel-actions">
            <button class="btn-ghost" :disabled="saving" type="button" @click="onGuardarDatos">
              Guardar datos
            </button>
            <button class="btn-primary" :disabled="saving" type="submit">
              {{ saving ? 'Generando...' : 'Guardar datos y generar PDF' }}
            </button>
          </div>
        </form>
      </template>

      <p v-if="error" class="factura__error">{{ error }}</p>

      <section class="factura__section">
        <p class="factura__subhead">Historial</p>
        <ul v-if="movimientos.length" class="factura__ledger">
          <li v-for="m in movimientos" :key="m.id" class="factura__ledger-row">
            <span class="factura__ledger-fecha">
              {{ new Date(m.created_at).toLocaleDateString() }}
            </span>
            <span class="factura__ledger-nota">
              <template v-if="m.metodo_pago">{{ m.metodo_pago }}</template>
              <template v-if="m.nota"> — {{ m.nota }}</template>
            </span>
            <span
              class="factura__ledger-monto"
              :class="m.monto < 0 ? 'factura__ledger-monto--abono' : 'factura__ledger-monto--cargo'"
            >
              {{ m.monto > 0 ? '+' : '' }}{{ m.monto.toFixed(2) }}
            </span>
          </li>
        </ul>
        <p v-else class="factura__empty">Sin movimientos todavía.</p>
      </section>

      <section class="factura__section">
        <p class="factura__subhead">Registrar movimiento</p>
        <form class="factura__panel ticket-card" @submit.prevent="onAgregarMovimiento">
          <label class="factura__field">
            <span>Tipo</span>
            <select v-model="nuevoTipo">
              <option value="abono">Abono (reduce saldo)</option>
              <option value="cargo">Cargo extra (aumenta saldo)</option>
            </select>
          </label>

          <label class="factura__field">
            <span>Monto</span>
            <input v-model.number="nuevoMonto" type="number" step="0.01" required />
          </label>

          <label class="factura__field">
            <span>Método de pago</span>
            <input v-model="metodoPago" type="text" placeholder="Transferencia" />
          </label>

          <label class="factura__field">
            <span>Nota</span>
            <input v-model="nota" type="text" />
          </label>

          <button class="btn-primary" :disabled="saving" type="submit">
            {{ saving ? 'Guardando...' : 'Registrar' }}
          </button>
        </form>
      </section>
    </template>
  </div>
</template>

<style scoped>
.factura {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.factura__eyebrow {
  margin: 0 0 var(--space-1);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.factura__subhead {
  margin: 0 0 var(--space-3);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink-soft);
}

.factura__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: 420px;
}

.factura__panel-actions {
  display: flex;
  gap: var(--space-3);
}

.factura__panel-actions .btn-primary {
  flex: 1;
}

.factura__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: 13px;
  font-weight: 500;
  color: var(--color-ink-soft);
}

.factura__field input,
.factura__field select {
  padding: 9px var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-sunken);
  font-size: 14px;
  color: var(--color-ink);
}

.factura__field input:focus-visible,
.factura__field select:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
}

.factura__error {
  color: var(--stamp-pendiente);
  font-size: 13px;
  margin: 0;
}

/* hero: la factura como boleto grande, sello flotando */
.factura__hero {
  position: relative;
  padding: var(--space-6) var(--space-6) var(--space-5);
}

.factura__hero .stamp {
  position: absolute;
  top: var(--space-5);
  right: var(--space-5);
}

.factura__cliente {
  font-size: 24px;
  font-weight: 600;
  max-width: 70%;
}

.factura__metrics {
  display: flex;
  gap: var(--space-8);
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px dashed var(--color-border);
}

.factura__metric-label {
  margin: 0 0 var(--space-1);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-ink-muted);
}

.factura__metric-value {
  margin: 0;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: 26px;
  font-weight: 600;
}

.factura__hero-actions:not(:empty) {
  margin-top: var(--space-5);
}

.factura__delete {
  display: block;
  margin-top: var(--space-5);
  background: transparent;
  border: none;
  padding: 0;
  color: var(--color-ink-muted);
  font-size: 12.5px;
  cursor: pointer;
}

.factura__delete:hover {
  color: var(--stamp-pendiente);
}

.factura__metric-value--pendiente {
  color: var(--stamp-pendiente);
}

.factura__metric-value--pagada {
  color: var(--stamp-pagada);
}

.factura__section {
  display: flex;
  flex-direction: column;
}

.factura__empty {
  color: var(--color-ink-muted);
  font-size: 13.5px;
  margin: 0;
}

.factura__ledger {
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: 560px;
}

.factura__ledger-row {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  gap: var(--space-4);
  align-items: baseline;
  padding: var(--space-2) 0;
  border-bottom: 1px dashed var(--color-border);
  font-size: 13px;
}

.factura__ledger-fecha {
  color: var(--color-ink-muted);
  font-size: 12px;
}

.factura__ledger-nota {
  color: var(--color-ink-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.factura__ledger-monto {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.factura__ledger-monto--abono {
  color: var(--stamp-pagada);
}

.factura__ledger-monto--cargo {
  color: var(--stamp-pendiente);
}

@media (max-width: 640px) {
  .factura__hero {
    padding: var(--space-5) var(--space-4) var(--space-4);
  }

  .factura__cliente {
    max-width: 60%;
    font-size: 20px;
  }

  .factura__hero .stamp {
    width: 52px;
    height: 52px;
    font-size: 9px;
    top: var(--space-4);
    right: var(--space-4);
  }

  .factura__metrics {
    gap: var(--space-6);
  }

  .factura__metric-value {
    font-size: 22px;
  }

  .factura__panel-actions {
    flex-direction: column;
  }

  .factura__ledger-row {
    grid-template-columns: 72px 1fr auto;
    gap: var(--space-2);
    font-size: 12px;
  }
}
</style>
