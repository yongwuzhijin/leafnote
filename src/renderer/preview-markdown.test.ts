import { describe, expect, it } from 'vitest'
import { renderPreview } from './preview-markdown'

describe('preview', () => {
  it('removes scripts, javascript links, and remote image sources', () => {
    const html = renderPreview('Hello <script>alert(1)</script> [x](javascript:alert(1)) ![a](https://example.com/a.png)')
    expect(html.status).toBe('ok')
    if (html.status === 'ok') {
      expect(html.html).not.toContain('<script')
      expect(html.html).not.toContain('javascript:')
      expect(html.html).not.toContain('https://example.com/a.png')
    }
  })

  it('refuses preview above 8 MiB', () => {
    expect(renderPreview('a'.repeat(8 * 1024 * 1024 + 1))).toEqual({ status: 'too-large' })
  })

  it('keeps a safe local blob image and disables task checkboxes', () => {
    const html = renderPreview('- [ ] todo\n\n![shot](blob:leafnote/1)')
    expect(html.status).toBe('ok')
    if (html.status === 'ok') {
      expect(html.html).toContain('disabled')
      expect(html.html).toContain('blob:leafnote/1')
    }
  })
})
