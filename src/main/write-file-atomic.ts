import { randomBytes } from 'node:crypto'
import { open, rename, unlink } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

export async function writeFileAtomic(targetPath: string, bytes: Uint8Array): Promise<void> {
  const temporaryPath = join(dirname(targetPath), `.${basename(targetPath)}.tmp-${randomBytes(8).toString('hex')}`)
  const handle = await open(temporaryPath, 'w')
  try {
    await handle.write(bytes)
    await handle.sync()
  } catch (error) {
    await handle.close()
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
  await handle.close()
  try {
    await rename(temporaryPath, targetPath)
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined)
    throw error
  }
}
