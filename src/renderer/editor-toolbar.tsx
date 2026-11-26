import type { Editor } from '@tiptap/core'
import {
  ChevronRight,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Image as ImageIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  MoreHorizontal,
  Pilcrow,
  Quote
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { insertToggle } from '../editor/create-leafnote-extensions'
import type { LeafNoteLocale } from '../shared/locale'
import { Tooltip } from './Tooltip'

function label(locale: LeafNoteLocale, zh: string, en: string): string {
  return locale === 'zh' ? zh : en
}

function ToolbarButton(props: { label: string; onClick(): void; children: ReactNode }) {
  return (
    <Tooltip label={props.label}>
      <button
        type="button"
        className="rich-markdown-toolbar-button"
        aria-label={props.label}
        onMouseDown={(event) => event.preventDefault()}
        onClick={props.onClick}
      >
        {props.children}
      </button>
    </Tooltip>
  )
}

export function EditorToolbar(props: {
  editor: Editor | null
  locale: LeafNoteLocale
  onToggleLink(): void
  onImagePick(): void
}) {
  const [moreOpen, setMoreOpen] = useState(false)
  const editor = props.editor
  const run = (command: () => void) => {
    command()
    setMoreOpen(false)
  }
  return (
    <div className="rich-markdown-editor-toolbar">
      <ToolbarButton label={label(props.locale, '正文', 'Body text')} onClick={() => editor?.chain().focus().setParagraph().run()}>
        <Pilcrow size={14} />
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '标题 1', 'Heading 1')} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={14} />
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '标题 2', 'Heading 2')} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={14} />
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '标题 3', 'Heading 3')} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={14} />
      </ToolbarButton>
      <div className="rich-markdown-toolbar-separator" />
      <ToolbarButton label={label(props.locale, '粗体', 'Bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '斜体', 'Italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
        I
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '删除线', 'Strike')} onClick={() => editor?.chain().focus().toggleStrike().run()}>
        S
      </ToolbarButton>
      <div className="rich-markdown-toolbar-separator" />
      <ToolbarButton label={label(props.locale, '无序列表', 'Bullet list')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '有序列表', 'Numbered list')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={14} />
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '待办', 'Checklist')} onClick={() => editor?.chain().focus().toggleTaskList().run()}>
        <ListTodo size={14} />
      </ToolbarButton>
      <div className="rich-markdown-toolbar-separator" />
      <ToolbarButton label={label(props.locale, '引用', 'Quote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
        <Quote size={14} />
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '链接', 'Link')} onClick={props.onToggleLink}>
        <LinkIcon size={14} />
      </ToolbarButton>
      <ToolbarButton label={label(props.locale, '图片', 'Image')} onClick={props.onImagePick}>
        <ImageIcon size={14} />
      </ToolbarButton>
      <div className="rich-markdown-more">
        <ToolbarButton label={label(props.locale, '更多块', 'More blocks')} onClick={() => setMoreOpen((open) => !open)}>
          <MoreHorizontal size={14} />
        </ToolbarButton>
        {moreOpen ? (
          <div className="rich-markdown-more-menu" role="menu">
            <div className="rich-markdown-slash-section">{label(props.locale, '标题', 'Headings')}</div>
            <button type="button" className="rich-markdown-slash-item" onMouseDown={(event) => event.preventDefault()} onClick={() => run(() => editor?.chain().focus().toggleHeading({ level: 4 }).run())}>
              <Heading4 size={14} />
              {label(props.locale, '标题 4', 'Heading 4')}
            </button>
            <button type="button" className="rich-markdown-slash-item" onMouseDown={(event) => event.preventDefault()} onClick={() => run(() => editor?.chain().focus().toggleHeading({ level: 5 }).run())}>
              <Heading5 size={14} />
              {label(props.locale, '标题 5', 'Heading 5')}
            </button>
            <button type="button" className="rich-markdown-slash-item" onMouseDown={(event) => event.preventDefault()} onClick={() => run(() => editor && insertToggle(editor))}>
              <ChevronRight size={14} />
              {label(props.locale, '折叠', 'Collapsible section')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
