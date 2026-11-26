import { describe, expect, it } from 'vitest'
import { resolveLocalImage, sanitizeSvg, uniqueCopyName } from './image-io'

const base = { documentPath: '/notes/a.md', documentRealDir: '/notes', size: 10 }

describe('image io', () => {
  it('rejects parent segments, absolute src, escaped symlinks, and oversized files', () => {
    expect(resolveLocalImage({ ...base, src: '../x.png', targetRealPath: '/x.png' }).ok).toBe(false)
    expect(resolveLocalImage({ ...base, src: '/etc/passwd', targetRealPath: '/etc/passwd' }).ok).toBe(false)
    expect(resolveLocalImage({ ...base, src: 'shot.png', targetRealPath: '/elsewhere/shot.png' }).ok).toBe(false)
    expect(resolveLocalImage({ ...base, src: 'shot.png', targetRealPath: '/notes/shot.png', size: 20 * 1024 * 1024 + 1 }).ok).toBe(false)
  })

  it('accepts a png inside the document directory', () => {
    expect(resolveLocalImage({ ...base, src: 'shot.png', targetRealPath: '/notes/shot.png' })).toEqual({ ok: true, mimeType: 'image/png' })
  })

  it('adds a numeric suffix and strips svg scripts', () => {
    expect(uniqueCopyName(['a.png'], 'a.png')).toBe('a-2.png')
    const clean = sanitizeSvg('<svg><script>alert(1)</script><rect /></svg>')
    expect(clean).not.toContain('script')
    expect(sanitizeSvg('')).toBeNull()
  })

  it('rejects device names, UNC paths, and a sibling directory prefix', () => {
    expect(resolveLocalImage({ ...base, src: 'CON.png', targetRealPath: '/notes/CON.png' }).ok).toBe(false)
    expect(resolveLocalImage({ ...base, src: '//server/share.png', targetRealPath: '/notes/share.png' }).ok).toBe(false)
    expect(resolveLocalImage({ ...base, src: 'shot.png', targetRealPath: '/notes-extra/shot.png' }).ok).toBe(false)
  })
})
