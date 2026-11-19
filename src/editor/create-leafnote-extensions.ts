import { Code } from '@tiptap/extension-code'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import Placeholder from '@tiptap/extension-placeholder'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import TaskItem from '@tiptap/extension-task-item'
import type { AnyExtension, Editor } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import { common, createLowlight } from 'lowlight'
import type { ImageReadResult } from '../shared/leafnote-api'
import { classifyImageSrc } from '../renderer/image-display'
import { DragSelectionGuard } from './copied/drag-selection-guard'
import { createMarkdownTokenizerStart } from './copied/markdown-tokenizer-start'
import {
  createRawMarkdownHtmlBlock,
  createRawMarkdownHtmlInline,
  createRichMarkdownLiteral
} from './copied/raw-markdown-html-nodes'
import { createLeafNoteDetailsExtensions } from './copied/rich-markdown-details-extension'
import { createRichMarkdownExtension } from './copied/rich-markdown-extension'
import { RichMarkdownCodeBlockLowlight } from './copied/rich-markdown-lowlight'
import { createCachedLowlight } from './copied/rich-markdown-lowlight-cache'
import { RichMarkdownOrderedList } from './copied/rich-markdown-ordered-list'
import { RichMarkdownParagraph } from './copied/rich-markdown-paragraph'
import { createRichMarkdownEditorCodec } from './copied/rich-markdown-source-transport'
import { RichMarkdownTable } from './copied/rich-markdown-table'
import { RichMarkdownTaskList } from './copied/rich-markdown-task-list'
import { RichMarkdownTrailingParagraph } from './copied/rich-markdown-trailing-paragraph'

export type LeafNoteImageReader = (src: string) => Promise<ImageReadResult>

export type LeafNoteSlashId =
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'quote'
  | 'ordered-list'
  | 'bullet-list'
  | 'task-list'
  | 'paragraph'
  | 'toggle'
  | 'code-block'
  | 'divider'
  | 'table'
  | 'image'
  | 'inline-math'
  | 'math-block'
  | 'mermaid-fence'

const MERMAID_FENCE = 'graph TD\n  A[Start] --> B[End]'
const lowlight = createCachedLowlight(createLowlight(common))

const RichMarkdownCode = Code.extend({
  excludes: 'code bold italic strike underline'
})

export function createLeafNoteExtensions(input: {
  readImage: LeafNoteImageReader
  onPickImage?: () => void
  placeholder?: string
}): AnyExtension[] {
  const codec = createRichMarkdownEditorCodec()
  return [
    StarterKit.configure({
      link: false,
      code: false,
      codeBlock: false,
      orderedList: false,
      paragraph: false,
      trailingNode: false
    }),
    RichMarkdownParagraph,
    RichMarkdownTrailingParagraph,
    RichMarkdownCode,
    RichMarkdownCodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: null
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true
    }),
    Image.extend({
      addNodeView() {
        return ({ node, HTMLAttributes }) => {
          const dom = document.createElement('span')
          dom.style.display = 'inline-block'
          dom.style.lineHeight = '0'
          dom.style.maxWidth = '100%'
          const img = document.createElement('img')
          img.draggable = false
          for (const [key, value] of Object.entries(HTMLAttributes)) {
            if (key !== 'src' && value != null && value !== false) {
              img.setAttribute(key, String(value))
            }
          }
          dom.appendChild(img)
          let currentSrc = node.attrs.src as string | undefined
          const show = (src: string | undefined): void => {
            if (!src) {
              img.removeAttribute('src')
              img.alt = HTMLAttributes.alt ? String(HTMLAttributes.alt) : ''
              return
            }
            void loadLeafNoteImage(src, input.readImage).then((url) => {
              if (currentSrc !== src) {
                return
              }
              if (!url) {
                img.removeAttribute('src')
                return
              }
              img.src = url
            })
          }
          show(currentSrc)
          return {
            dom,
            update: (updated) => {
              if (updated.type.name !== 'image') {
                return false
              }
              const nextSrc = updated.attrs.src as string | undefined
              if (nextSrc !== currentSrc) {
                currentSrc = nextSrc
                show(nextSrc)
              }
              return true
            }
          }
        }
      }
    }).configure({
      allowBase64: true,
      inline: true
    }),
    RichMarkdownOrderedList,
    RichMarkdownTaskList,
    TaskItem.configure({ nested: true }),
    ...createLeafNoteDetailsExtensions(),
    RichMarkdownTable.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    InlineMath.configure({ katexOptions: { throwOnError: false } }),
    BlockMath.extend({
      markdownTokenizer:
        BlockMath.config.markdownTokenizer && typeof BlockMath.config.markdownTokenizer !== 'function'
          ? {
              ...BlockMath.config.markdownTokenizer,
              start: createMarkdownTokenizerStart('$$')
            }
          : BlockMath.config.markdownTokenizer
    }).configure({
      katexOptions: { displayMode: true, throwOnError: false }
    }),
    createRichMarkdownLiteral(codec.transport),
    createRawMarkdownHtmlInline(codec.transport),
    createRawMarkdownHtmlBlock(codec.transport),
    DragSelectionGuard,
    createRichMarkdownExtension(codec, false).configure({
      marked: codec.marked,
      markedOptions: { gfm: true }
    }),
    Placeholder.configure({
      placeholder: input.placeholder ?? '写 Markdown… 输入 / 插入块'
    })
  ]
}

export async function loadLeafNoteImage(src: string, readImage: LeafNoteImageReader): Promise<string | null> {
  if (/^https?:/i.test(src)) {
    return null
  }
  const classified = classifyImageSrc(src)
  if (classified.kind === 'remote' || classified.kind === 'data-too-large') {
    return null
  }
  if (classified.kind === 'data') {
    return blobUrl(classified.bytes, classified.mimeType)
  }
  const result = await readImage(src)
  if (result.status !== 'ok') {
    return null
  }
  return blobUrl(result.bytes, result.mimeType)
}

export function runSlashCommand(editor: Editor, id: LeafNoteSlashId, onPickImage?: () => void): void {
  const chain = editor.chain().focus()
  switch (id) {
    case 'heading-1':
      chain.setHeading({ level: 1 }).run()
      return
    case 'heading-2':
      chain.setHeading({ level: 2 }).run()
      return
    case 'heading-3':
      chain.setHeading({ level: 3 }).run()
      return
    case 'quote':
      chain.toggleBlockquote().run()
      return
    case 'ordered-list':
      chain.toggleOrderedList().run()
      return
    case 'bullet-list':
      chain.toggleBulletList().run()
      return
    case 'task-list':
      chain.toggleTaskList().run()
      return
    case 'paragraph':
      chain.setParagraph().run()
      return
    case 'toggle':
      insertToggle(editor)
      return
    case 'code-block':
      chain.setCodeBlock().run()
      return
    case 'divider':
      chain.setHorizontalRule().run()
      return
    case 'table':
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      return
    case 'image':
      onPickImage?.()
      return
    case 'inline-math':
      chain.insertContent({ type: 'inlineMath', attrs: { latex: 'x' } }).run()
      return
    case 'math-block':
      chain.insertContent({ type: 'blockMath', attrs: { latex: 'E=mc^2' } }).run()
      return
    case 'mermaid-fence':
      insertMermaidFence(editor)
      return
    default:
      return
  }
}

function insertToggle(editor: Editor): void {
  const insertAt = editor.state.selection.from
  editor
    .chain()
    .focus()
    .insertContentAt(insertAt, {
      type: 'details',
      attrs: { open: true },
      content: [
        { type: 'detailsSummary' },
        { type: 'detailsContent', content: [{ type: 'paragraph' }] }
      ]
    })
    .run()
}

function insertMermaidFence(editor: Editor): void {
  editor.commands.command(({ state, dispatch }) => {
    const codeBlock = state.schema.nodes.codeBlock
    if (!codeBlock) {
      return false
    }
    const node = codeBlock.create({ language: 'mermaid' }, state.schema.text(MERMAID_FENCE))
    const tr = state.tr.insert(state.doc.content.size, node)
    const cursor = tr.selection.from
    tr.setSelection(TextSelection.create(tr.doc, Math.min(cursor, tr.doc.content.size)))
    dispatch?.(tr.scrollIntoView())
    return true
  })
}

function blobUrl(bytes: Uint8Array, mimeType: string): string {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy], { type: mimeType })
  return URL.createObjectURL(blob)
}
