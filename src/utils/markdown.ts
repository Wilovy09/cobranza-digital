export interface MarkdownHeading {
  kind: 'heading'
  level: number
  text: string
}

export interface MarkdownParagraph {
  kind: 'paragraph'
  text: string
}

export interface MarkdownList {
  kind: 'list'
  ordered: boolean
  /** Cada item ya trae el prefijo `\t` por nivel de anidado, formato que espera el schema "list" de pdfme. */
  items: string[]
}

export type MarkdownBlock = MarkdownHeading | MarkdownParagraph | MarkdownList

/**
 * Subconjunto de Markdown que soportamos en los campos de plantilla:
 * headers (#, ##, ###) y listas ordenadas/desordenadas (con anidado por indentación).
 * Todo lo demás se trata como párrafo plano.
 */
export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.split(/\r\n|\r|\n/)
  const blocks: MarkdownBlock[] = []

  let paragraphLines: string[] = []
  let listItems: string[] = []
  let listOrdered = false
  let inList = false

  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push({ kind: 'paragraph', text: paragraphLines.join(' ').trim() })
      paragraphLines = []
    }
  }

  const flushList = () => {
    if (listItems.length) blocks.push({ kind: 'list', ordered: listOrdered, items: listItems })
    listItems = []
    inList = false
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ kind: 'heading', level: heading[1]!.length, text: heading[2]!.trim() })
      continue
    }

    const unordered = line.match(/^(\s*)[-*]\s+(.*)$/)
    const ordered = line.match(/^(\s*)\d+\.\s+(.*)$/)
    if (unordered || ordered) {
      flushParagraph()
      const isOrdered = Boolean(ordered)
      if (inList && listOrdered !== isOrdered) flushList()
      inList = true
      listOrdered = isOrdered

      const match = (unordered ?? ordered) as RegExpMatchArray
      const level = Math.floor(match[1]!.length / 2)
      listItems.push('\t'.repeat(level) + match[2]!.trim())
      continue
    }

    flushList()
    paragraphLines.push(line.trim())
  }

  flushParagraph()
  flushList()

  return blocks
}
