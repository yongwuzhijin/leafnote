import { extname } from 'node:path'
import type { FileStamp, OpenDocumentResult } from '../shared/leafnote-api'
import { DOCUMENT_OPEN_MAX_BYTES } from '../shared/limits'

const DOCUMENT_EXTENSIONS = new Set(['.md', '.markdown', '.mdx'])
const UTF8_BOM = [0xef, 0xbb, 0xbf]

export function decodeUtf8Document(bytes: Uint8Array): { content: string; bom: boolean } | null {
  const bom =
    bytes.byteLength >= 3 &&
    bytes[0] === UTF8_BOM[0] &&
    bytes[1] === UTF8_BOM[1] &&
    bytes[2] === UTF8_BOM[2]
  const payload = bom ? bytes.subarray(3) : bytes
  try {
    return { content: new TextDecoder('utf-8', { fatal: true }).decode(payload), bom }
  } catch {
    return null
  }
}

export function encodeUtf8Document(content: string, bom: boolean): Uint8Array {
  const body = new TextEncoder().encode(content)
  if (!bom) {
    return body
  }
  const bytes = new Uint8Array(body.byteLength + UTF8_BOM.length)
  bytes.set(UTF8_BOM, 0)
  bytes.set(body, UTF8_BOM.length)
  return bytes
}

export function inspectOpen(input: {
  absolutePath: string
  bytes: Uint8Array
  isFile: boolean
  stamp: FileStamp
}): OpenDocumentResult {
  if (!input.isFile) {
    return { status: 'error', reason: 'not-file' }
  }
  const extension = extname(input.absolutePath).toLowerCase()
  if (!DOCUMENT_EXTENSIONS.has(extension)) {
    return { status: 'error', reason: 'bad-extension' }
  }
  if (input.stamp.size > DOCUMENT_OPEN_MAX_BYTES) {
    return { status: 'error', reason: 'too-large' }
  }
  const decoded = decodeUtf8Document(input.bytes)
  if (!decoded) {
    return { status: 'error', reason: 'not-utf8' }
  }
  return {
    status: 'ok',
    path: input.absolutePath,
    content: decoded.content,
    stamp: input.stamp,
    bom: decoded.bom
  }
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false
  }
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }
  return true
}

export function planWrite(input: {
  granted: boolean
  current: FileStamp | null
  baseline: FileStamp
  next: Uint8Array
  previous: Uint8Array
  overwrite: boolean
}): { action: 'skip' } | { action: 'write'; bytes: Uint8Array } | { action: 'stale' } | { action: 'denied' } {
  if (!input.granted) {
    return { action: 'denied' }
  }
  if (sameBytes(input.next, input.previous)) {
    return { action: 'skip' }
  }
  const changedOnDisk =
    input.current === null ||
    input.current.mtimeMs !== input.baseline.mtimeMs ||
    input.current.size !== input.baseline.size
  if (changedOnDisk && !input.overwrite) {
    return { action: 'stale' }
  }
  return { action: 'write', bytes: input.next }
}
