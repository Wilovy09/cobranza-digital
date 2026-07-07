import { generate } from '@pdfme/generator'
import { text, image, table, list } from '@pdfme/schemas'
import type { Template } from '@pdfme/common'

type TemplateSchema = Template['schemas'][number][number]
import { getFontMap } from '@/utils/fonts'
import { parseMarkdownBlocks } from '@/utils/markdown'

export const plugins = { Text: text, Image: image, Table: table, List: list }

/** Un campo de texto se trata como Markdown (headers "#", listas "-"/"1.") si su nombre lo indica. */
export function isMarkdownField(name: string): boolean {
  return name.replace(/[{}]/g, '').toLowerCase().includes('markdown')
}

export interface PlantillaField {
  name: string
  type: string
  content: string
  /** Solo para tablas: nombres de columnas, fijos (no se agregan/quitan al llenar). */
  head?: string[]
  /** "No editable" en el Designer de PDFME. Ver nota en `resolveReadOnlyFields`. */
  readOnly?: boolean
}

/** Campos custom (texto/imagen/tabla) definidos en la plantilla, para pedírselos al usuario. */
export function getPlantillaFields(template: Template): PlantillaField[] {
  const fields = new Map<string, PlantillaField>()

  for (const page of template.schemas) {
    for (const schema of page) {
      // "readOnly" en PDFME es solo "no editable dentro del PDF final": el
      // campo sigue necesitando un valor para no quedar en blanco al generar.
      const head = (schema as unknown as { head?: unknown }).head
      fields.set(schema.name, {
        name: schema.name,
        type: schema.type,
        content: typeof schema.content === 'string' ? schema.content : '',
        head: Array.isArray(head) ? (head as string[]) : undefined,
        readOnly: Boolean(schema.readOnly),
      })
    }
  }

  return [...fields.values()]
}

export type CampoReservado =
  | 'cliente'
  | 'concepto'
  | 'monto_total'
  | 'saldo'
  | 'fecha'
  | 'historial'

/**
 * Si el nombre del campo de la plantilla contiene una de estas palabras
 * (sin importar mayúsculas, guiones o llaves como en "{cliente_nombre}"),
 * se llena automático con el dato ya capturado en la factura, sin pedirlo
 * de nuevo en el formulario.
 */
export function matchCampoReservado(name: string): CampoReservado | null {
  const n = name.replace(/[{}]/g, '').toLowerCase()
  if (n.includes('cliente')) return 'cliente'
  if (n.includes('concepto')) return 'concepto'
  if (n.includes('saldo')) return 'saldo'
  if (n.includes('monto') || n.includes('total')) return 'monto_total'
  if (n.includes('historial')) return 'historial'
  if (n.includes('fecha')) return 'fecha'
  return null
}

/** Referencia para el usuario: qué escribir como "Name" del campo en el Designer. */
export const CAMPOS_RESERVADOS_INFO: { slug: string; descripcion: string }[] = [
  { slug: '{cliente}', descripcion: 'Nombre del cliente' },
  { slug: '{concepto}', descripcion: 'Concepto de la factura' },
  { slug: '{total}', descripcion: 'Monto total de la factura' },
  { slug: '{saldo}', descripcion: 'Saldo pendiente actual' },
  { slug: '{fecha}', descripcion: 'Fecha en que se genera el PDF' },
  {
    slug: '{historial}',
    descripcion:
      'Tabla con todos los movimientos (debe ser tipo Tabla, columnas en este orden: Fecha | Método de pago | Monto | Descripción)',
  },
  {
    slug: '{algo_markdown}',
    descripcion:
      'Campo de Texto cuyo valor se escribe en Markdown (headers #, ##, ### y listas -/1.). Al generar el PDF se expande en varios bloques reales que crecen solos y empujan lo de abajo, como la tabla de historial',
  },
]

export function parseTableRows(content: string, columnCount: number): string[][] {
  try {
    const rows = JSON.parse(content)
    if (Array.isArray(rows)) return rows
  } catch {
    // contenido vacío o inválido, se cae al default de abajo
  }
  return [Array.from({ length: columnCount }, () => '')]
}

export function serializeTableRows(rows: string[][]): string {
  return JSON.stringify(rows)
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Los campos marcados "no editable" en el Designer ignoran el input y usan
 * su `content` de diseño (@pdfme/generator los trata como texto estático con
 * placeholders). Para que nuestros slugs funcionen sin importar ese flag,
 * "horneamos" el valor directo en `content` antes de generar.
 */
function resolveReadOnlyFields(template: Template, values: Record<string, string>): Template {
  return {
    ...template,
    schemas: template.schemas.map((page) =>
      page.map((schema) =>
        schema.readOnly && schema.name in values
          ? { ...schema, content: values[schema.name] }
          : schema,
      ),
    ),
  }
}

const HEADING_FONT_SIZES: Record<number, number> = { 1: 16, 2: 14, 3: 12.5 }
const BLOQUE_GAP_MM = 2

/**
 * Convierte el Markdown escrito por el usuario en varios schemas reales de pdfme
 * (Text para headers/párrafos, List para listas), apilados desde la posición del
 * campo original. Text con `overflow: 'expand'` y List crecen solos y empujan lo
 * de abajo (o pasan de hoja) — motor nativo de pdfme, no algo que calculemos aquí.
 */
function markdownFieldToSchemas(schema: TemplateSchema, content: string): TemplateSchema[] {
  const blocks = parseMarkdownBlocks(content)
  if (!blocks.length) return [{ ...schema, content: '' }]

  let y = schema.position.y
  return blocks.map((block, i) => {
    const base = { ...schema, name: `${schema.name}__md_${i}` }
    const position = { ...schema.position, y }

    if (block.kind === 'heading') {
      const height = 8
      y += height + BLOQUE_GAP_MM
      return {
        ...base,
        content: block.text,
        position,
        height,
        fontSize: HEADING_FONT_SIZES[block.level] ?? 13,
        fontName: 'Arial Bold',
        overflow: 'expand',
      } as TemplateSchema
    }

    if (block.kind === 'list') {
      const height = Math.max(block.items.length, 1) * 6
      y += height + BLOQUE_GAP_MM
      return {
        ...base,
        type: 'list',
        content: JSON.stringify(block.items),
        position,
        height,
        listStyle: block.ordered ? 'ordered' : 'bullet',
      } as TemplateSchema
    }

    const height = 6
    y += height + BLOQUE_GAP_MM
    return { ...base, content: block.text, position, height, overflow: 'expand' } as TemplateSchema
  })
}

/** Reemplaza cada campo de texto marcado como Markdown por sus bloques reales antes de generar. */
function expandMarkdownFields(
  template: Template,
  values: Record<string, string>,
): { template: Template; values: Record<string, string> } {
  const nextValues = { ...values }

  const schemas = template.schemas.map((page) => {
    let huboMarkdown = false

    const expanded = page.flatMap((schema) => {
      if (schema.type !== 'text' || !isMarkdownField(schema.name)) return [schema]
      huboMarkdown = true

      const content = values[schema.name] ?? ''
      delete nextValues[schema.name]

      const fragments = markdownFieldToSchemas(schema, content)
      for (const fragment of fragments) nextValues[fragment.name] = fragment.content ?? ''
      return fragments
    })

    if (!huboMarkdown) return expanded

    // El "empuje" de pdfme al crecer un schema dinámico corre en el orden del
    // arreglo, no por posición visual: si un campo agregado antes en el Designer
    // (p. ej. la tabla de historial) quedó dibujado más abajo en la hoja que el
    // Markdown, hay que reordenar por Y para que el empuje lo alcance.
    return [...expanded].sort((a, b) => a.position.y - b.position.y)
  })

  return { template: { ...template, schemas }, values: nextValues }
}

export async function generatePdf(template: Template, inputs: Record<string, string>[]) {
  const resolved = resolveReadOnlyFields(template, inputs[0] ?? {})
  const { template: expanded, values } = expandMarkdownFields(resolved, inputs[0] ?? {})
  const font = await getFontMap()
  const pdf = await generate({ template: expanded, inputs: [values], plugins, options: { font } })
  return new Blob([pdf], { type: 'application/pdf' })
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
