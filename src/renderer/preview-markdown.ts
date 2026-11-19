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
import type { Blockquote, Nodes, Root } from 'mdast'
import { MARKDOWN_PREVIEW_MAX_BYTES } from '../shared/limits'

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

export function renderPreview(markdown: string): { status: 'ok'; html: string } | { status: 'too-large' } {
  if (new TextEncoder().encode(markdown).byteLength > MARKDOWN_PREVIEW_MAX_BYTES) {
    return { status: 'too-large' }
  }
  const html = renderToStaticMarkup(
    createElement(
      Markdown,
      {
        remarkPlugins: [
          remarkGfm,
          remarkCjkFriendly,
          remarkLeafNoteCallouts,
          remarkBreaks,
          remarkFrontmatter,
          remarkMath
        ],
        rehypePlugins: [
          rehypeRaw,
          [rehypeSanitize, previewSchema],
          rehypeSlug,
          rehypeHighlight,
          rehypeKatex
        ],
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

function remarkLeafNoteCallouts(): (tree: Root) => void {
  return (tree) => {
    visit(tree)
  }
}

function visit(node: Nodes): void {
  if ('children' in node) {
    node.children.forEach(visit)
  }
  if (node.type === 'blockquote') {
    markCallout(node)
  }
}

function markCallout(node: Blockquote): void {
  const paragraph = node.children[0]
  if (paragraph?.type !== 'paragraph') {
    return
  }
  const text = paragraph.children[0]
  if (text?.type !== 'text') {
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
  } else if (match[0].endsWith('\n') || paragraph.children.length === 1) {
    paragraph.children.shift()
    if (paragraph.children.length === 0) {
      node.children.shift()
    }
  } else {
    return
  }
  node.data = {
    ...node.data,
    hProperties: { ...node.data?.hProperties, dataCallout: kind.toUpperCase() }
  }
}
