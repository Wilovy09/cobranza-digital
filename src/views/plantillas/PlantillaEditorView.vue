<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Designer } from '@pdfme/ui'
import { type Template } from '@pdfme/common'
import { usePlantillasStore } from '@/stores/plantillas'
import { CAMPOS_RESERVADOS_INFO, plugins } from '@/utils/pdf'
import { getFontMap } from '@/utils/fonts'
import { useTourStore } from '@/stores/tour'
import { destroyTour, onPlantillaGuardadaDuranteTour, runEditorTour } from '@/composables/useTour'

const route = useRoute()
const router = useRouter()
const store = usePlantillasStore()
const tourStore = useTourStore()

const plantillaId = route.params.id as string | undefined
const containerRef = ref<HTMLDivElement | null>(null)
const ayudaDialogRef = ref<HTMLDialogElement | null>(null)
const nombre = ref('')
const saving = ref(false)
const error = ref('')

// A4 en blanco con margen forzado de 1.5cm (15mm) a los 4 lados.
const defaultTemplate: Template = {
  basePdf: { width: 210, height: 297, padding: [15, 15, 15, 15] },
  schemas: [[]],
}

let designer: Designer | null = null

onMounted(async () => {
  let template = defaultTemplate

  if (plantillaId) {
    const plantilla = await store.fetchById(plantillaId)
    nombre.value = plantilla.nombre
    template = plantilla.schema
  }

  if (!containerRef.value) return

  const font = await getFontMap()

  designer = new Designer({
    domContainer: containerRef.value,
    template,
    plugins,
    options: { font },
  })

  if (tourStore.active && tourStore.segment === 'editor') {
    runEditorTour()
  }
})

onUnmounted(() => {
  designer?.destroy()
  destroyTour()
})

async function onSave() {
  if (!designer) return
  if (!nombre.value.trim()) {
    error.value = 'Ponle un nombre a la plantilla'
    return
  }

  error.value = ''
  saving.value = true
  try {
    const template = designer.getTemplate() as Template

    if (plantillaId) {
      await store.update(plantillaId, { nombre: nombre.value, schema: template })
    } else {
      await store.create(nombre.value, template)
    }

    onPlantillaGuardadaDuranteTour()
    router.push('/plantillas')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al guardar la plantilla'
  } finally {
    saving.value = false
  }
}

function onAbrirAyuda() {
  ayudaDialogRef.value?.showModal()
}
</script>

<template>
  <div class="editor">
    <div class="editor__toolbar">
      <input v-model="nombre" type="text" placeholder="Nombre de la plantilla" />
      <button class="btn-primary" :disabled="saving" @click="onSave">
        {{ saving ? 'Guardando...' : 'Guardar plantilla' }}
      </button>
      <button
        class="editor__help"
        type="button"
        title="Campos que se llenan solos"
        @click="onAbrirAyuda"
      >
        ?
      </button>
      <span v-if="error" class="editor__error">{{ error }}</span>
    </div>

    <div ref="containerRef" class="editor__canvas"></div>

    <dialog ref="ayudaDialogRef" class="modal">
      <div class="modal__panel">
        <p class="modal__eyebrow">Referencia</p>
        <h2>Campos que se llenan solos</h2>
        <p class="modal__hint">
          Usa uno de estos nombres como "Name" del campo de texto en el Designer —
          se llenará automático al crear/editar una factura, sin pedirlo de nuevo.
          Cualquier otro nombre queda como campo custom que tú llenas a mano.
        </p>

        <ul class="editor__slugs">
          <li v-for="c in CAMPOS_RESERVADOS_INFO" :key="c.slug" class="editor__slug-row">
            <code class="editor__slug">{{ c.slug }}</code>
            <span class="editor__slug-desc">{{ c.descripcion }}</span>
          </li>
        </ul>

        <div class="modal__actions">
          <button class="btn-primary" type="button" @click="ayudaDialogRef?.close()">
            Entendido
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.editor__toolbar input {
  flex: 1;
  padding: 9px var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-sunken);
  font-size: 14px;
  min-width: 160px;
}

.editor__toolbar input:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
}

.editor__error {
  color: var(--stamp-pendiente);
  font-size: 13px;
}

.editor__help {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-ink-muted);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.editor__help:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.editor__canvas {
  flex: 1;
  overflow: auto;
}

.editor__slugs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.editor__slug-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-sunken);
}

.editor__slug {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-accent);
  white-space: nowrap;
}

.editor__slug-desc {
  font-size: 12.5px;
  color: var(--color-ink-muted);
}
</style>
