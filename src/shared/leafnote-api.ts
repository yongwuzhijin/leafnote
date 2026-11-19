export type FileStamp = { mtimeMs: number; size: number }

export type OpenDocumentResult =
  | { status: 'canceled' }
  | { status: 'error'; reason: 'not-file' | 'bad-extension' | 'not-utf8' | 'too-large' }
  | { status: 'ok'; path: string; content: string; stamp: FileStamp; bom: boolean }

export type SaveDocumentResult =
  | { status: 'ok'; stamp: FileStamp; path: string }
  | { status: 'unchanged' }
  | { status: 'stale' }
  | { status: 'denied' }
  | { status: 'failed'; message: string }
  | { status: 'aborted' }
  | { status: 'canceled' }

export type CloseChoice = 'save' | 'discard' | 'cancel'

export type ImageReadResult =
  | { status: 'ok'; bytes: Uint8Array; mimeType: string }
  | { status: 'denied' }

export type ImportImageResult = { status: 'ok'; relativeName: string } | { status: 'denied' }

export type PickImageResult = { status: 'canceled' } | { status: 'ok'; sourcePath: string }

export type MenuCommand = 'new' | 'open' | 'save' | 'save-as' | 'close' | 'find'

export type SaveDocumentInput = {
  path: string
  content: string
  stamp: FileStamp
  overwrite: boolean
  bom: boolean
}

export type LeafNoteApi = {
  openDocument(): Promise<OpenDocumentResult>
  saveDocument(input: SaveDocumentInput): Promise<SaveDocumentResult>
  saveDocumentAs(input: { content: string; bom: boolean }): Promise<SaveDocumentResult>
  pickImage(): Promise<PickImageResult>
  importImage(input: { documentPath: string; sourcePath: string }): Promise<ImportImageResult>
  readImage(input: { documentPath: string; src: string }): Promise<ImageReadResult>
  writeClipboard(text: string): Promise<void>
  confirmDiscard(): Promise<CloseChoice>
  closeWindow(): Promise<void>
  onOpenFromOs(callback: (result: OpenDocumentResult) => void): () => void
  onMenuCommand(callback: (command: MenuCommand) => void): () => void
}
