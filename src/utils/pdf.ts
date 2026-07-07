import { generate } from '@pdfme/generator'
import { text, image, table } from '@pdfme/schemas'
import type { Template } from '@pdfme/common'
import { getFontMap } from '@/utils/fonts'

export const plugins = { Text: text, Image: image, Table: table }

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

export async function generatePdf(template: Template, inputs: Record<string, string>[]) {
  const resolved = resolveReadOnlyFields(template, inputs[0] ?? {})
  const font = await getFontMap()
  const pdf = await generate({ template: resolved, inputs, plugins, options: { font } })
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
