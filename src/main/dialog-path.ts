import { realpath } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

export async function canonicalizeDialogPath(filePath: string): Promise<string> {
  try {
    return await realpath(filePath)
  } catch {
    try {
      return join(await realpath(dirname(filePath)), basename(filePath))
    } catch {
      return filePath
    }
  }
}

export async function sameRealPath(left: string, right: string): Promise<boolean> {
  try {
    return (await realpath(left)) === (await realpath(right))
  } catch {
    return false
  }
}
