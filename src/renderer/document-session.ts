import { chooseEditSurface, type UnsupportedReason } from '../editor/eligibility'
import type { CloseChoice } from '../shared/leafnote-api'

export type DocumentSession = {
  path: string | null
  baseline: string
  buffer: string
  surface: 'rich' | 'source'
  reason: UnsupportedReason
  mode: 'edit' | 'preview'
  bom: boolean
}

export function openSession(input: {
  path: string | null
  content: string
  bom: boolean
  roundTripOk: (body: string) => boolean
}): DocumentSession {
  const decision = chooseEditSurface(input.content, input.roundTripOk)
  return {
    path: input.path,
    baseline: input.content,
    buffer: input.content,
    surface: decision.surface,
    reason: decision.reason,
    mode: 'edit',
    bom: input.bom
  }
}

export function withMode(session: DocumentSession, mode: DocumentSession['mode']): DocumentSession {
  return { ...session, mode }
}

export function isDirty(session: DocumentSession, nextText: string): boolean {
  return nextText !== session.baseline
}

export function closeDecision(dirty: boolean, choice: CloseChoice | null): 'close' | 'stay' | 'ask' {
  if (!dirty) {
    return 'close'
  }
  if (choice === null) {
    return 'ask'
  }
  if (choice === 'cancel') {
    return 'stay'
  }
  return 'close'
}
