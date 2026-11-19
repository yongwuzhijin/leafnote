import { extractFrontMatter } from './markdown-frontmatter'
import { getUtf8ByteLength } from './utf8-byte-limits'
import { RICH_MARKDOWN_MAX_SIZE_BYTES } from '../shared/limits'

export type EditSurface = 'rich' | 'source'
export type UnsupportedReason = 'html-or-jsx' | 'reference-links' | 'footnotes' | 'too-large' | null

const HTML_PATTERN = /<\/?[A-Za-z][\w.:-]*(?:\s[^<>]*)?\/?>/
const REFERENCE_LINK_PATTERN = /^\[[^\]]+\]:\s+\S+/m
const FOOTNOTE_PATTERN = /^\[\^[^\]]+\]:\s+/m

export function chooseEditSurface(
  content: string,
  roundTripOk: (body: string) => boolean
): { surface: EditSurface; reason: UnsupportedReason; frontMatter: string | null; body: string } {
  const extracted = extractFrontMatter(content)
  const frontMatter = extracted?.raw ?? null
  const body = extracted ? extracted.body.replace(/^\n/, '') : content
  if (getUtf8ByteLength(body) > RICH_MARKDOWN_MAX_SIZE_BYTES) {
    return { surface: 'source', reason: 'too-large', frontMatter, body }
  }
  const withoutCode = stripMarkdownCode(body)
  if (FOOTNOTE_PATTERN.test(withoutCode)) {
    return { surface: 'source', reason: 'footnotes', frontMatter, body }
  }
  if (REFERENCE_LINK_PATTERN.test(withoutCode)) {
    return { surface: 'source', reason: 'reference-links', frontMatter, body }
  }
  if (hasHtmlOutsideCode(withoutCode) && !roundTripOk(body)) {
    return { surface: 'source', reason: 'html-or-jsx', frontMatter, body }
  }
  return { surface: 'rich', reason: null, frontMatter, body }
}

function hasHtmlOutsideCode(content: string): boolean {
  return HTML_PATTERN.test(content)
}

export function stripMarkdownCode(content: string): string {
  let sanitized = ''
  let activeFence: '`' | '~' | null = null
  let lineStart = 0

  while (lineStart <= content.length) {
    const newlineIndex = content.indexOf('\n', lineStart)
    const index = newlineIndex === -1 ? content.length : newlineIndex
    const lineEnd = index > lineStart && content.charCodeAt(index - 1) === 13 ? index - 1 : index
    const line = content.slice(lineStart, lineEnd)
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/)
    if (fenceMatch?.[1]) {
      const fenceMarker = fenceMatch[1][0] as '`' | '~'
      activeFence = activeFence === fenceMarker ? null : fenceMarker
    } else if (!activeFence) {
      sanitized += line.replace(/`+[^`\n]*`+/g, '')
    }

    if (index < content.length) {
      sanitized += '\n'
    }
    lineStart = index + 1
  }

  return sanitized
}
