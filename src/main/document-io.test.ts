import { describe, expect, it } from 'vitest'
import { createGrantTable } from './grant-table'
import { decodeUtf8Document, encodeUtf8Document, inspectOpen, planWrite } from './document-io'

const stamp = { mtimeMs: 10, size: 4 }

describe('document io', () => {
  it('rejects a non-file, a bad extension, invalid utf-8, and a file over 20 MiB', () => {
    expect(inspectOpen({ absolutePath: '/a.md', bytes: new Uint8Array([0xff]), isFile: false, stamp }).status).toBe('error')
    expect(inspectOpen({ absolutePath: '/a.txt', bytes: new TextEncoder().encode('a'), isFile: true, stamp })).toMatchObject({ status: 'error', reason: 'bad-extension' })
    expect(inspectOpen({ absolutePath: '/a.md', bytes: new Uint8Array([0xff]), isFile: true, stamp })).toMatchObject({ status: 'error', reason: 'not-utf8' })
    const huge = new Uint8Array(20 * 1024 * 1024 + 1)
    expect(inspectOpen({ absolutePath: '/a.md', bytes: huge, isFile: true, stamp: { mtimeMs: 1, size: huge.byteLength } })).toMatchObject({ status: 'error', reason: 'too-large' })
  })

  it('keeps a BOM and does not write when bytes are unchanged', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x61])
    const opened = inspectOpen({ absolutePath: '/A.MD', bytes, isFile: true, stamp })
    expect(opened).toMatchObject({ status: 'ok', bom: true, content: 'a' })
    expect(encodeUtf8Document('a', true)).toEqual(bytes)
    expect(planWrite({ granted: true, current: stamp, baseline: stamp, next: bytes, previous: bytes, overwrite: false })).toEqual({ action: 'skip' })
  })

  it('returns stale until overwrite is set, and denied without a grant', () => {
    const next = new TextEncoder().encode('b')
    const previous = new TextEncoder().encode('a')
    expect(planWrite({ granted: true, current: { mtimeMs: 11, size: 4 }, baseline: stamp, next, previous, overwrite: false })).toEqual({ action: 'stale' })
    expect(planWrite({ granted: true, current: { mtimeMs: 11, size: 4 }, baseline: stamp, next, previous, overwrite: true })).toEqual({ action: 'write', bytes: next })
    expect(planWrite({ granted: false, current: stamp, baseline: stamp, next, previous, overwrite: true })).toEqual({ action: 'denied' })
  })

  it('keeps the old grant when another path is added', () => {
    const table = createGrantTable()
    table.grant('/a.md', stamp)
    table.grant('/b.md', stamp)
    expect(table.paths().sort()).toEqual(['/a.md', '/b.md'])
  })

  it('accepts markdown and mdx extensions without writing', () => {
    const bytes = new TextEncoder().encode('# Hi\n')
    expect(inspectOpen({ absolutePath: '/notes/a.markdown', bytes, isFile: true, stamp: { mtimeMs: 1, size: bytes.byteLength } }).status).toBe('ok')
    expect(inspectOpen({ absolutePath: '/notes/a.MDX', bytes, isFile: true, stamp: { mtimeMs: 1, size: bytes.byteLength } }).status).toBe('ok')
  })
})
