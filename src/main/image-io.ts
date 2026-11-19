import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import { IMAGE_READ_MAX_BYTES } from '../shared/limits'

export const IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.bmp',
  '.ico',
  '.svg'
] as const

const MIME_BY_EXTENSION: Record<(typeof IMAGE_EXTENSIONS)[number], string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
}

const DEVICE_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9'
])

const purifier = createDOMPurify(new JSDOM('').window)
purifier.addHook('uponSanitizeAttribute', (_node, data) => {
  const name = data.attrName.toLowerCase()
  if (name === 'href' || name.endsWith(':href') || name === 'src') {
    const value = data.attrValue.trim().toLowerCase()
    if (
      value.startsWith('http:') ||
      value.startsWith('https:') ||
      value.startsWith('//') ||
      value.startsWith('javascript:') ||
      value.startsWith('data:')
    ) {
      data.keepAttr = false
    }
  }
})

export function resolveLocalImage(input: {
  documentPath: string
  src: string
  documentRealDir: string
  targetRealPath: string | null
  size: number
}): { ok: true; mimeType: string } | { ok: false } {
  const src = input.src.trim()
  if (!src || src.startsWith('//') || src.startsWith('\\\\') || src.startsWith('/') || src.startsWith('\\')) {
    return { ok: false }
  }
  if (/^[A-Za-z]:/.test(src)) {
    return { ok: false }
  }
  const segments = src.split(/[\\/]/)
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return { ok: false }
  }
  const baseName = segments[segments.length - 1] ?? ''
  const deviceName = baseName.slice(0, baseName.lastIndexOf('.')).toLowerCase()
  if (DEVICE_NAMES.has(deviceName)) {
    return { ok: false }
  }
  const extension = imageExtension(baseName)
  if (!extension) {
    return { ok: false }
  }
  if (input.size > IMAGE_READ_MAX_BYTES || !input.targetRealPath) {
    return { ok: false }
  }
  if (!isInsideRealDirectory(input.documentRealDir, input.targetRealPath)) {
    return { ok: false }
  }
  return { ok: true, mimeType: MIME_BY_EXTENSION[extension] }
}

export function isInsideRealDirectory(directory: string, target: string): boolean {
  const root = directory.endsWith('/') ? directory : `${directory}/`
  return target === directory || target.startsWith(root)
}

export function uniqueCopyName(existing: readonly string[], sourceBase: string): string {
  if (!existing.includes(sourceBase)) {
    return sourceBase
  }
  const dot = sourceBase.lastIndexOf('.')
  const stem = dot > 0 ? sourceBase.slice(0, dot) : sourceBase
  const extension = dot > 0 ? sourceBase.slice(dot) : ''
  let suffix = 2
  let candidate = `${stem}-${suffix}${extension}`
  while (existing.includes(candidate)) {
    suffix += 1
    candidate = `${stem}-${suffix}${extension}`
  }
  return candidate
}

export function sanitizeSvg(svg: string): string | null {
  const clean = purifier.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true }
  })
  if (!clean.toLowerCase().includes('<svg')) {
    return null
  }
  return clean
}

function imageExtension(baseName: string): (typeof IMAGE_EXTENSIONS)[number] | null {
  const dot = baseName.lastIndexOf('.')
  if (dot < 0) {
    return null
  }
  const extension = baseName.slice(dot).toLowerCase()
  return IMAGE_EXTENSIONS.find((candidate) => candidate === extension) ?? null
}
