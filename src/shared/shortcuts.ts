import type { MenuCommand } from './leafnote-api'

export const appShortcuts = {
  new: 'CmdOrCtrl+N',
  open: 'CmdOrCtrl+O',
  save: 'CmdOrCtrl+S',
  'save-as': 'CmdOrCtrl+Shift+S',
  close: 'CmdOrCtrl+W',
  find: 'CmdOrCtrl+F',
  'toggle-preview': 'CmdOrCtrl+Shift+V'
} as const satisfies Record<MenuCommand | 'toggle-preview', string>

export function macShortcutHint(accelerator: string): string {
  return accelerator.replaceAll('CmdOrCtrl+Shift+', '⇧⌘').replaceAll('CmdOrCtrl+', '⌘')
}

export function commandHint(label: string, command: keyof typeof appShortcuts): string {
  return `${label}（${macShortcutHint(appShortcuts[command])}）`
}
