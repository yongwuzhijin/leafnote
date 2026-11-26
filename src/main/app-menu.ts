import type { MenuCommand } from '../shared/leafnote-api'
import type { LeafNoteLocale } from '../shared/locale'
import { message } from '../shared/messages'
import { appShortcuts } from '../shared/shortcuts'

export type AppMenuItem = {
  label?: string
  accelerator?: string
  type?: 'separator'
  role?: 'quit' | 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll'
  click?: () => void
  submenu?: AppMenuItem[]
}

export function createAppMenuTemplate(locale: LeafNoteLocale, send: (command: MenuCommand) => void): AppMenuItem[] {
  return [
    {
      label: '叶笺',
      submenu: [
        { label: message(locale, 'new'), accelerator: appShortcuts.new, click: () => send('new') },
        { label: message(locale, 'open'), accelerator: appShortcuts.open, click: () => send('open') },
        { label: message(locale, 'save'), accelerator: appShortcuts.save, click: () => send('save') },
        { label: message(locale, 'save-as'), accelerator: appShortcuts['save-as'], click: () => send('save-as') },
        { label: message(locale, 'close'), accelerator: appShortcuts.close, click: () => send('close') },
        { type: 'separator' },
        {
          label: message(locale, 'toggle-preview'),
          accelerator: appShortcuts['toggle-preview'],
          click: () => send('toggle-preview')
        },
        { type: 'separator' },
        { role: 'quit', label: locale === 'zh' ? '退出叶笺' : 'Quit LeafNote' }
      ]
    },
    {
      label: locale === 'zh' ? '编辑' : 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { label: message(locale, 'find'), accelerator: appShortcuts.find, click: () => send('find') }
      ]
    }
  ]
}

export function shortcutCommands(template: AppMenuItem[]): Array<{ accelerator: string; run(): void }> {
  const found: Array<{ accelerator: string; run(): void }> = []
  const visit = (items: AppMenuItem[]) => {
    for (const item of items) {
      if (item.accelerator && item.click) {
        const click = item.click
        found.push({ accelerator: item.accelerator, run: () => click() })
      }
      if (item.submenu) {
        visit(item.submenu)
      }
    }
  }
  visit(template)
  return found
}
