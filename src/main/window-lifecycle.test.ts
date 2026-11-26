import { describe, expect, it, vi } from 'vitest'
import { allowWindowClose, attachWindowClose, type CloseEvent } from './window-lifecycle'

function createClosingWindow() {
  const closeListeners: Array<(event: CloseEvent) => void> = []
  const closedListeners: Array<() => void> = []
  let destroyed = false
  const sent: string[] = []
  const contents = {
    id: 11,
    isDestroyed: () => destroyed,
    send(_channel: string, payload: string) {
      if (destroyed) {
        throw new TypeError('Object has been destroyed')
      }
      sent.push(payload)
    }
  }
  const win = {
    isDestroyed: () => destroyed,
    get webContents() {
      if (destroyed) {
        throw new TypeError('Object has been destroyed')
      }
      return contents
    },
    on(event: 'close' | 'closed', listener: (event: CloseEvent) => void) {
      if (event === 'close') {
        closeListeners.push(listener)
        return
      }
      closedListeners.push(() => listener(undefined as unknown as CloseEvent))
    },
    close() {
      let prevented = false
      for (const listener of closeListeners) {
        listener({
          preventDefault() {
            prevented = true
          }
        })
      }
      if (prevented) {
        return
      }
      destroyed = true
      for (const listener of closedListeners) {
        listener()
      }
    }
  }
  return { win, sent, get destroyed() { return destroyed } }
}

describe('window close', () => {
  it('asks the renderer before a normal close, then cleans up after the window is destroyed', () => {
    const closing = new Set<number>()
    const removed: number[] = []
    const { win, sent } = createClosingWindow()
    const webContentsId = attachWindowClose({
      win,
      closing,
      onClosed: (id) => removed.push(id)
    })
    win.close()
    expect(sent).toEqual(['close'])
    expect(win.isDestroyed()).toBe(false)
    allowWindowClose(closing, webContentsId, win)
    expect(win.isDestroyed()).toBe(true)
    expect(removed).toEqual([11])
    expect(closing.has(11)).toBe(false)
  })

  it('keeps the window open while an unsaved document is being settled', () => {
    const closing = new Set<number>()
    const { win, sent } = createClosingWindow()
    const webContentsId = attachWindowClose({ win, closing, onClosed: () => undefined })
    win.close()
    win.close()
    expect(sent).toEqual(['close', 'close'])
    expect(win.isDestroyed()).toBe(false)
    allowWindowClose(closing, webContentsId, win)
    expect(win.isDestroyed()).toBe(true)
  })

  it('does not throw when closed runs after the window object is destroyed', () => {
    const closing = new Set<number>([11])
    const onClosed = vi.fn()
    const { win } = createClosingWindow()
    attachWindowClose({ win, closing, onClosed })
    expect(() => allowWindowClose(closing, 11, win)).not.toThrow()
    expect(onClosed).toHaveBeenCalledWith(11)
  })
})
