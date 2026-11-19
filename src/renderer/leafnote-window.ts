import type { LeafNoteApi } from '../shared/leafnote-api'

declare global {
  interface Window {
    leafnote: LeafNoteApi
  }
}

export {}
