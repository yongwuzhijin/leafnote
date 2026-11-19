import { Editor } from '@tiptap/core'
import { createLeafNoteExtensions } from './create-leafnote-extensions'
import { normalizeDetailsOpeningTag } from './copied/details-markdown-html'
import { encodeRawMarkdownHtmlForRichEditor } from './copied/raw-markdown-html'
import { createRichMarkdownEditorCodec } from './copied/rich-markdown-source-transport'
import { stripMarkdownCode } from './eligibility'

export function htmlRoundTripOk(body: string): boolean {
  try {
    const codec = createRichMarkdownEditorCodec()
    const encoded =
      body.length > 50_000
        ? encodeRawMarkdownHtmlForRichEditor(body, codec, { htmlSuperscriptLinks: false })
        : body
    if (body.length > 50_000 && hasHtmlFragment(stripMarkdownCode(encoded))) {
      return false
    }
    const editor = new Editor({
      extensions: createLeafNoteExtensions({
        readImage: async () => ({ status: 'denied' })
      }),
      content: encoded,
      contentType: 'markdown'
    })
    let output = ''
    try {
      output = editor.getMarkdown()
    } finally {
      editor.destroy()
    }
    return preservesEmbeddedHtml(stripMarkdownCode(body), output)
  } catch {
    return false
  }
}

function hasHtmlFragment(content: string): boolean {
  return /<\/?[A-Za-z][\w.:-]*(?:\s[^<>]*)?\/?>/.test(content)
}

function preservesEmbeddedHtml(contentWithoutCode: string, roundTripOutput: string): boolean {
  let searchIndex = 0
  for (const fragment of embeddedFragments(contentWithoutCode)) {
    const normalized = normalizeDetailsOpeningTag(fragment)
    const exactIndex = roundTripOutput.indexOf(fragment, searchIndex)
    const normalizedIndex = normalized === fragment ? -1 : roundTripOutput.indexOf(normalized, searchIndex)
    const useNormalized = normalizedIndex !== -1 && (exactIndex === -1 || normalizedIndex < exactIndex)
    const foundIndex = useNormalized ? normalizedIndex : exactIndex
    if (foundIndex === -1) {
      return false
    }
    searchIndex = foundIndex + (useNormalized ? normalized.length : fragment.length)
  }
  return true
}

function embeddedFragments(content: string): string[] {
  const fragments: string[] = []
  for (let index = 0; index < content.length; index += 1) {
    if (content.charCodeAt(index) !== 60) {
      continue
    }
    const end = content.indexOf('>', index)
    if (end === -1) {
      continue
    }
    fragments.push(content.slice(index, end + 1))
    index = end
  }
  return fragments
}
