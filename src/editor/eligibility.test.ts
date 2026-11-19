import { describe, expect, it } from 'vitest'
import { chooseEditSurface } from './eligibility'

const ok = () => true
const bad = () => false

describe('edit surface', () => {
  it('uses source for reference links, footnotes, failed html, and files over 600 KiB', () => {
    expect(chooseEditSurface('See [a][id]\n\n[id]: https://example.com\n', ok).reason).toBe('reference-links')
    expect(chooseEditSurface('Text\n\n[^n]: note\n', ok).reason).toBe('footnotes')
    expect(chooseEditSurface('Before <script>x</script>\n', bad)).toMatchObject({ surface: 'source', reason: 'html-or-jsx' })
    expect(chooseEditSurface(`${'a'.repeat(600 * 1024 + 1)}\n`, ok).reason).toBe('too-large')
  })

  it('keeps rich mode for a normal document and preserves front matter outside the body', () => {
    const content = '---\ntitle: 叶笺\n---\n\n# Hi\n'
    const result = chooseEditSurface(content, ok)
    expect(result.surface).toBe('rich')
    expect(result.frontMatter).toContain('title: 叶笺')
    expect(result.body.startsWith('# Hi')).toBe(true)
  })

  it('ignores reference links that only appear inside a fence', () => {
    const content = '```md\n[id]: https://example.com\n```\n\n# Hi\n'
    expect(chooseEditSurface(content, ok)).toMatchObject({ surface: 'rich', reason: null })
  })

  it('keeps rich mode when embedded html passes the round trip', () => {
    expect(chooseEditSurface('Hello <em>leaf</em>\n', ok).surface).toBe('rich')
  })
})
