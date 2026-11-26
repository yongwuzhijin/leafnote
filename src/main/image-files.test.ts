import { mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { copyImageIntoDocument, readDocumentImage } from './image-files'

describe('image files', () => {
  it('copies a png beside the document and refuses a symlink that leaves the directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'leafnote-img-'))
    const outside = await mkdtemp(join(tmpdir(), 'leafnote-out-'))
    const documentPath = join(dir, 'note.md')
    await writeFile(documentPath, '# 叶笺\n')
    await writeFile(join(dir, 'shot.png'), 'png')
    await writeFile(join(outside, 'secret.png'), 'secret')
    await symlink(join(outside, 'secret.png'), join(dir, 'link.png'))
    expect(await copyImageIntoDocument(documentPath, join(dir, 'shot.png'))).toBe('shot-2.png')
    expect(await readDocumentImage(documentPath, 'link.png')).toBeNull()
    expect(await readDocumentImage(documentPath, '../secret.png')).toBeNull()
  })
})
