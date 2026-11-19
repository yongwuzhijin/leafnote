import { extractFrontMatter, prependFrontMatter } from './markdown-frontmatter'
import { reconcileSerializedMarkdown, restoreMarkdownSourceEol } from './rich-markdown-source-reconcile'

export function assembleSaveText(input: {
  original: string
  surface: 'rich' | 'source'
  sourceBuffer: string
  editedCanonical: string | null
  baseCanonical: string
  roundTrip: (markdown: string) => string | null
}): { status: 'ok'; text: string; canonicalFallback: boolean } | { status: 'aborted' } {
  if (input.surface === 'source') {
    return { status: 'ok', text: input.sourceBuffer, canonicalFallback: false }
  }
  if (input.editedCanonical === null) {
    return { status: 'aborted' }
  }

  const extracted = extractFrontMatter(input.original)
  const body = extracted ? extracted.body : input.original
  let reconciled: string
  try {
    reconciled = reconcileSerializedMarkdown({
      originalSource: body,
      baseCanonical: input.baseCanonical,
      edited: input.editedCanonical,
      roundTrip: input.roundTrip
    })
  } catch {
    reconciled = restoreMarkdownSourceEol(input.editedCanonical, body)
  }
  const canonical = restoreMarkdownSourceEol(input.editedCanonical, body)
  const semanticChange = toLf(input.editedCanonical) !== toLf(input.baseCanonical)
  const text = extracted ? prependFrontMatter(extracted.raw, reconciled) : reconciled
  return {
    status: 'ok',
    text,
    canonicalFallback: semanticChange && reconciled === canonical
  }
}

function toLf(value: string): string {
  return value.replace(/\r\n/g, '\n')
}
