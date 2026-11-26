import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Tooltip, TOOLTIP_DELAY_MS } from './Tooltip'
import { placeTooltip } from './tooltip-position'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Tooltip', () => {
  it('shows after a short hover and hides as soon as the pointer leaves', () => {
    vi.useFakeTimers()
    render(
      <Tooltip label="新建（⌘N）">
        <button type="button" aria-label="新建">
          +
        </button>
      </Tooltip>
    )
    const button = screen.getByRole('button', { name: '新建' })
    expect(button.getAttribute('title')).toBeNull()
    fireEvent.mouseEnter(button.parentElement!)
    act(() => {
      vi.advanceTimersByTime(TOOLTIP_DELAY_MS - 1)
    })
    expect(screen.queryByRole('tooltip')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(screen.getByRole('tooltip').textContent).toBe('新建（⌘N）')
    fireEvent.mouseLeave(button.parentElement!)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('hides on click and Escape, including when the button is disabled', () => {
    vi.useFakeTimers()
    render(
      <Tooltip label="存储（⌘S）">
        <button type="button" aria-label="存储" disabled>
          s
        </button>
      </Tooltip>
    )
    const button = screen.getByRole('button', { name: '存储' })
    expect(button.getAttribute('title')).toBeNull()
    fireEvent.mouseEnter(button.parentElement!)
    act(() => {
      vi.advanceTimersByTime(TOOLTIP_DELAY_MS)
    })
    expect(screen.getByRole('tooltip')).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.mouseEnter(button.parentElement!)
    act(() => {
      vi.advanceTimersByTime(TOOLTIP_DELAY_MS)
    })
    fireEvent.pointerDown(button.parentElement!)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })
})

describe('placeTooltip', () => {
  it('keeps the tip inside the left and right edges', () => {
    expect(placeTooltip({ left: 0, top: 20, width: 24, height: 24 }, { width: 80, height: 24 }, { width: 200, height: 400 })).toMatchObject({
      left: 8
    })
    expect(placeTooltip({ left: 180, top: 20, width: 24, height: 24 }, { width: 80, height: 24 }, { width: 200, height: 400 })).toMatchObject({
      left: 112
    })
  })
})
