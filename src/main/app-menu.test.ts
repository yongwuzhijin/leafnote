import { describe, expect, it } from 'vitest'
import type { MenuCommand } from '../shared/leafnote-api'
import { appShortcuts } from '../shared/shortcuts'
import { createAppMenuTemplate, shortcutCommands } from './app-menu'

describe('application menu shortcuts', () => {
  it('sends the file, find, and preview commands for the macOS accelerators', () => {
    const sent: MenuCommand[] = []
    const commands = shortcutCommands(createAppMenuTemplate('zh', (command) => sent.push(command)))
    const byAccelerator = new Map(commands.map((item) => [item.accelerator, item.run]))
    expect([...byAccelerator.keys()].sort()).toEqual(
      [
        appShortcuts.new,
        appShortcuts.open,
        appShortcuts.save,
        appShortcuts['save-as'],
        appShortcuts.close,
        appShortcuts.find,
        appShortcuts['toggle-preview']
      ].sort()
    )
    byAccelerator.get(appShortcuts.new)?.()
    byAccelerator.get(appShortcuts.open)?.()
    byAccelerator.get(appShortcuts.save)?.()
    byAccelerator.get(appShortcuts['save-as'])?.()
    byAccelerator.get(appShortcuts.close)?.()
    byAccelerator.get(appShortcuts.find)?.()
    byAccelerator.get(appShortcuts['toggle-preview'])?.()
    expect(sent).toEqual(['new', 'open', 'save', 'save-as', 'close', 'find', 'toggle-preview'])
  })
})
