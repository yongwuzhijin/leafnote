import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, protocol, shell } from 'electron'
import type { MenuCommand, OpenDocumentResult } from '../shared/leafnote-api'
import { chooseLocale } from '../shared/locale'
import { message } from '../shared/messages'
import { copyImageIntoDocument, readDocumentImage } from './image-files'
import { createHandlers, type HandlerDeps } from './ipc-handlers'
import { createMenuDispatcher } from './menu-target'
import { allowWindowClose, attachWindowClose, canUseWindow } from './window-lifecycle'
import { applyWindowGuards, APP_ORIGIN, webPreferences } from './window-host'
import { writeFileAtomic } from './write-file-atomic'

function appRoot(): string {
  return app.getAppPath()
}
const documentFilters = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx'] }]
const imageFilters = [
  { name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg'] }
]

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false }
  }
])

const handlersByWebContents = new Map<number, ReturnType<typeof createHandlers>>()
const closing = new Set<number>()
const pendingPaths: string[] = []

function locale() {
  return chooseLocale(app.getLocale())
}

function dependencies(win: BrowserWindow): HandlerDeps {
  return {
    showOpen: async () => {
      if (win.isDestroyed()) {
        return null
      }
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: documentFilters
      })
      return result.canceled ? null : (result.filePaths[0] ?? null)
    },
    showSave: async () => {
      if (win.isDestroyed()) {
        return null
      }
      const result = await dialog.showSaveDialog(win, {
        filters: documentFilters
      })
      return result.canceled ? null : (result.filePath ?? null)
    },
    readFile: async (filePath) => new Uint8Array(await readFile(filePath)),
    statFile: async (filePath) => {
      const info = await stat(filePath)
      return { mtimeMs: info.mtimeMs, size: info.size, isFile: info.isFile() }
    },
    writeAtomic: writeFileAtomic,
    confirm: async () => {
      if (win.isDestroyed()) {
        return 'cancel'
      }
      const current = locale()
      const result = await dialog.showMessageBox(win, {
        type: 'warning',
        message: message(current, 'save-prompt'),
        buttons: [message(current, 'save'), message(current, 'discard'), message(current, 'cancel')],
        defaultId: 0,
        cancelId: 2,
        noLink: true
      })
      return (['save', 'discard', 'cancel'] as const)[result.response] ?? 'cancel'
    },
    writeClipboard: async (text) => {
      clipboard.writeText(text)
    },
    pickImagePath: async () => {
      if (win.isDestroyed()) {
        return null
      }
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: imageFilters
      })
      return result.canceled ? null : (result.filePaths[0] ?? null)
    },
    copyIntoDirectory: (documentPath, sourcePath) => copyImageIntoDocument(documentPath, sourcePath),
    readImageBytes: (documentPath, src) => readDocumentImage(documentPath, src)
  }
}

function installMenu(): void {
  const current = locale()
  const dispatch = createMenuDispatcher(() => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win || !canUseWindow(win)) {
      return null
    }
    const contents = win.webContents
    const windowId = win.id
    return {
      id: windowId,
      destroyed: false,
      send: (command) => {
        if (!canUseWindow(win)) {
          return
        }
        contents.send('menu-command', command)
      }
    }
  })
  const send = (command: MenuCommand) => dispatch(command)
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: '叶笺',
        submenu: [
          { label: message(current, 'new'), accelerator: 'CmdOrCtrl+N', click: () => send('new') },
          { label: message(current, 'open'), accelerator: 'CmdOrCtrl+O', click: () => send('open') },
          { label: message(current, 'save'), accelerator: 'CmdOrCtrl+S', click: () => send('save') },
          { label: message(current, 'save-as'), accelerator: 'CmdOrCtrl+Shift+S', click: () => send('save-as') },
          { type: 'separator' },
          { role: 'quit', label: current === 'zh' ? '退出叶笺' : 'Quit LeafNote' }
        ]
      },
      {
        label: current === 'zh' ? '编辑' : 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
          { role: 'selectAll' },
          { label: message(current, 'find'), accelerator: 'CmdOrCtrl+F', click: () => send('find') }
        ]
      }
    ])
  )
}

function createWindow(initialPath?: string): BrowserWindow {
  const win = new BrowserWindow({
    width: 1120,
    height: 820,
    minWidth: 720,
    minHeight: 480,
    title: '叶笺',
    backgroundColor: '#ffffff',
    webPreferences: webPreferences(join(appRoot(), 'dist', 'preload', 'index.cjs'))
  })
  const handlers = createHandlers(dependencies(win))
  const webContentsId = attachWindowClose({
    win,
    closing,
    onClosed: (id) => {
      handlersByWebContents.delete(id)
    }
  })
  handlersByWebContents.set(webContentsId, handlers)
  applyWindowGuards(win, (url) => {
    void shell.openExternal(url)
  })
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error('did-fail-load', code, description, url)
  })
  win.webContents.on('did-finish-load', () => {
    if (initialPath) {
      setTimeout(() => {
        void handlers.openPath(initialPath).then((opened) => {
          if (!canUseWindow(win)) {
            return
          }
          win.webContents.send('open-from-os', opened satisfies OpenDocumentResult)
        })
      }, 400)
    }
  })
  void win.loadURL(`${APP_ORIGIN}/index.html`)
  return win
}

function handlersFor(id: number) {
  const handlers = handlersByWebContents.get(id)
  if (!handlers) {
    throw new Error('denied')
  }
  return handlers
}

function registerIpc(): void {
  ipcMain.handle('openDocument', (event) => handlersFor(event.sender.id).openDocument())
  ipcMain.handle('saveDocument', (event, input) => handlersFor(event.sender.id).saveDocument(input))
  ipcMain.handle('saveDocumentAs', (event, input) => handlersFor(event.sender.id).saveDocumentAs(input))
  ipcMain.handle('pickImage', (event) => handlersFor(event.sender.id).pickImage())
  ipcMain.handle('importImage', (event, input) => handlersFor(event.sender.id).importImage(input))
  ipcMain.handle('readImage', (event, input) => handlersFor(event.sender.id).readImage(input))
  ipcMain.handle('writeClipboard', (event, text: string) => handlersFor(event.sender.id).writeClipboard(text))
  ipcMain.handle('confirmDiscard', (event) => handlersFor(event.sender.id).confirmDiscard())
  ipcMain.handle('closeWindow', (event) => {
    if (event.sender.isDestroyed()) {
      return
    }
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) {
      return
    }
    allowWindowClose(closing, event.sender.id, win)
  })
}

async function serveApp(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const requested = decodeURIComponent(url.pathname)
  const relativePath = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '')
  const root = join(appRoot(), 'dist', 'renderer')
  const file = normalize(join(root, relativePath))
  const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`
  if (file !== root && !file.startsWith(rootPrefix)) {
    return new Response('denied', { status: 403 })
  }
  try {
    const bytes = await readFile(file)
    return new Response(bytes, { headers: { 'content-type': contentType(file) } })
  } catch {
    return new Response('missing', { status: 404 })
  }
}

function contentType(file: string): string {
  switch (extname(file)) {
    case '.html':
      return 'text/html; charset=utf-8'
    case '.js':
      return 'text/javascript; charset=utf-8'
    case '.css':
      return 'text/css; charset=utf-8'
    case '.svg':
      return 'image/svg+xml'
    case '.woff':
      return 'font/woff'
    case '.woff2':
      return 'font/woff2'
    case '.png':
      return 'image/png'
    default:
      return 'application/octet-stream'
  }
}

function markdownArguments(): string[] {
  return process.argv.filter((arg) => /\.(md|markdown|mdx)$/i.test(arg))
}

app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (app.isReady()) {
    createWindow(filePath)
    return
  }
  pendingPaths.push(filePath)
})

void app.whenReady().then(() => {
  protocol.handle('app', (request) => serveApp(request))
  registerIpc()
  installMenu()
  const paths = [...pendingPaths, ...markdownArguments()]
  pendingPaths.length = 0
  if (paths.length === 0) {
    createWindow()
  } else {
    for (const filePath of paths) {
      createWindow(filePath)
    }
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
