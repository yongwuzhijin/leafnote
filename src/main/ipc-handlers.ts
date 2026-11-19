import type {
  CloseChoice,
  ImageReadResult,
  ImportImageResult,
  OpenDocumentResult,
  PickImageResult,
  SaveDocumentInput,
  SaveDocumentResult
} from '../shared/leafnote-api'
import { encodeUtf8Document, inspectOpen, planWrite } from './document-io'
import { createGrantTable } from './grant-table'
import { resolveLocalImage, sanitizeSvg } from './image-io'

export type FileStat = { mtimeMs: number; size: number; isFile: boolean }

export type ImageBytes = {
  bytes: Uint8Array
  targetRealPath: string | null
  documentRealDir: string
  size: number
}

export type HandlerDeps = {
  showOpen: () => Promise<string | null>
  showSave: () => Promise<string | null>
  readFile: (path: string) => Promise<Uint8Array>
  statFile: (path: string) => Promise<FileStat>
  writeAtomic: (path: string, bytes: Uint8Array) => Promise<void>
  confirm: () => Promise<CloseChoice>
  writeClipboard: (text: string) => Promise<void>
  pickImagePath: () => Promise<string | null>
  copyIntoDirectory: (documentPath: string, sourcePath: string) => Promise<string | null>
  readImageBytes: (documentPath: string, src: string) => Promise<ImageBytes | null>
}

export function createHandlers(deps: HandlerDeps): {
  openDocument: () => Promise<OpenDocumentResult>
  saveDocument: (input: SaveDocumentInput) => Promise<SaveDocumentResult>
  saveDocumentAs: (input: { content: string; bom: boolean }) => Promise<SaveDocumentResult>
  pickImage: () => Promise<PickImageResult>
  importImage: (input: { documentPath: string; sourcePath: string }) => Promise<ImportImageResult>
  readImage: (input: { documentPath: string; src: string }) => Promise<ImageReadResult>
  writeClipboard: (text: string) => Promise<void>
  confirmDiscard: () => Promise<CloseChoice>
} {
  const grants = createGrantTable()
  const lastBytes = new Map<string, Uint8Array>()

  return {
    async openDocument() {
      const path = await deps.showOpen()
      if (!path) {
        return { status: 'canceled' }
      }
      try {
        const [bytes, stat] = await Promise.all([deps.readFile(path), deps.statFile(path)])
        const opened = inspectOpen({
          absolutePath: path,
          bytes,
          isFile: stat.isFile,
          stamp: { mtimeMs: stat.mtimeMs, size: stat.size }
        })
        if (opened.status === 'ok') {
          grants.grant(opened.path, opened.stamp)
          lastBytes.set(opened.path, bytes)
        }
        return opened
      } catch {
        return { status: 'error', reason: 'not-file' }
      }
    },
    async saveDocument(input) {
      if (!grants.has(input.path)) {
        return { status: 'denied' }
      }
      const next = encodeUtf8Document(input.content, input.bom)
      const previous = lastBytes.get(input.path) ?? new Uint8Array()
      const current = await readStamp(deps, input.path)
      const plan = planWrite({
        granted: true,
        current,
        baseline: input.stamp,
        next,
        previous,
        overwrite: input.overwrite
      })
      if (plan.action === 'skip') {
        return { status: 'unchanged' }
      }
      if (plan.action === 'stale') {
        return { status: 'stale' }
      }
      if (plan.action === 'denied') {
        return { status: 'denied' }
      }
      return commitBytes(deps, grants, lastBytes, input.path, plan.bytes)
    },
    async saveDocumentAs(input) {
      const path = await deps.showSave()
      if (!path) {
        return { status: 'canceled' }
      }
      return commitBytes(deps, grants, lastBytes, path, encodeUtf8Document(input.content, input.bom))
    },
    async pickImage() {
      const sourcePath = await deps.pickImagePath()
      if (!sourcePath) {
        return { status: 'canceled' }
      }
      return { status: 'ok', sourcePath }
    },
    async importImage(input) {
      if (!grants.has(input.documentPath)) {
        return { status: 'denied' }
      }
      const relativeName = await deps.copyIntoDirectory(input.documentPath, input.sourcePath)
      if (!relativeName || relativeName.split(/[\\/]/).some((part) => part === '' || part === '.' || part === '..')) {
        return { status: 'denied' }
      }
      return { status: 'ok', relativeName }
    },
    async readImage(input) {
      if (!grants.has(input.documentPath)) {
        return { status: 'denied' }
      }
      const loaded = await deps.readImageBytes(input.documentPath, input.src)
      if (!loaded) {
        return { status: 'denied' }
      }
      const resolved = resolveLocalImage({
        documentPath: input.documentPath,
        src: input.src,
        documentRealDir: loaded.documentRealDir,
        targetRealPath: loaded.targetRealPath,
        size: loaded.size
      })
      if (!resolved.ok) {
        return { status: 'denied' }
      }
      if (resolved.mimeType === 'image/svg+xml') {
        const clean = sanitizeSvg(new TextDecoder().decode(loaded.bytes))
        if (!clean) {
          return { status: 'denied' }
        }
        return { status: 'ok', bytes: new TextEncoder().encode(clean), mimeType: resolved.mimeType }
      }
      return { status: 'ok', bytes: loaded.bytes, mimeType: resolved.mimeType }
    },
    async writeClipboard(text) {
      await deps.writeClipboard(text)
    },
    confirmDiscard() {
      return deps.confirm()
    }
  }
}

async function readStamp(deps: HandlerDeps, path: string) {
  try {
    const stat = await deps.statFile(path)
    if (!stat.isFile) {
      return null
    }
    return { mtimeMs: stat.mtimeMs, size: stat.size }
  } catch {
    return null
  }
}

async function commitBytes(
  deps: HandlerDeps,
  grants: ReturnType<typeof createGrantTable>,
  lastBytes: Map<string, Uint8Array>,
  path: string,
  bytes: Uint8Array
): Promise<SaveDocumentResult> {
  try {
    await deps.writeAtomic(path, bytes)
    const stat = await deps.statFile(path)
    const stamp = { mtimeMs: stat.mtimeMs, size: stat.size }
    grants.grant(path, stamp)
    lastBytes.set(path, bytes)
    return { status: 'ok', path, stamp }
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : 'failed' }
  }
}
