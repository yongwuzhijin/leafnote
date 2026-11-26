import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { TOOLTIP_DELAY_MS } from './Tooltip'
import { afterEach, describe, expect, it, vi } from 'vitest'
import leafLogo from '../../build/icon.png'
import type { LeafNoteApi, MenuCommand } from '../shared/leafnote-api'
import { chooseLocale } from '../shared/locale'
import { message } from '../shared/messages'
import { commandHint } from '../shared/shortcuts'
import { DocumentApp } from './DocumentApp'

afterEach(() => {
  cleanup()
  window.leafnote = undefined as unknown as LeafNoteApi
})

function installApi(): LeafNoteApi & { menu: (command: MenuCommand) => void } {
  let menu: (command: MenuCommand) => void = () => undefined
  const api: LeafNoteApi = {
    openDocument: vi.fn(async () => ({ status: 'canceled' as const })),
    saveDocument: vi.fn(async () => ({ status: 'canceled' as const })),
    saveDocumentAs: vi.fn(async () => ({ status: 'canceled' as const })),
    pickImage: vi.fn(async () => ({ status: 'canceled' as const })),
    importImage: vi.fn(async () => ({ status: 'denied' as const })),
    readImage: vi.fn(async () => ({ status: 'denied' as const })),
    writeClipboard: vi.fn(async () => undefined),
    confirmDiscard: vi.fn(async () => 'cancel' as const),
    closeWindow: vi.fn(async () => undefined),
    onOpenFromOs: vi.fn(() => () => undefined),
    onMenuCommand: vi.fn((callback: (command: MenuCommand) => void) => {
      menu = callback
      return () => undefined
    })
  }
  window.leafnote = api
  return Object.assign(api, {
    menu: (command: MenuCommand) => menu(command)
  })
}

function label(key: 'new' | 'open' | 'save' | 'save-as'): string {
  return message(chooseLocale(navigator.language), key)
}

function titleAction(name: string): HTMLButtonElement {
  const button = screen.getAllByRole('button', { name }).find((item) => item.classList.contains('titlebar-action'))
  if (!button) {
    throw new Error(`missing title action ${name}`)
  }
  return button as HTMLButtonElement
}

describe('DocumentApp chrome', () => {
  it('renders the leaf mark in the title bar and on the welcome page', () => {
    installApi()
    const view = render(<DocumentApp />)
    const marks = view.container.querySelectorAll('img.leaf-mark')
    expect(marks).toHaveLength(2)
    expect(view.container.querySelector('.leaf-mark-bar')?.getAttribute('src')).toBe(leafLogo)
    expect(view.container.querySelector('.leaf-mark-welcome')?.getAttribute('src')).toBe(leafLogo)
  })

  it('uses icon buttons with localized labels, and enables save only after a document exists', () => {
    const api = installApi()
    render(<DocumentApp />)
    for (const key of ['new', 'open', 'save', 'save-as'] as const) {
      const button = titleAction(label(key))
      expect(button.getAttribute('title')).toBeNull()
      expect(button.getAttribute('aria-label')).toBe(label(key))
      expect(button.textContent?.trim()).toBe('')
    }
    expect(titleAction(label('save')).disabled).toBe(true)
    expect(titleAction(label('save-as')).disabled).toBe(true)

    fireEvent.click(titleAction(label('open')))
    expect(api.openDocument).toHaveBeenCalledOnce()
    act(() => {
      api.menu('close')
    })
    expect(api.closeWindow).toHaveBeenCalledOnce()

    fireEvent.click(titleAction(label('new')))
    expect(screen.queryByText(message(chooseLocale(navigator.language), 'empty-hint'))).toBeNull()
    expect(titleAction(label('save')).disabled).toBe(false)
    fireEvent.click(titleAction(label('save')))
    expect(api.saveDocumentAs).toHaveBeenCalledOnce()

    act(() => {
      api.menu('toggle-preview')
    })
    expect(screen.getByRole('button', { name: message(chooseLocale(navigator.language), 'preview'), pressed: true })).toBeTruthy()

    vi.useFakeTimers()
    const save = titleAction(label('save'))
    fireEvent.mouseEnter(save.parentElement!)
    act(() => {
      vi.advanceTimersByTime(TOOLTIP_DELAY_MS)
    })
    expect(screen.getByRole('tooltip').textContent).toBe(commandHint(label('save'), 'save'))
    fireEvent.mouseLeave(save.parentElement!)
    expect(screen.queryByRole('tooltip')).toBeNull()
    vi.useRealTimers()
  })
})
