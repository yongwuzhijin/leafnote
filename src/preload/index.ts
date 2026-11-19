import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { LeafNoteApi, MenuCommand, OpenDocumentResult } from '../shared/leafnote-api'

const api: LeafNoteApi = {
  openDocument: () => ipcRenderer.invoke('openDocument'),
  saveDocument: (input) => ipcRenderer.invoke('saveDocument', input),
  saveDocumentAs: (input) => ipcRenderer.invoke('saveDocumentAs', input),
  pickImage: () => ipcRenderer.invoke('pickImage'),
  importImage: (input) => ipcRenderer.invoke('importImage', input),
  readImage: (input) => ipcRenderer.invoke('readImage', input),
  writeClipboard: (text) => ipcRenderer.invoke('writeClipboard', text),
  confirmDiscard: () => ipcRenderer.invoke('confirmDiscard'),
  closeWindow: () => ipcRenderer.invoke('closeWindow'),
  onOpenFromOs(callback) {
    const listener = (_event: IpcRendererEvent, result: OpenDocumentResult) => {
      callback(result)
    }
    ipcRenderer.on('open-from-os', listener)
    return () => {
      ipcRenderer.removeListener('open-from-os', listener)
    }
  },
  onMenuCommand(callback) {
    const listener = (_event: IpcRendererEvent, command: MenuCommand) => {
      callback(command)
    }
    ipcRenderer.on('menu-command', listener)
    return () => {
      ipcRenderer.removeListener('menu-command', listener)
    }
  }
}

contextBridge.exposeInMainWorld('leafnote', Object.freeze(api))
