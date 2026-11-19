import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chooseLocale } from './locale'
import { APP_ID, DOCUMENT_OPEN_MAX_BYTES, MARKDOWN_PREVIEW_MAX_BYTES, RICH_MARKDOWN_MAX_SIZE_BYTES } from './limits'
import { message } from './messages'
import { signingEnabled } from './signing'

describe('leafnote identity', () => {
  it('chooses Chinese unless the language starts with en', () => {
    expect(chooseLocale('zh-CN')).toBe('zh')
    expect(chooseLocale('en-US')).toBe('en')
    expect(chooseLocale('ja-JP')).toBe('zh')
  })

  it('keeps the spec size limits and bundle id', () => {
    expect(RICH_MARKDOWN_MAX_SIZE_BYTES).toBe(600 * 1024)
    expect(MARKDOWN_PREVIEW_MAX_BYTES).toBe(8 * 1024 * 1024)
    expect(DOCUMENT_OPEN_MAX_BYTES).toBe(20 * 1024 * 1024)
    expect(APP_ID).toBe('app.leafnote.macos')
  })

  it('signs only when every Apple secret is non-empty', () => {
    const full = {
      APPLE_ID: 'a',
      APPLE_APP_SPECIFIC_PASSWORD: 'b',
      APPLE_TEAM_ID: 'c',
      CSC_LINK: 'd',
      CSC_KEY_PASSWORD: 'e'
    }
    expect(signingEnabled(full)).toBe(true)
    expect(signingEnabled({ ...full, APPLE_TEAM_ID: ' ' })).toBe(false)
  })

  it('keeps the Lovecast MIT notice and both Orca URLs', () => {
    const license = readFileSync('LICENSE', 'utf8')
    const notice = readFileSync('NOTICE', 'utf8')
    expect(license).toContain('Copyright (c) 2026 Lovecast Inc.')
    expect(license).toContain('MIT License')
    expect(notice).toContain('https://github.com/stablyai/orca')
    expect(notice).toContain('https://github.com/yongwuzhijin/orca')
    expect(readFileSync('package.json', 'utf8')).toContain('"electron": "43.7.5"')
  })

  it('has the Chinese unsupported-html banner and its English line', () => {
    expect(message('zh', 'unsupported-html')).toBe('含 HTML、JSX 或 MDX')
    expect(message('en', 'unsupported-html')).toBe('This file contains HTML, JSX, or MDX.')
  })
})
