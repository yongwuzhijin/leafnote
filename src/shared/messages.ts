import type { LeafNoteLocale } from './locale'

export type MessageKey =
  | 'unsupported-html'
  | 'unsupported-reference-link'
  | 'unsupported-footnote'
  | 'unsupported-size'
  | 'canonical-style'
  | 'copy-failed'
  | 'save-first-for-image'
  | 'access-denied'
  | 'reopen-editor'
  | 'unsaved'
  | 'preview'
  | 'edit'
  | 'open'
  | 'save'
  | 'save-as'
  | 'find'
  | 'find-empty'
  | 'close'
  | 'discard'
  | 'cancel'
  | 'overwrite'
  | 'stale-file'
  | 'save-failed'
  | 'not-file'
  | 'bad-extension'
  | 'not-utf8'
  | 'too-large'
  | 'preview-too-large'
  | 'image-unavailable'
  | 'untitled'
  | 'front-matter'
  | 'read-only-preview'
  | 'empty-hint'
  | 'slash-placeholder'

const zh: Record<MessageKey, string> = {
  'unsupported-html': '含 HTML、JSX 或 MDX',
  'unsupported-reference-link': '含引用式链接',
  'unsupported-footnote': '含脚注',
  'unsupported-size': '文件超过富文本大小上限',
  'canonical-style': '样式已按编辑器的规范形式保存，正文已写入',
  'copy-failed': '复制失败',
  'save-first-for-image': '先存储文档，再插入图片',
  'access-denied': '无法访问',
  'reopen-editor': '编辑器已关闭，请重新打开',
  unsaved: '未存储',
  preview: '预览',
  edit: '编辑',
  open: '打开',
  save: '存储',
  'save-as': '另存为',
  find: '查找',
  'find-empty': '无匹配',
  close: '关闭',
  discard: '不存储',
  cancel: '取消',
  overwrite: '覆盖',
  'stale-file': '磁盘上的文件已在打开后被修改。要覆盖它吗？',
  'save-failed': '存储失败',
  'not-file': '不是普通文件',
  'bad-extension': '扩展名必须是 .md、.markdown 或 .mdx',
  'not-utf8': '不是合法的 UTF-8',
  'too-large': '文件超过 20 MiB',
  'preview-too-large': '文件超过预览上限',
  'image-unavailable': '图片无法显示',
  untitled: '未命名',
  'front-matter': '文首信息',
  'read-only-preview': '预览只读',
  'empty-hint': '打开本地 Markdown，或先存储一份新文档。',
  'slash-placeholder': '写 Markdown… 输入 / 插入块'
}

const en: Record<MessageKey, string> = {
  'unsupported-html': 'This file contains HTML, JSX, or MDX.',
  'unsupported-reference-link': 'This file contains reference-style links.',
  'unsupported-footnote': 'This file contains footnotes.',
  'unsupported-size': 'This file exceeds the rich-text size limit.',
  'canonical-style': "Style was saved in the editor's canonical form. The text was written.",
  'copy-failed': 'Copy failed',
  'save-first-for-image': 'Save the document before inserting an image',
  'access-denied': 'Cannot access this file',
  'reopen-editor': 'The editor was closed. Reopen the document.',
  unsaved: 'Unsaved',
  preview: 'Preview',
  edit: 'Edit',
  open: 'Open',
  save: 'Save',
  'save-as': 'Save As',
  find: 'Find',
  'find-empty': 'No matches',
  close: 'Close',
  discard: "Don't Save",
  cancel: 'Cancel',
  overwrite: 'Overwrite',
  'stale-file': 'This file changed on disk after it was opened. Overwrite it?',
  'save-failed': 'Save failed',
  'not-file': 'Not a regular file',
  'bad-extension': 'The extension must be .md, .markdown, or .mdx',
  'not-utf8': 'Not valid UTF-8',
  'too-large': 'The file exceeds 20 MiB',
  'preview-too-large': 'This file exceeds the preview limit',
  'image-unavailable': 'Image unavailable',
  untitled: 'Untitled',
  'front-matter': 'Front matter',
  'read-only-preview': 'Preview is read-only',
  'empty-hint': 'Open a local Markdown file, or save a new document first.',
  'slash-placeholder': 'Write Markdown… type / for blocks'
}

const catalogs: Record<LeafNoteLocale, Record<MessageKey, string>> = { zh, en }

export function message(locale: LeafNoteLocale, key: MessageKey): string {
  return catalogs[locale][key]
}
