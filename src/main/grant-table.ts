import type { FileStamp } from '../shared/leafnote-api'

export type GrantTable = {
  grant(path: string, stamp: FileStamp): void
  has(path: string): boolean
  stamp(path: string): FileStamp | null
  paths(): string[]
}

export function createGrantTable(): GrantTable {
  const grants = new Map<string, FileStamp>()
  return {
    grant(path, stamp) {
      grants.set(path, stamp)
    },
    has(path) {
      return grants.has(path)
    },
    stamp(path) {
      return grants.get(path) ?? null
    },
    paths() {
      return [...grants.keys()]
    }
  }
}
