import type { Editor } from '@tiptap/core'
import {
  ChevronRight,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Image as ImageIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Sigma,
  Table2,
  Workflow,
  type LucideIcon
} from 'lucide-react'
import { runSlashCommand, type LeafNoteSlashId } from '../editor/create-leafnote-extensions'
import type { LeafNoteLocale } from '../shared/locale'

export type SlashMenuState = { query: string; from: number; to: number; left: number; top: number }

type SlashEntry = {
  id: LeafNoteSlashId | 'heading-4' | 'heading-5'
  label: string
  description: string
  aliases: string[]
  group: string
  icon: LucideIcon
}

function text(locale: LeafNoteLocale, zh: string, en: string): string {
  return locale === 'zh' ? zh : en
}

export function slashEntries(locale: LeafNoteLocale): SlashEntry[] {
  const basic = text(locale, '基础块', 'Basic blocks')
  const advanced = text(locale, '高级', 'Advanced')
  return [
    { id: 'heading-1', label: text(locale, '标题 1', 'Heading 1'), description: text(locale, '大标题', 'Large heading'), aliases: ['h1', 'title'], group: basic, icon: Heading1 },
    { id: 'heading-2', label: text(locale, '标题 2', 'Heading 2'), description: text(locale, '中标题', 'Medium heading'), aliases: ['h2'], group: basic, icon: Heading2 },
    { id: 'heading-3', label: text(locale, '标题 3', 'Heading 3'), description: text(locale, '小标题', 'Small heading'), aliases: ['h3'], group: basic, icon: Heading3 },
    { id: 'heading-4', label: text(locale, '标题 4', 'Heading 4'), description: text(locale, '四级标题', 'Heading 4'), aliases: ['h4'], group: basic, icon: Heading4 },
    { id: 'heading-5', label: text(locale, '标题 5', 'Heading 5'), description: text(locale, '五级标题', 'Heading 5'), aliases: ['h5'], group: basic, icon: Heading5 },
    { id: 'quote', label: text(locale, '引用', 'Quote'), description: text(locale, '插入引用', 'Insert a blockquote'), aliases: ['blockquote'], group: basic, icon: Quote },
    { id: 'bullet-list', label: text(locale, '无序列表', 'Bullet List'), description: text(locale, '项目符号', 'Create an unordered list'), aliases: ['ul', 'list'], group: basic, icon: List },
    { id: 'ordered-list', label: text(locale, '有序列表', 'Numbered List'), description: text(locale, '编号列表', 'Create an ordered list'), aliases: ['ol', 'numbered'], group: basic, icon: ListOrdered },
    { id: 'task-list', label: text(locale, '待办', 'Check List'), description: text(locale, '核对清单', 'Create a checklist'), aliases: ['todo', 'task'], group: basic, icon: List },
    { id: 'paragraph', label: text(locale, '段落', 'Paragraph'), description: text(locale, '普通段落', 'Start a normal paragraph'), aliases: ['text', 'plain'], group: basic, icon: Pilcrow },
    { id: 'toggle', label: text(locale, '折叠', 'Toggle Text'), description: text(locale, '可折叠段落', 'Create a collapsible section'), aliases: ['details', 'collapse'], group: basic, icon: ChevronRight },
    { id: 'code-block', label: text(locale, '代码块', 'Code Block'), description: text(locale, '围栏代码', 'Insert a fenced code block'), aliases: ['code', 'snippet'], group: basic, icon: Code },
    { id: 'divider', label: text(locale, '分隔线', 'Divider'), description: text(locale, '水平线', 'Insert a horizontal rule'), aliases: ['hr', 'rule'], group: basic, icon: Minus },
    { id: 'table', label: text(locale, '表格', 'Table'), description: text(locale, '3×3 表格', 'Insert a 3x3 table'), aliases: ['grid'], group: advanced, icon: Table2 },
    { id: 'image', label: text(locale, '图片', 'Image'), description: text(locale, '插入本地图片', 'Insert a local image'), aliases: ['img', 'picture'], group: advanced, icon: ImageIcon },
    { id: 'mermaid-fence', label: text(locale, 'Mermaid 图', 'Mermaid Diagram'), description: text(locale, '流程图', 'Insert a Mermaid fence'), aliases: ['diagram', 'flowchart', 'graph'], group: advanced, icon: Workflow },
    { id: 'inline-math', label: text(locale, '行内公式', 'Inline Math'), description: text(locale, '行内 LaTeX', 'Insert inline LaTeX'), aliases: ['math', 'latex'], group: advanced, icon: Sigma },
    { id: 'math-block', label: text(locale, '公式块', 'Math Block'), description: text(locale, '独立公式', 'Insert a display equation'), aliases: ['equation'], group: advanced, icon: Sigma }
  ]
}

export function filterSlashEntries(entries: SlashEntry[], query: string): SlashEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return entries
  }
  return entries.filter((entry) =>
    [entry.id, entry.label, entry.description, ...entry.aliases].some((value) => value.toLowerCase().includes(needle))
  )
}

export function readSlashMenu(editor: Editor, root: HTMLElement): SlashMenuState | null {
  if (!editor.isEditable || !editor.state.selection.empty) {
    return null
  }
  const { $from } = editor.state.selection
  if (!$from.parent.isTextblock) {
    return null
  }
  const before = $from.parent.textBetween(0, $from.parentOffset, '\0', '\0')
  const match = before.match(/^\s*\/([a-z0-9-]*)$/i)
  if (!match) {
    return null
  }
  const slashOffset = before.lastIndexOf('/')
  const from = editor.state.selection.from - ($from.parentOffset - slashOffset)
  const coords = editor.view.coordsAtPos(editor.state.selection.from)
  const rect = root.getBoundingClientRect()
  return {
    query: match[1] ?? '',
    from,
    to: editor.state.selection.from,
    left: coords.left - rect.left,
    top: coords.bottom - rect.top + 8
  }
}

export function applySlashEntry(
  editor: Editor,
  menu: SlashMenuState,
  entry: SlashEntry,
  onPickImage?: () => void
): void {
  editor.chain().focus().deleteRange({ from: menu.from, to: menu.to }).run()
  if (entry.id === 'heading-4') {
    editor.chain().focus().toggleHeading({ level: 4 }).run()
    return
  }
  if (entry.id === 'heading-5') {
    editor.chain().focus().toggleHeading({ level: 5 }).run()
    return
  }
  runSlashCommand(editor, entry.id, onPickImage)
}

export function SlashMenu(props: {
  menu: SlashMenuState
  entries: SlashEntry[]
  selectedIndex: number
  locale: LeafNoteLocale
  onPick(entry: SlashEntry): void
}) {
  let group = ''
  return (
    <div className="rich-markdown-slash-menu" style={{ left: props.menu.left, top: props.menu.top }} role="dialog" aria-label={props.locale === 'zh' ? '斜杠命令' : 'Slash commands'}>
      <div className="rich-markdown-slash-search">
        <input readOnly aria-label={props.locale === 'zh' ? '搜索块' : 'Search blocks'} value={props.menu.query} placeholder={props.locale === 'zh' ? '搜索块…' : 'Search blocks...'} />
      </div>
      <div className="rich-markdown-slash-results" role="listbox">
        {props.entries.length === 0 ? (
          <div className="rich-markdown-slash-empty">{props.locale === 'zh' ? '没有匹配的块' : 'No blocks found'}</div>
        ) : (
          props.entries.map((entry, index) => {
            const showGroup = entry.group !== group
            group = entry.group
            const Icon = entry.icon
            return (
              <div key={entry.id}>
                {showGroup ? <div className="rich-markdown-slash-section">{entry.group}</div> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === props.selectedIndex}
                  title={entry.description}
                  className={index === props.selectedIndex ? 'rich-markdown-slash-item is-active' : 'rich-markdown-slash-item'}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => props.onPick(entry)}
                >
                  <span className="rich-markdown-slash-icon">
                    <Icon size={14} />
                  </span>
                  {entry.label}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
