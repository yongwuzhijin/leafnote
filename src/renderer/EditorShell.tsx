import { useEffect, useMemo, useState } from 'react'
import { Eye, Pencil, X } from 'lucide-react'
import { extractFrontMatter, prependFrontMatter } from '../editor/markdown-frontmatter'
import type { CloseChoice } from '../shared/leafnote-api'
import type { LeafNoteLocale } from '../shared/locale'
import { message, type MessageKey } from '../shared/messages'
import { commandHint } from '../shared/shortcuts'
import { Tooltip } from './Tooltip'
import type { DocumentSession } from './document-session'
import { findInDocument } from './find-in-document'
import { FrontMatterBlock } from './FrontMatterBlock'
import { MarkdownPreviewView } from './preview-view'
import { RichEditor } from './RichEditor'
import { SourceEditor } from './SourceEditor'
import type { LeafNoteImageReader } from '../editor/create-leafnote-extensions'

const reasonKey: Record<Exclude<DocumentSession['reason'], null>, MessageKey> = {
  'html-or-jsx': 'unsupported-html',
  'reference-links': 'unsupported-reference-link',
  footnotes: 'unsupported-footnote',
  'too-large': 'unsupported-size'
}

export function EditorShell(props: {
  session: DocumentSession
  locale: LeafNoteLocale
  notice?: string | null
  readImage?: LeafNoteImageReader
  onInsertImage?: () => void
  onReady?: (editor: import('@tiptap/core').Editor) => void
  onCanonicalBody?: (body: string) => void
  onChange(text: string): void
  onMode(mode: 'edit' | 'preview'): void
  onClose(choice: CloseChoice | null): void
}) {
  const [draft, setDraft] = useState(props.session.buffer)
  const [query, setQuery] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  useEffect(() => {
    setDraft(props.session.buffer)
  }, [props.session.path, props.session.buffer, props.session.baseline])

  useEffect(() => {
    const open = () => {
      setFindOpen(true)
      window.setTimeout(() => document.getElementById('leafnote-find')?.focus(), 0)
    }
    document.addEventListener('leafnote-find', open)
    return () => document.removeEventListener('leafnote-find', open)
  }, [])

  const dirty = draft !== props.session.baseline
  const frontMatter = useMemo(() => extractFrontMatter(draft), [draft])
  const matches = findInDocument(draft, query)

  const publish = (text: string) => {
    setDraft(text)
    props.onChange(text)
  }

  return (
    <section className="editor-shell">
      <header className="editor-header">
        <div className="editor-view-toggle" role="group" aria-label={message(props.locale, 'edit')}>
          <Tooltip label={commandHint(message(props.locale, 'edit'), 'toggle-preview')}>
            <button type="button" aria-pressed={props.session.mode === 'edit'} aria-label={message(props.locale, 'edit')} onClick={() => props.onMode('edit')}>
              <Pencil size={13} />
            </button>
          </Tooltip>
          <Tooltip label={commandHint(message(props.locale, 'preview'), 'toggle-preview')}>
            <button type="button" aria-pressed={props.session.mode === 'preview'} aria-label={message(props.locale, 'preview')} onClick={() => props.onMode('preview')}>
              <Eye size={13} />
            </button>
          </Tooltip>
        </div>
        <div className="editor-header-text">
          <div className="editor-header-path editor-header-path--static">
            <span className="editor-header-path-file">{props.session.path ?? message(props.locale, 'untitled')}</span>
          </div>
        </div>
        {dirty ? (
          <span className="editor-dirty" aria-label={message(props.locale, 'unsaved')}>
            <span className="editor-dirty-dot" />
            {message(props.locale, 'unsaved')}
          </span>
        ) : null}
        <Tooltip label={commandHint(message(props.locale, 'close'), 'close')}>
          <button type="button" className="titlebar-icon-button titlebar-action" aria-label={message(props.locale, 'close')} onClick={() => props.onClose(null)}>
            <X size={16} />
          </button>
        </Tooltip>
      </header>
      {props.session.reason ? <p className="banner">{message(props.locale, reasonKey[props.session.reason])}</p> : null}
      {props.notice ? <p className="notice">{props.notice}</p> : null}
      <div className="editor-surface-frame">
        <div className="rich-markdown-search" data-open={findOpen ? 'true' : 'false'}>
          <div className="rich-markdown-search-field">
            <input
              id="leafnote-find"
              className="rich-markdown-search-input"
              role="searchbox"
              value={query}
              aria-label={message(props.locale, 'find')}
              placeholder={message(props.locale, 'find')}
              onFocus={() => setFindOpen(true)}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="rich-markdown-search-status">
              {query ? (matches.length === 0 ? message(props.locale, 'find-empty') : String(matches.length)) : ''}
            </span>
          </div>
          <button
            type="button"
            className="rich-markdown-search-button"
            aria-label={message(props.locale, 'close')}
            onClick={() => {
              setQuery('')
              setFindOpen(false)
            }}
          >
            ×
          </button>
        </div>
        <FrontMatterBlock raw={frontMatter?.raw ?? null} label={message(props.locale, 'front-matter')} />
        {props.session.mode === 'preview' ? (
          <MarkdownPreviewView markdown={draft} locale={props.locale} />
        ) : props.session.surface === 'source' ? (
          <SourceEditor value={draft} onChange={publish} />
        ) : (
          <RichEditor
            body={frontMatter ? frontMatter.body.replace(/^\n/, '') : draft}
            placeholder={message(props.locale, 'slash-placeholder')}
            locale={props.locale}
            readImage={props.readImage ?? (async () => ({ status: 'denied' }))}
            onPickImage={props.onInsertImage ?? (() => undefined)}
            onReady={props.onReady}
            onChange={(body) => {
              props.onCanonicalBody?.(body)
              const next = frontMatter ? prependFrontMatter(frontMatter.raw, body) : body
              publish(next)
            }}
          />
        )}
      </div>
    </section>
  )
}
