import type { BrowserWindow, Session, WebContents } from 'electron'
import { isAllowedAppUrl, isSystemLink, windowSecurityOptions } from './navigation'

export const APP_ORIGIN = 'app://leafnote'

export function webPreferences(preloadPath: string) {
  return {
    preload: preloadPath,
    ...windowSecurityOptions()
  }
}

export function attachNavigationGuards(
  contents: WebContents,
  session: Session,
  openExternal: (url: string) => void
): void {
  contents.on('will-navigate', (event, url) => {
    if (isAllowedAppUrl(url, APP_ORIGIN)) {
      return
    }
    if (isSystemLink(url)) {
      openExternal(url)
    }
    event.preventDefault()
  })
  contents.setWindowOpenHandler(({ url }) => {
    if (isSystemLink(url)) {
      openExternal(url)
    }
    return { action: 'deny' }
  })
  session.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url
    if (url.startsWith('app:') || url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('devtools:')) {
      callback({})
      return
    }
    callback({ cancel: true })
  })
}

export function applyWindowGuards(window: BrowserWindow, openExternal: (url: string) => void): void {
  attachNavigationGuards(window.webContents, window.webContents.session, openExternal)
}
