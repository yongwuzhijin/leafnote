import { openSession, type DocumentSession } from './document-session'

export function createNewDocument(roundTripOk: (body: string) => boolean): DocumentSession {
  return openSession({ path: null, content: '', bom: false, roundTripOk })
}
