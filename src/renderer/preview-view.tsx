import { Info, Lightbulb, MessageSquareWarning, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Children, isValidElement, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import { MARKDOWN_PREVIEW_MAX_BYTES } from '../shared/limits'
import { message, type MessageKey } from '../shared/messages'
import type { LeafNoteLocale } from '../shared/locale'
import { MermaidBlock } from './mermaid-block'
import { previewRehypePlugins, previewRemarkPlugins } from './preview-markdown'

const CALLOUTS: Record<string, { icon: LucideIcon; color: string; zh: string; en: string }> = {
  note: { icon: Info, color: 'var(--callout-note)', zh: '注意', en: 'Note' },
  tip: { icon: Lightbulb, color: 'var(--status-success)', zh: '提示', en: 'Tip' },
  important: { icon: MessageSquareWarning, color: 'var(--callout-important)', zh: '重要', en: 'Important' },
  warning: { icon: TriangleAlert, color: 'var(--status-warning)', zh: '警告', en: 'Warning' },
  caution: { icon: OctagonAlert, color: 'var(--destructive)', zh: '危险', en: 'Caution' }
}

function calloutKind(node: { properties?: Record<string, unknown> } | undefined): string | null {
  const raw = node?.properties?.dataCallout ?? node?.properties?.dataCallout
  return typeof raw === 'string' ? raw.toLowerCase() : null
}

export function MarkdownPreviewView(props: { markdown: string; locale: LeafNoteLocale }) {
  if (new TextEncoder().encode(props.markdown).byteLength > MARKDOWN_PREVIEW_MAX_BYTES) {
    return <p className="banner">{message(props.locale, 'preview-too-large' as MessageKey)}</p>
  }
  return (
    <div className="markdown-preview markdown-light" aria-label={message(props.locale, 'read-only-preview')}>
      <div className="markdown-body">
        <Markdown
          remarkPlugins={previewRemarkPlugins}
          rehypePlugins={previewRehypePlugins}
          urlTransform={(url) => url}
          components={{
            input: (inputProps) => <input {...inputProps} disabled />,
            code: ({ className, children }) => {
              const source = String(children).replace(/\n$/, '')
              if (/\blanguage-mermaid\b/.test(className ?? '')) {
                return <MermaidBlock content={source.trimEnd()} />
              }
              return <code className={className}>{children}</code>
            },
            pre: ({ children }) => {
              const blocks = Children.toArray(children).filter(isValidElement)
              const mermaid = blocks.some((child) =>
                /\blanguage-mermaid\b/.test(String((child.props as { className?: string }).className ?? ''))
              )
              if (mermaid) {
                return <>{children}</>
              }
              return <pre>{children}</pre>
            },
            blockquote: ({ node, children }) => {
              const kind = calloutKind(node as { properties?: Record<string, unknown> })
              const presentation = kind ? CALLOUTS[kind] : undefined
              if (!presentation) {
                return <blockquote>{children}</blockquote>
              }
              const Icon = presentation.icon
              return (
                <div role="note" data-callout={kind} style={{ borderLeftColor: presentation.color }}>
                  <div className="callout-title" style={{ color: presentation.color }}>
                    <Icon size={14} aria-hidden />
                    {props.locale === 'zh' ? presentation.zh : presentation.en}
                  </div>
                  {children as ReactNode}
                </div>
              )
            }
          }}
        >
          {props.markdown}
        </Markdown>
      </div>
    </div>
  )
}
