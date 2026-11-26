export type CloseEvent = {
  preventDefault(): void
}

export type WindowCloseTarget = {
  isDestroyed(): boolean
  webContents: {
    id: number
    isDestroyed(): boolean
    send(channel: string, payload: string): void
  }
  on(event: 'close' | 'closed', listener: (event: CloseEvent) => void): void
}

export function canUseWindow(win: { isDestroyed(): boolean; webContents: { isDestroyed(): boolean } }): boolean {
  if (win.isDestroyed()) {
    return false
  }
  return !win.webContents.isDestroyed()
}

/** Cache the webContents id before `closed`. Electron destroys the window first, so reading it there throws. */
export function attachWindowClose(input: {
  win: WindowCloseTarget
  closing: Set<number>
  onClosed(webContentsId: number): void
}): number {
  const webContentsId = input.win.webContents.id
  input.win.on('close', (event) => {
    if (!canUseWindow(input.win)) {
      return
    }
    if (input.closing.has(webContentsId)) {
      return
    }
    event.preventDefault()
    input.win.webContents.send('menu-command', 'close')
  })
  input.win.on('closed', () => {
    input.onClosed(webContentsId)
    input.closing.delete(webContentsId)
  })
  return webContentsId
}

export function allowWindowClose(closing: Set<number>, webContentsId: number, win: { isDestroyed(): boolean; close(): void }): void {
  if (win.isDestroyed()) {
    return
  }
  closing.add(webContentsId)
  win.close()
}
