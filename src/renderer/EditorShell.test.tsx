import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorShell } from './EditorShell'

afterEach(() => cleanup())

const session = {
  path: '/a.md',
  baseline: '[id]: https://example.com\n',
  buffer: '[id]: https://example.com\n',
  surface: 'source' as const,
  reason: 'reference-links' as const,
  mode: 'edit' as const,
  bom: false
}

describe('EditorShell', () => {
  it('shows the reference-link banner and a dirty marker after typing', () => {
    const onChange = vi.fn()
    render(<EditorShell session={session} locale="zh" onChange={onChange} onMode={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('含引用式链接')).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'changed\n' } })
    expect(screen.getByLabelText('未存储')).toBeTruthy()
  })

  it('uses the icon toolbar instead of debug block chips', () => {
    render(
      <EditorShell
        session={{ ...session, surface: 'rich', reason: null, buffer: '# Hi\n', baseline: '# Hi\n' }}
        locale="zh"
        onChange={vi.fn()}
        onMode={vi.fn()}
        onClose={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: 'heading-1' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'mermaid-fence' })).toBeNull()
    expect(screen.getByRole('button', { name: '标题 1' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '预览' })).toBeTruthy()
  })

  it('does not change the buffer when preview is selected', () => {
    const onChange = vi.fn()
    const onMode = vi.fn()
    render(<EditorShell session={{ ...session, surface: 'rich', reason: null, buffer: '# Hi\n', baseline: '# Hi\n' }} locale="zh" onChange={onChange} onMode={onMode} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '预览' }))
    expect(onMode).toHaveBeenCalledWith('preview')
    expect(onChange).not.toHaveBeenCalled()
  })
})
