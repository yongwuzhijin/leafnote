import { mkdtemp, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createHandlers } from './ipc-handlers'
import { isAllowedAppUrl, windowSecurityOptions } from './navigation'
import { writeFileAtomic } from './write-file-atomic'

describe('ipc boundary', () => {
  it('blocks foreign navigation and enables the sandbox flags', () => {
    expect(isAllowedAppUrl('app://leafnote/index.html', 'app://leafnote')).toBe(true)
    expect(isAllowedAppUrl('https://example.com', 'app://leafnote')).toBe(false)
    expect(windowSecurityOptions()).toEqual({ contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true })
  })

  it('writes through a temp file and leaves the original in place on a simulated failure', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'leafnote-'))
    const target = join(dir, 'a.md')
    await writeFile(target, 'old')
    await writeFileAtomic(target, new TextEncoder().encode('new'))
    expect(await readFile(target, 'utf8')).toBe('new')
    const names = await readdir(dir)
    expect(names.filter((name) => name.includes('.tmp-'))).toEqual([])
    await expect(writeFileAtomic(join(dir, 'missing', 'a.md'), new TextEncoder().encode('x'))).rejects.toThrow()
    expect(await readFile(target, 'utf8')).toBe('new')
  })

  it('returns denied for a path that was not opened', async () => {
    const handlers = createHandlers({
      showOpen: async () => null,
      showSave: async () => null,
      readFile: async () => new Uint8Array(),
      statFile: async () => ({ mtimeMs: 0, size: 0, isFile: true }),
      writeAtomic: async () => {},
      confirm: async () => 'cancel' as const,
      writeClipboard: async () => {},
      pickImagePath: async () => null,
      copyIntoDirectory: async () => 'a.png',
      readImageBytes: async () => null
    })
    const saved = await handlers.saveDocument({ path: '/secret.md', content: 'x', stamp: { mtimeMs: 0, size: 1 }, overwrite: true, bom: false })
    expect(saved).toEqual({ status: 'denied' })
  })

  it('keeps the previous grant when saving as a new path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'leafnote-grant-'))
    const original = join(dir, 'a.md')
    const next = join(dir, 'b.md')
    await writeFile(original, 'old')
    const handlers = createHandlers({
      showOpen: async () => original,
      showSave: async () => next,
      readFile: async (path) => new Uint8Array(await readFile(path)),
      statFile: async (path) => {
        const info = await stat(path)
        return { mtimeMs: info.mtimeMs, size: info.size, isFile: info.isFile() }
      },
      writeAtomic: writeFileAtomic,
      confirm: async () => 'cancel',
      writeClipboard: async () => {},
      pickImagePath: async () => null,
      copyIntoDirectory: async () => null,
      readImageBytes: async () => null
    })
    const opened = await handlers.openDocument()
    expect(opened.status).toBe('ok')
    const saved = await handlers.saveDocumentAs({ content: 'copy', bom: false })
    expect(saved.status).toBe('ok')
    expect(await readFile(original, 'utf8')).toBe('old')
    expect(await readFile(next, 'utf8')).toBe('copy')
    if (opened.status === 'ok') {
      const again = await handlers.saveDocument({
        path: opened.path,
        content: 'edited',
        stamp: opened.stamp,
        overwrite: true,
        bom: false
      })
      expect(again.status).toBe('ok')
    }
  })
})
