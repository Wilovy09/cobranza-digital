import { getDefaultFont, type Font } from '@pdfme/common'

/**
 * "Arial" real es de Monotype y no se puede redistribuir. Arimo es el
 * sustituto libre (licencia SIL OFL) con las mismas métricas — mismo look,
 * mismo ancho de texto, sin problema de licencia.
 */
const ARIAL_FILES = {
  Arial: 'fonts/Arimo-Regular.ttf',
  'Arial Bold': 'fonts/Arimo-Bold.ttf',
  'Arial Italic': 'fonts/Arimo-Italic.ttf',
  'Arial Bold Italic': 'fonts/Arimo-BoldItalic.ttf',
} as const

let fontMapPromise: Promise<Font> | null = null

/** Fuentes disponibles en el Designer y al generar el PDF final (deben coincidir). */
export function getFontMap(): Promise<Font> {
  if (!fontMapPromise) fontMapPromise = loadFontMap()
  return fontMapPromise
}

async function loadFontMap(): Promise<Font> {
  const base = import.meta.env.BASE_URL

  const arial = await Promise.all(
    Object.entries(ARIAL_FILES).map(async ([name, path]) => {
      const res = await fetch(`${base}${path}`)
      const data = await res.arrayBuffer()
      return [name, { data }] as const
    }),
  )

  return {
    // Roboto se mantiene como fallback para no romper plantillas ya guardadas.
    ...getDefaultFont(),
    ...Object.fromEntries(arial),
  }
}
