import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema, type Options as SanitizeOptions } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import remarkBreaks from 'remark-breaks'
import remarkCjkFriendly from 'remark-cjk-friendly/parseOnly'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MARKDOWN_PREVIEW_MAX_BYTES } from '../shared/limits'

type MarkdownNode = {
  type: string
  value?: string
  children?: MarkdownNode[]
  data?: { hProperties?: Record<string, unknown> }
}

const CALLOUT_KINDS = ['note', 'tip', 'important', 'warning', 'caution'] as const
const CALLOUT_MARKER = /^\[!([a-z]+)\](?:\r?\n|$)/i

const previewSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'details', 'summary', 'kbd', 'sub', 'sup', 'ins'],
  protocols: {
    ...defaultSchema.protocols,
    href: ['http', 'https', 'mailto'],
    src: ['blob', 'data']
  },
  attributes: {
    ...defaultSchema.attributes,
    blockquote: [
      ...(defaultSchema.attributes?.blockquote ?? []),
      ['dataCallout', 'NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']
    ],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ['className', /^language-[\w-]+$/, 'math-inline', 'math-display']
    ],
    details: [...(defaultSchema.attributes?.details ?? []), 'open', ['className', 'leafnote-details']],
    input: [...(defaultSchema.attributes?.input ?? []), 'type', 'checked', 'disabled'],
    span: [...(defaultSchema.attributes?.span ?? []), ['className', /^hljs(?:-[\w-]+)?$/]]
  }
}

export const previewRemarkPlugins = [
  remarkGfm,
  remarkCjkFriendly,
  remarkLeafNoteCallouts,
  remarkBreaks,
  remarkFrontmatter,
  remarkMath
]

export const previewRehypePlugins = [
  rehypeRaw,
  [rehypeSanitize, previewSchema] as [typeof rehypeSanitize, SanitizeOptions],
  rehypeSlug,
  rehypeHighlight,
  rehypeKatex
]

export function renderPreview(markdown: string): { status: 'ok'; html: string } | { status: 'too-large' } {
  if (new TextEncoder().encode(markdown).byteLength > MARKDOWN_PREVIEW_MAX_BYTES) {
    return { status: 'too-large' }
  }
  const html = renderToStaticMarkup(
    createElement(
      Markdown,
      {
        remarkPlugins: previewRemarkPlugins,
        rehypePlugins: previewRehypePlugins,
        urlTransform: (url) => url,
        components: {
          input: (props: ComponentProps<'input'>) => createElement('input', { ...props, disabled: true })
        }
      },
      markdown
    )
  )
  return { status: 'ok', html }
}

function remarkLeafNoteCallouts(): (tree: MarkdownNode) => void {
  return (tree) => {
    visit(tree)
  }
}

function visit(node: MarkdownNode): void {
  for (const child of node.children ?? []) {
    visit(child)
  }
  if (node.type === 'blockquote') {
    markCallout(node)
  }
}

function markCallout(node: MarkdownNode): void {
  const children = node.children ?? []
  const paragraph = children[0]
  const paragraphChildren = paragraph?.children ?? []
  const text = paragraphChildren[0]
  if (paragraph?.type !== 'paragraph' || text?.type !== 'text' || text.value === undefined) {
    return
  }
  const match = CALLOUT_MARKER.exec(text.value)
  const kind = CALLOUT_KINDS.find((candidate) => candidate === match?.[1]?.toLowerCase())
  if (!match || !kind) {
    return
  }
  const remainder = text.value.slice(match[0].length)
  if (remainder) {
    text.value = remainder
  } else if (match[0].endsWith('\n') || paragraphChildren.length === 1) {
    paragraphChildren.shift()
    if (paragraphChildren.length === 0) {
      children.shift()
    }
  } else {
    return
  }
  node.data = {
    ...node.data,
    hProperties: { ...node.data?.hProperties, dataCallout: kind.toUpperCase() }
  }
}
