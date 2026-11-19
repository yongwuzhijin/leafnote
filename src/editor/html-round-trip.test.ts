import { describe, expect, it } from 'vitest'
import { htmlRoundTripOk } from './html-round-trip'

describe('html round trip', () => {
  it('rejects a script tag and keeps a plain document eligible', () => {
    expect(htmlRoundTripOk('Before <script>alert(1)</script>\n')).toBe(false)
    expect(htmlRoundTripOk('# 叶笺\n\n普通段落\n')).toBe(true)
  })
})
