import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MarkdownPreviewView } from './preview-view'

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({ svg: '<svg><text>Start</text></svg>' }))
  }
}))

afterEach(() => cleanup())

describe('MarkdownPreviewView', () => {
  it('renders a mermaid fence as a diagram instead of raw source', async () => {
    const view = render(
      <MarkdownPreviewView markdown={'```mermaid\ngraph TD\n  A[Start] --> B[End]\n```'} locale="zh" />
    )
    await waitFor(() => {
      expect(view.container.querySelector('.mermaid-block')).toBeTruthy()
    })
    expect(view.container.querySelector('pre')).toBeNull()
    expect(view.container.textContent).toContain('Start')
    expect(view.container.textContent).not.toContain('graph TD')
  })
})