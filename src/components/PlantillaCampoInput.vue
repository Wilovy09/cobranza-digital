<script setup lang="ts">
import { computed } from 'vue'
import {
  isMarkdownField,
  parseTableRows,
  readImageAsDataUrl,
  serializeTableRows,
  type PlantillaField,
} from '@/utils/pdf'

const props = defineProps<{
  field: PlantillaField
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const columnCount = computed(() => props.field.head?.length ?? 1)

const rows = computed(() => parseTableRows(props.modelValue, columnCount.value))

function onCelda(rowIdx: number, colIdx: number, value: string) {
  const next = rows.value.map((row) => [...row])
  const row = next[rowIdx]
  if (!row) return
  row[colIdx] = value
  emit('update:modelValue', serializeTableRows(next))
}

function onAgregarFila() {
  const next = [...rows.value.map((row) => [...row]), Array.from({ length: columnCount.value }, () => '')]
  emit('update:modelValue', serializeTableRows(next))
}

function onEliminarFila(rowIdx: number) {
  const next = rows.value.filter((_, i) => i !== rowIdx)
  emit('update:modelValue', serializeTableRows(next))
}

async function onImagenChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  emit('update:modelValue', await readImageAsDataUrl(file))
}
</script>

<template>
  <div class="campo">
    <label v-if="field.type === 'text' && isMarkdownField(field.name)" class="campo__label">
      <span>{{ field.name }} (Markdown: #, ##, -, 1.)</span>
      <textarea
        :value="modelValue"
        rows="6"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />
    </label>

    <label v-else-if="field.type === 'text'" class="campo__label">
      <span>{{ field.name }}</span>
      <input
        :value="modelValue"
        type="text"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </label>

    <label v-else-if="field.type === 'image'" class="campo__label">
      <span>{{ field.name }}</span>
      <input type="file" accept="image/*" @change="onImagenChange" />
    </label>

    <div v-else-if="field.type === 'table'" class="campo__tabla">
      <span class="campo__tabla-label">{{ field.name }}</span>
      <div class="campo__tabla-scroll">
        <table>
          <thead v-if="field.head">
            <tr>
              <th v-for="col in field.head" :key="col">{{ col }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIdx) in rows" :key="rowIdx">
              <td v-for="(cell, colIdx) in row" :key="colIdx">
                <input
                  :value="cell"
                  type="text"
                  @input="onCelda(rowIdx, colIdx, ($event.target as HTMLInputElement).value)"
                />
              </td>
              <td class="campo__tabla-quitar">
                <button type="button" @click="onEliminarFila(rowIdx)">Quitar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button type="button" class="btn-ghost campo__tabla-agregar" @click="onAgregarFila">
        Agregar fila
      </button>
    </div>
  </div>
</template>

<style scoped>
.campo {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: 13px;
}

.campo__label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-weight: 500;
  color: var(--color-ink-soft);
}

.campo input[type='text'],
.campo input[type='file'],
.campo textarea {
  padding: 9px var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-sunken);
  font-size: 14px;
  color: var(--color-ink);
  font-family: inherit;
  resize: vertical;
}

.campo input[type='text']:focus-visible,
.campo textarea:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
}

.campo__tabla-label {
  display: block;
  font-weight: 500;
  color: var(--color-ink-soft);
  margin-bottom: var(--space-2);
}

.campo__tabla-scroll {
  overflow-x: auto;
  margin-bottom: var(--space-2);
}

.campo__tabla table {
  border-collapse: collapse;
  width: 100%;
  min-width: 320px;
}

.campo__tabla th,
.campo__tabla td {
  border: 1px solid var(--color-border);
  padding: var(--space-1) var(--space-2);
}

.campo__tabla th {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-ink-muted);
  text-align: left;
}

.campo__tabla input[type='text'] {
  width: 100%;
  border: none;
  background: transparent;
  padding: var(--space-1);
}

.campo__tabla-quitar {
  width: 1%;
  white-space: nowrap;
}

.campo__tabla-quitar button {
  background: transparent;
  border: none;
  color: var(--color-ink-muted);
  font-size: 12px;
  cursor: pointer;
}

.campo__tabla-quitar button:hover {
  color: var(--stamp-pendiente);
}

.campo__tabla-agregar {
  padding: 6px var(--space-3);
  font-size: 12.5px;
}
</style>
