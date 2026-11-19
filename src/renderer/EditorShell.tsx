import { useEffect, useMemo, useState } from 'react'
import { extractFrontMatter, prependFrontMatter } from '../editor/markdown-frontmatter'
import type { CloseChoice } from '../shared/leafnote-api'
import type { LeafNoteLocale } from '../shared/locale'
import { message, type MessageKey } from '../shared/messages'
import type { DocumentSession } from './document-session'
import { findInDocument } from './find-in-document'
import { FrontMatterBlock } from './FrontMatterBlock'
import { renderPreview } from './preview-markdown'
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
  onChange(text: string): void
  onMode(mode: 'edit' | 'preview'): void
  onClose(choice: CloseChoice | null): void
}) {
  const [draft, setDraft] = useState(props.session.buffer)
  const [query, setQuery] = useState('')
  useEffect(() => {
    setDraft(props.session.buffer)
  }, [props.session.path, props.session.buffer, props.session.baseline])

  const dirty = draft !== props.session.baseline
  const frontMatter = useMemo(() => extractFrontMatter(draft), [draft])
  const matches = findInDocument(draft, query)
  const preview = props.session.mode === 'preview' ? renderPreview(draft) : null

  const publish = (text: string) => {
    setDraft(text)
    props.onChange(text)
  }

  return (
    <section className="editor-shell">
      <header className="editor-toolbar">
        <div className="mode-switch">
          <button type="button" aria-pressed={props.session.mode === 'edit'} onClick={() => props.onMode('edit')}>
            {message(props.locale, 'edit')}
          </button>
          <button type="button" aria-pressed={props.session.mode === 'preview'} onClick={() => props.onMode('preview')}>
            {message(props.locale, 'preview')}
          </button>
        </div>
        <span className="document-path">{props.session.path ?? message(props.locale, 'untitled')}</span>
        {dirty ? <span aria-label={message(props.locale, 'unsaved')}>{message(props.locale, 'unsaved')}</span> : null}
        <button type="button" onClick={() => props.onClose(null)}>
          {message(props.locale, 'close')}
        </button>
      </header>
      {props.session.reason ? <p className="banner">{message(props.locale, reasonKey[props.session.reason])}</p> : null}
      {props.notice ? <p className="notice">{props.notice}</p> : null}
      <label className="find-row">
        {message(props.locale, 'find')}
        <input
          role="searchbox"
          value={query}
          aria-label={message(props.locale, 'find')}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span>{query ? (matches.length === 0 ? message(props.locale, 'find-empty') : String(matches.length)) : ''}</span>
      </label>
      <FrontMatterBlock raw={frontMatter?.raw ?? null} label={message(props.locale, 'front-matter')} />
      {props.session.mode === 'preview' ? (
        <div className="preview" aria-label={message(props.locale, 'read-only-preview')}>
          {preview?.status === 'too-large' ? (
            <p>{message(props.locale, 'preview-too-large')}</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: preview?.status === 'ok' ? preview.html : '' }} />
          )}
        </div>
      ) : props.session.surface === 'source' ? (
        <SourceEditor value={draft} onChange={publish} />
      ) : (
        <RichEditor
          body={frontMatter ? frontMatter.body.replace(/^\n/, '') : draft}
          placeholder={message(props.locale, 'slash-placeholder')}
          readImage={props.readImage ?? (async () => ({ status: 'denied' }))}
          onPickImage={props.onInsertImage ?? (() => undefined)}
          onChange={(body) => {
            const next = frontMatter ? prependFrontMatter(frontMatter.raw, body) : body
            publish(next)
          }}
        />
      )}
    </section>
  )
}
