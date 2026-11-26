import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createLeafNoteExtensions } from '../editor/create-leafnote-extensions'
import type { LeafNoteImageReader } from '../editor/create-leafnote-extensions'
import type { LeafNoteLocale } from '../shared/locale'
import { EditorToolbar } from './editor-toolbar'
import { applySlashEntry, filterSlashEntries, readSlashMenu, slashEntries, SlashMenu, type SlashMenuState } from './slash-menu'

export function RichEditor(props: {
  body: string
  placeholder: string
  locale: LeafNoteLocale
  readImage: LeafNoteImageReader
  onPickImage(): void
  onChange(markdownBody: string): void
  onReady?(editor: Editor): void
}) {
  const onChange = useRef(props.onChange)
  onChange.current = props.onChange
  const onReady = useRef(props.onReady)
  onReady.current = props.onReady
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [menu, setMenu] = useState<SlashMenuState | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkHref, setLinkHref] = useState('https://')
  const entries = useMemo(() => slashEntries(props.locale), [props.locale])
  const filtered = menu ? filterSlashEntries(entries, menu.query) : []
  const editor = useEditor({
    extensions: createLeafNoteExtensions({
      readImage: props.readImage,
      onPickImage: props.onPickImage,
      placeholder: props.placeholder
    }),
    content: props.body,
    contentType: 'markdown',
    editorProps: {
      attributes: { class: 'rich-markdown-editor', 'aria-label': 'markdown' }
    },
    onUpdate: ({ editor: instance }) => {
      onChange.current(instance.getMarkdown())
    }
  })

  useEffect(() => {
    if (editor) {
      onReady.current?.(editor)
    }
  }, [editor])

  useEffect(() => {
    if (!editor) {
      return
    }
    const sync = () => {
      const next = rootRef.current ? readSlashMenu(editor, rootRef.current) : null
      setMenu(next)
      setSelectedIndex(0)
    }
    editor.on('selectionUpdate', sync)
    editor.on('update', sync)
    return () => {
      editor.off('selectionUpdate', sync)
      editor.off('update', sync)
    }
  }, [editor])

  useEffect(() => {
    if (!editor || !menu) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((index) => (filtered.length === 0 ? 0 : (index + 1) % filtered.length))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        event.stopPropagation()
        setSelectedIndex((index) => (filtered.length === 0 ? 0 : (index - 1 + filtered.length) % filtered.length))
      } else if (event.key === 'Enter' && filtered[selectedIndex]) {
        event.preventDefault()
        event.stopPropagation()
        applySlashEntry(editor, menu, filtered[selectedIndex], props.onPickImage)
        setMenu(null)
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setMenu(null)
      }
    }
    editor.view.dom.addEventListener('keydown', onKey, true)
    return () => editor.view.dom.removeEventListener('keydown', onKey, true)
  }, [editor, filtered, menu, props.onPickImage, selectedIndex])

  return (
    <div ref={rootRef} className="rich-markdown-editor-shell">
      <EditorToolbar
        editor={editor}
        locale={props.locale}
        onImagePick={props.onPickImage}
        onToggleLink={() => {
          const current = editor?.getAttributes('link').href
          setLinkHref(typeof current === 'string' && current ? current : 'https://')
          setLinkOpen(true)
        }}
      />
      <div className="rich-markdown-editor-scroll">
        <EditorContent editor={editor} />
      </div>
      {menu ? (
        <SlashMenu
          menu={menu}
          entries={filtered}
          selectedIndex={selectedIndex}
          locale={props.locale}
          onPick={(entry) => {
            if (editor) {
              applySlashEntry(editor, menu, entry, props.onPickImage)
            }
            setMenu(null)
          }}
        />
      ) : null}
      {linkOpen ? (
        <form
          className="rich-markdown-link-bubble"
          onSubmit={(event) => {
            event.preventDefault()
            editor?.chain().focus().extendMarkRange('link').setLink({ href: linkHref }).run()
            setLinkOpen(false)
          }}
        >
          <input
            className="rich-markdown-link-url"
            aria-label={props.locale === 'zh' ? '链接地址' : 'Link URL'}
            value={linkHref}
            onChange={(event) => setLinkHref(event.target.value)}
          />
          <button type="submit" className="rich-markdown-link-button">
            {props.locale === 'zh' ? '确定' : 'Apply'}
          </button>
          <button
            type="button"
            className="rich-markdown-link-button"
            onClick={() => {
              editor?.chain().focus().unsetLink().run()
              setLinkOpen(false)
            }}
          >
            {props.locale === 'zh' ? '移除' : 'Remove'}
          </button>
        </form>
      ) : null}
    </div>
  )
}
