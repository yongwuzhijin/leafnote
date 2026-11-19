import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect, useRef } from 'react'
import { createLeafNoteExtensions, runSlashCommand, type LeafNoteSlashId } from '../editor/create-leafnote-extensions'
import type { LeafNoteImageReader } from '../editor/create-leafnote-extensions'

const slashIds: LeafNoteSlashId[] = [
  'heading-1',
  'heading-2',
  'heading-3',
  'quote',
  'bullet-list',
  'ordered-list',
  'task-list',
  'paragraph',
  'toggle',
  'code-block',
  'divider',
  'table',
  'image',
  'inline-math',
  'math-block',
  'mermaid-fence'
]

export function RichEditor(props: {
  body: string
  placeholder: string
  readImage: LeafNoteImageReader
  onPickImage(): void
  onChange(markdownBody: string): void
}) {
  const onChange = useRef(props.onChange)
  onChange.current = props.onChange
  const editor = useEditor({
    extensions: createLeafNoteExtensions({
      readImage: props.readImage,
      onPickImage: props.onPickImage,
      placeholder: props.placeholder
    }),
    content: props.body,
    contentType: 'markdown',
    editorProps: {
      attributes: { 'aria-label': 'markdown' }
    },
    onUpdate: ({ editor: instance }) => {
      onChange.current(instance.getMarkdown())
    }
  })

  useEffect(() => {
    if (!editor) {
      return
    }
    const current = editor.getMarkdown()
    if (current !== props.body && !editor.isFocused) {
      editor.commands.setContent(props.body, { contentType: 'markdown', emitUpdate: false })
    }
  }, [editor, props.body])

  return (
    <div className="rich-editor">
      <div className="slash-bar" role="toolbar" aria-label="blocks">
        {slashIds.map((id) => (
          <button key={id} type="button" onClick={() => editor && runSlashCommand(editor, id, props.onPickImage)}>
            {id}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
