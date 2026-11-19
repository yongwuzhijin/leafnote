import { describe, expect, it } from 'vitest'
import { classifyImageSrc } from './image-display'
import { closeDecision, isDirty, openSession } from './document-session'

describe('document session', () => {
  it('opens reference-link files in source mode without marking them dirty', () => {
    const session = openSession({ path: '/a.md', content: '[id]: https://example.com\n', bom: false, roundTripOk: () => true })
    expect(session.surface).toBe('source')
    expect(isDirty(session, session.buffer)).toBe(false)
  })

  it('asks before closing a dirty document and stays when save is canceled', () => {
    expect(closeDecision(false, null)).toBe('close')
    expect(closeDecision(true, null)).toBe('ask')
    expect(closeDecision(true, 'cancel')).toBe('stay')
    expect(closeDecision(true, 'discard')).toBe('close')
    expect(closeDecision(true, 'save')).toBe('close')
  })

  it('does not fetch http images and rejects data urls over 1 MiB', () => {
    expect(classifyImageSrc('https://example.com/a.png')).toEqual({ kind: 'remote' })
    expect(classifyImageSrc(`data:image/png;base64,${'A'.repeat(2 * 1024 * 1024)}`).kind).toBe('data-too-large')
    expect(classifyImageSrc('shot.png')).toEqual({ kind: 'local' })
  })

  it('decodes a small data image without marking preview as a write', () => {
    const session = openSession({ path: '/a.md', content: '# Hi\n', bom: true, roundTripOk: () => true })
    expect(session.mode).toBe('edit')
    expect(session.bom).toBe(true)
    const tiny = classifyImageSrc('data:image/png;base64,AQID')
    expect(tiny.kind).toBe('data')
    if (tiny.kind === 'data') {
      expect(tiny.mimeType).toBe('image/png')
      expect(Array.from(tiny.bytes)).toEqual([1, 2, 3])
    }
  })
})
