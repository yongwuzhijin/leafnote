import { constants } from 'node:fs'
import { copyFile, readFile, readdir, realpath, stat, unlink } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'
import { IMAGE_EXTENSIONS, isInsideRealDirectory, resolveLocalImage, uniqueCopyName } from './image-io'
import type { ImageBytes } from './ipc-handlers'

export async function copyImageIntoDocument(documentPath: string, sourcePath: string): Promise<string | null> {
  try {
    const documentDir = await realpath(dirname(documentPath))
    const sourceReal = await realpath(sourcePath)
    const sourceStat = await stat(sourceReal)
    const extension = extname(sourceReal).toLowerCase()
    if (!sourceStat.isFile() || !IMAGE_EXTENSIONS.some((item) => item === extension)) {
      return null
    }
    const name = uniqueCopyName(await readdir(documentDir), basename(sourceReal))
    const target = join(documentDir, name)
    await copyFile(sourceReal, target, constants.COPYFILE_EXCL)
    const targetReal = await realpath(target)
    if (!isInsideRealDirectory(documentDir, targetReal)) {
      await unlink(target).catch(() => undefined)
      return null
    }
    return name
  } catch {
    return null
  }
}

export async function readDocumentImage(documentPath: string, src: string): Promise<ImageBytes | null> {
  try {
    const documentRealDir = await realpath(dirname(documentPath))
    const lexicalTarget = join(documentRealDir, src)
    if (
      !resolveLocalImage({
        documentPath,
        src,
        documentRealDir,
        targetRealPath: lexicalTarget,
        size: 1
      }).ok
    ) {
      return null
    }
    const targetRealPath = await realpath(lexicalTarget)
    const info = await stat(targetRealPath)
    if (!info.isFile()) {
      return null
    }
    const confirmed = resolveLocalImage({
      documentPath,
      src,
      documentRealDir,
      targetRealPath,
      size: info.size
    })
    if (!confirmed.ok) {
      return null
    }
    return {
      bytes: new Uint8Array(await readFile(targetRealPath)),
      targetRealPath,
      documentRealDir,
      size: info.size
    }
  } catch {
    return null
  }
}
