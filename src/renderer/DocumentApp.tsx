import { Editor } from '@tiptap/core'
import { FileOutput, FilePlus, FolderOpen, Save } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import leafLogo from '../../build/icon.png'
import { createLeafNoteExtensions } from '../editor/create-leafnote-extensions'
import { htmlRoundTripOk } from '../editor/html-round-trip'
import { assembleSaveText } from '../editor/save-bytes'
import type { FileStamp, MenuCommand, OpenDocumentResult } from '../shared/leafnote-api'
import { chooseLocale, type LeafNoteLocale } from '../shared/locale'
import { message } from '../shared/messages'
import { commandHint } from '../shared/shortcuts'
import { EditorShell } from './EditorShell'
import { isDirty, openSession, withMode, type DocumentSession } from './document-session'
import { createNewDocument } from './new-document'
import { editedCanonicalForSave } from './preview-save'
import { bindStartupOpen } from './startup-open'
import './leafnote-window'

type Status = { tone: 'info' | 'error'; text: string } | null

export function DocumentApp() {
  const locale = chooseLocale(typeof navigator === 'undefined' ? 'zh' : navigator.language)
  const [session, setSession] = useState<DocumentSession | null>(null)
  const [stamp, setStamp] = useState<FileStamp | null>(null)
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<Status>(null)
  const [generation, setGeneration] = useState(0)
  const [overwrite, setOverwrite] = useState(false)
  const editorRef = useRef<Editor | null>(null)
  const baseCanonical = useRef('')
  const canonicalBody = useRef('')
  const sessionRef = useRef(session)
  const draftRef = useRef(draft)
  const stampRef = useRef(stamp)
  const runMenuRef = useRef<(command: MenuCommand) => void>(() => undefined)
  sessionRef.current = session
  draftRef.current = draft
  stampRef.current = stamp

  useEffect(() => {
    const api = window.leafnote
    if (!api) {
      return
    }
    const stopOpen = bindStartupOpen((result) => {
      applyOpen(result)
    })
    const stopMenu = api.onMenuCommand((command) => {
      void runMenuRef.current(command)
    })
    return () => {
      stopOpen()
      stopMenu()
    }
  }, [])

  function applyOpen(result: OpenDocumentResult) {
    if (result.status === 'canceled') {
      return
    }
    if (result.status === 'error') {
      setNotice({ tone: 'error', text: message(locale, result.reason === 'too-large' ? 'too-large' : result.reason) })
      return
    }
    const next = openSession({
      path: result.path,
      content: result.content,
      bom: result.bom,
      roundTripOk: htmlRoundTripOk
    })
    editorRef.current = null
    baseCanonical.current = ''
    canonicalBody.current = ''
    setSession(next)
    setDraft(result.content)
    setStamp(result.stamp)
    setGeneration((value) => value + 1)
    setNotice(null)
  }

  async function openDocument() {
    const current = sessionRef.current
    if (current && isDirty(current, draftRef.current)) {
      const closed = await settleClose('stay-open')
      if (!closed) {
        return
      }
    }
    applyOpen(await window.leafnote.openDocument())
  }

  async function save(force: boolean): Promise<boolean> {
    const current = sessionRef.current
    if (!current) {
      return false
    }
    const edited = editedCanonicalForSave(editorRef.current, draftRef.current)
    const assembled = assembleSaveText({
      original: current.baseline,
      surface: current.surface,
      sourceBuffer: draftRef.current,
      editedCanonical: current.surface === 'rich' ? edited : null,
      baseCanonical: baseCanonical.current,
      roundTrip: reparseMarkdown
    })
    if (assembled.status === 'aborted') {
      setNotice({ tone: 'error', text: message(locale, 'reopen-editor') })
      return false
    }
    if (!current.path || !stampRef.current) {
      const created = await window.leafnote.saveDocumentAs({ content: assembled.text, bom: current.bom })
      return finishSave(created, assembled.text, assembled.canonicalFallback)
    }
    const saved = await window.leafnote.saveDocument({
      path: current.path,
      content: assembled.text,
      stamp: stampRef.current,
      overwrite: force,
      bom: current.bom
    })
    if (saved.status === 'stale') {
      setOverwrite(true)
      return false
    }
    return finishSave(saved, assembled.text, assembled.canonicalFallback)
  }

  function finishSave(
    result: Awaited<ReturnType<typeof window.leafnote.saveDocument>>,
    text: string,
    canonicalFallback: boolean
  ): boolean {
    if (result.status === 'failed') {
      setNotice({ tone: 'error', text: `${message(locale, 'save-failed')} ${result.message}` })
      return false
    }
    if (result.status === 'denied') {
      setNotice({ tone: 'error', text: message(locale, 'access-denied') })
      return false
    }
    if (result.status === 'canceled' || result.status === 'aborted' || result.status === 'stale') {
      return false
    }
    setSession((current) =>
      current
        ? {
            ...current,
            path: result.status === 'ok' ? result.path : current.path,
            baseline: text,
            buffer: text
          }
        : current
    )
    setDraft(text)
    if (result.status === 'ok') {
      setStamp(result.stamp)
      baseCanonical.current = canonicalBody.current || baseCanonical.current
    }
    setNotice(canonicalFallback ? { tone: 'info', text: message(locale, 'canonical-style') } : null)
    return true
  }

  async function saveAs(): Promise<boolean> {
    const current = sessionRef.current
    if (!current) {
      return false
    }
    const edited = editedCanonicalForSave(editorRef.current, draftRef.current)
    const assembled = assembleSaveText({
      original: current.baseline,
      surface: current.surface,
      sourceBuffer: draftRef.current,
      editedCanonical: current.surface === 'rich' ? edited : null,
      baseCanonical: baseCanonical.current,
      roundTrip: reparseMarkdown
    })
    if (assembled.status === 'aborted') {
      setNotice({ tone: 'error', text: message(locale, 'reopen-editor') })
      return false
    }
    const created = await window.leafnote.saveDocumentAs({ content: assembled.text, bom: current.bom })
    return finishSave(created, assembled.text, assembled.canonicalFallback)
  }

  async function settleClose(after: 'close' | 'stay-open'): Promise<boolean> {
    const current = sessionRef.current
    const dirty = current ? isDirty(current, draftRef.current) : false
    if (!dirty) {
      if (after === 'close') {
        await window.leafnote.closeWindow()
      }
      return true
    }
    const choice = await window.leafnote.confirmDiscard()
    if (choice === 'cancel') {
      return false
    }
    if (choice === 'save') {
      const saved = await save(false)
      if (!saved) {
        return false
      }
    }
    if (after === 'close') {
      await window.leafnote.closeWindow()
    }
    return true
  }

  async function insertImage() {
    const current = sessionRef.current
    if (!current?.path) {
      setNotice({ tone: 'info', text: message(locale, 'save-first-for-image') })
      return
    }
    const picked = await window.leafnote.pickImage()
    if (picked.status !== 'ok') {
      return
    }
    const imported = await window.leafnote.importImage({
      documentPath: current.path,
      sourcePath: picked.sourcePath
    })
    if (imported.status !== 'ok') {
      setNotice({ tone: 'error', text: message(locale, 'copy-failed') })
      return
    }
    editorRef.current?.chain().focus().insertContent(`![](${imported.relativeName})`).run()
  }

  async function startNew() {
    const current = sessionRef.current
    if (current && isDirty(current, draftRef.current)) {
      const closed = await settleClose('stay-open')
      if (!closed) {
        return
      }
    }
    const next = createNewDocument(htmlRoundTripOk)
    editorRef.current = null
    baseCanonical.current = ''
    canonicalBody.current = ''
    setSession(next)
    setDraft('')
    setStamp(null)
    setGeneration((value) => value + 1)
    setNotice(null)
  }

  async function runMenu(command: MenuCommand) {
    if (command === 'new') {
      await startNew()
      return
    }
    if (command === 'open') {
      await openDocument()
      return
    }
    if (command === 'save') {
      await save(false)
      return
    }
    if (command === 'save-as') {
      await saveAs()
      return
    }
    if (command === 'close') {
      await settleClose('close')
      return
    }
    if (command === 'toggle-preview') {
      const current = sessionRef.current
      if (!current) {
        return
      }
      setSession(withMode(current, current.mode === 'preview' ? 'edit' : 'preview'))
      return
    }
    document.dispatchEvent(new Event('leafnote-find'))
  }
  runMenuRef.current = runMenu

  return (
    <main className="app">
      <header className="titlebar">
        <div className="titlebar-brand">
          <img className="leaf-mark leaf-mark-bar" src={leafLogo} alt="" />
          <strong className="titlebar-app-name">叶笺</strong>
          <span className="titlebar-product">LeafNote</span>
        </div>
        <div className="titlebar-actions">
          <TitleAction label={message(locale, 'new')} hint={commandHint(message(locale, 'new'), 'new')} onClick={() => void startNew()}>
            <FilePlus size={16} />
          </TitleAction>
          <TitleAction label={message(locale, 'open')} hint={commandHint(message(locale, 'open'), 'open')} onClick={() => void openDocument()}>
            <FolderOpen size={16} />
          </TitleAction>
          <TitleAction label={message(locale, 'save')} hint={commandHint(message(locale, 'save'), 'save')} disabled={!session} onClick={() => void save(false)}>
            <Save size={16} />
          </TitleAction>
          <TitleAction label={message(locale, 'save-as')} hint={commandHint(message(locale, 'save-as'), 'save-as')} disabled={!session} onClick={() => void saveAs()}>
            <FileOutput size={16} />
          </TitleAction>
        </div>
      </header>
      {notice ? <p className={notice.tone === 'error' ? 'banner error' : 'notice'}>{notice.text}</p> : null}
      {session ? (
        <EditorShell
          key={`${session.path ?? 'untitled'}:${generation}`}
          session={{ ...session, buffer: draft }}
          locale={locale}
          notice={null}
          readImage={async (src) => readLocalImage(session.path, src)}
          onInsertImage={() => void insertImage()}
          onChange={setDraft}
          onCanonicalBody={(body) => {
            canonicalBody.current = body
          }}
          onReady={(editor) => {
            editorRef.current = editor
            const markdown = editor.getMarkdown()
            if (!baseCanonical.current) {
              baseCanonical.current = markdown
              canonicalBody.current = markdown
            }
          }}
          onMode={(mode) => setSession((current) => (current ? withMode(current, mode) : current))}
          onClose={() => void settleClose('close')}
        />
      ) : (
        <EmptyState locale={locale} onNew={() => void startNew()} onOpen={() => void openDocument()} />
      )}
      {overwrite ? (
        <div className="modal" role="dialog" aria-modal="true">
          <p>{message(locale, 'stale-file')}</p>
          <button
            type="button"
            onClick={() => {
              setOverwrite(false)
              void save(true)
            }}
          >
            {message(locale, 'overwrite')}
          </button>
          <button type="button" onClick={() => setOverwrite(false)}>
            {message(locale, 'cancel')}
          </button>
        </div>
      ) : null}
    </main>
  )
}

function TitleAction(props: { label: string; hint?: string; disabled?: boolean; onClick(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="titlebar-icon-button titlebar-action"
      title={props.hint ?? props.label}
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

function EmptyState(props: { locale: LeafNoteLocale; onNew(): void; onOpen(): void }) {
  return (
    <section className="empty">
      <img className="leaf-mark leaf-mark-welcome" src={leafLogo} alt="" />
      <h1>叶笺</h1>
      <p>{message(props.locale, 'empty-hint')}</p>
      <div className="empty-actions">
        <button type="button" onClick={props.onNew}>
          {message(props.locale, 'new')}
        </button>
        <button type="button" onClick={props.onOpen}>
          {message(props.locale, 'open')}
        </button>
      </div>
    </section>
  )
}

function reparseMarkdown(markdown: string): string | null {
  try {
    const editor = new Editor({
      extensions: createLeafNoteExtensions({ readImage: async () => ({ status: 'denied' }) }),
      content: markdown,
      contentType: 'markdown'
    })
    try {
      return editor.getMarkdown()
    } finally {
      editor.destroy()
    }
  } catch {
    return null
  }
}

async function readLocalImage(documentPath: string | null, src: string) {
  if (!documentPath || !window.leafnote) {
    return { status: 'denied' as const }
  }
  const result = await window.leafnote.readImage({ documentPath, src })
  if (result.status !== 'ok') {
    return result
  }
  const bytes = result.bytes instanceof Uint8Array ? result.bytes : new Uint8Array(result.bytes)
  return { status: 'ok' as const, bytes, mimeType: result.mimeType }
}
