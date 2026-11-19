import { describe, expect, it } from 'vitest'
import { assembleSaveText } from '../editor/save-bytes'
import { editedCanonicalForSave } from './preview-save'

const destroyed = {
  isDestroyed: true,
  getMarkdown: () => {
    throw new Error('editor is gone')
  }
}

describe('preview save', () => {
  it('uses the current draft when the rich editor has been unmounted', () => {
    const draft = '# Hi edited\n'
    const edited = editedCanonicalForSave(destroyed, draft)
    expect(edited).toBe('# Hi edited\n')
    const saved = assembleSaveText({
      original: '# Hi\n',
      surface: 'rich',
      sourceBuffer: draft,
      editedCanonical: edited,
      baseCanonical: '# Hi\n',
      roundTrip: (markdown) => markdown
    })
    expect(saved.status).toBe('ok')
    if (saved.status === 'ok') {
      expect(saved.text).toContain('edited')
    }
  })

  it('keeps a single front matter block when preview saves the edited draft', () => {
    const draft = '---\ntitle: T\n---\n\n# New\n'
    const edited = editedCanonicalForSave(null, draft)
    const saved = assembleSaveText({
      original: '---\ntitle: T\n---\n\n# Old\n',
      surface: 'rich',
      sourceBuffer: draft,
      editedCanonical: edited,
      baseCanonical: '# Old\n',
      roundTrip: (markdown) => markdown
    })
    expect(saved.status).toBe('ok')
    if (saved.status === 'ok') {
      expect(saved.text.match(/title: T/g)).toHaveLength(1)
      expect(saved.text).toContain('# New')
    }
  })
})
