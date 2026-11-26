import { describe, expect, it } from 'vitest'
import { openSession, isDirty } from './document-session'
import { createNewDocument } from './new-document'

describe('new document', () => {
  it('starts untitled so the first save uses save as', () => {
    const session = createNewDocument(() => true)
    expect(session.path).toBeNull()
    expect(session.surface).toBe('rich')
    expect(session.buffer).toBe('')
    expect(isDirty(session, session.buffer)).toBe(false)
    expect(openSession({ path: null, content: '', bom: false, roundTripOk: () => true }).path).toBeNull()
  })
})
