import { DATA_URL_MAX_BYTES } from '../shared/limits'

export function classifyImageSrc(
  src: string
):
  | { kind: 'remote' }
  | { kind: 'data'; bytes: Uint8Array; mimeType: string }
  | { kind: 'data-too-large' }
  | { kind: 'local' } {
  if (/^https?:/i.test(src)) {
    return { kind: 'remote' }
  }
  const match = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]*)$/i.exec(src)
  if (!match?.[1] || match[2] === undefined) {
    return { kind: 'local' }
  }
  const payload = match[2].replace(/\s/g, '')
  if (Math.floor((payload.length * 3) / 4) > DATA_URL_MAX_BYTES) {
    return { kind: 'data-too-large' }
  }
  let bytes: Uint8Array
  try {
    const binary = atob(payload)
    bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
  } catch {
    return { kind: 'local' }
  }
  if (bytes.byteLength > DATA_URL_MAX_BYTES) {
    return { kind: 'data-too-large' }
  }
  return { kind: 'data', bytes, mimeType: match[1].toLowerCase() }
}
