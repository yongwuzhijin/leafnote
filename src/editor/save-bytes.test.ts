import { describe, expect, it } from 'vitest'
import { reconcileSerializedMarkdown } from './rich-markdown-source-reconcile'
import { assembleSaveText } from './save-bytes'

describe('save bytes', () => {
  it('preserves an untouched emphasized span while applying one edit', () => {
    const original = 'Keep *this* and change _that_\r\n'
    const base = 'Keep *this* and change _that_\n'
    const edited = 'Keep *this* and change _those_\n'
    const reconciled = reconcileSerializedMarkdown({
      originalSource: original,
      baseCanonical: base,
      edited,
      roundTrip: (markdown) => markdown.replaceAll('\r\n', '\n')
    })
    expect(reconciled).toContain('*this*')
    expect(reconciled.endsWith('\r\n')).toBe(true)
    expect(reconciled).not.toBe('')
  })

  it('does not write an empty file when the editor is gone', () => {
    expect(assembleSaveText({
      original: '# Hi\n',
      surface: 'rich',
      sourceBuffer: '# Hi\n',
      editedCanonical: null,
      baseCanonical: '# Hi\n',
      roundTrip: (markdown) => markdown
    })).toEqual({ status: 'aborted' })
  })

  it('rejoins the original front matter and flags a canonical fallback', () => {
    const original = '---\ntitle: T\n---\n\n*old*\r\n'
    const saved = assembleSaveText({
      original,
      surface: 'rich',
      sourceBuffer: original,
      editedCanonical: '*new*\n',
      baseCanonical: '*old*\n',
      roundTrip: () => null
    })
    expect(saved).toMatchObject({ status: 'ok', canonicalFallback: true })
    if (saved.status === 'ok') {
      expect(saved.text.startsWith('---\ntitle: T\n---\n')).toBe(true)
      expect(saved.text).toContain('*new*')
      expect(saved.text.endsWith('\r\n')).toBe(true)
    }
  })

  it('returns the source buffer unchanged when rich text is not in use', () => {
    const sourceBuffer = '---\ntitle: T\n---\n\n[id]: https://example.com\r\n'
    expect(assembleSaveText({
      original: sourceBuffer,
      surface: 'source',
      sourceBuffer,
      editedCanonical: null,
      baseCanonical: '',
      roundTrip: () => null
    })).toEqual({ status: 'ok', text: sourceBuffer, canonicalFallback: false })
  })
})
