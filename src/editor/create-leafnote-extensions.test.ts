import { Editor } from '@tiptap/core'
import { describe, expect, it, vi } from 'vitest'
import { createLeafNoteExtensions, loadLeafNoteImage, runSlashCommand } from './create-leafnote-extensions'

describe('leafnote extensions', () => {
  it('serializes a heading, a task, and a mermaid fence without rendering mermaid', () => {
    const readImage = vi.fn(async () => ({ status: 'denied' as const }))
    const editor = new Editor({ extensions: createLeafNoteExtensions({ readImage }), content: '<p></p>' })
    runSlashCommand(editor, 'heading-1')
    editor.commands.insertContent('Title')
    runSlashCommand(editor, 'mermaid-fence')
    const markdown = editor.getMarkdown()
    expect(markdown).toContain('# Title')
    expect(markdown).toContain('```mermaid')
    expect(markdown).not.toContain('<svg')
    editor.destroy()
  })

  it('asks the image reader and never calls fetch', async () => {
    const readImage = vi.fn(async () => ({ status: 'ok' as const, bytes: new Uint8Array([1]), mimeType: 'image/png' }))
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    const url = await loadLeafNoteImage('shot.png', readImage)
    expect(readImage).toHaveBeenCalledWith('shot.png')
    expect(url?.startsWith('blob:')).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    await expect(loadLeafNoteImage('https://example.com/a.png', readImage)).resolves.toBeNull()
    fetchSpy.mockRestore()
  })

  it('round-trips a list, a table, math, and a toggle through the real serializer', () => {
    const readImage = vi.fn(async () => ({ status: 'denied' as const }))
    const editor = new Editor({
      extensions: createLeafNoteExtensions({ readImage }),
      content: '# Hi\n\n- item\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n$$\nE=mc^2\n$$\n',
      contentType: 'markdown'
    })
    const markdown = editor.getMarkdown()
    expect(markdown).toContain('# Hi')
    expect(markdown).toContain('item')
    expect(markdown).toContain('| A')
    expect(markdown).toContain('| 1')
    expect(markdown.toLowerCase()).toContain('e=mc')
    editor.destroy()
  })
})
