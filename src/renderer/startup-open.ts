import type { OpenDocumentResult } from '../shared/leafnote-api'
import './leafnote-window'

const pending: OpenDocumentResult[] = []
let listener: ((result: OpenDocumentResult) => void) | null = null

if (typeof window !== 'undefined' && window.leafnote) {
  window.leafnote.onOpenFromOs((result) => {
    if (listener) {
      listener(result)
      return
    }
    pending.push(result)
  })
}

export function bindStartupOpen(next: (result: OpenDocumentResult) => void): () => void {
  listener = next
  for (const result of pending.splice(0)) {
    next(result)
  }
  return () => {
    if (listener === next) {
      listener = null
    }
  }
}
