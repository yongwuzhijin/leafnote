import { describe, expect, it } from 'vitest'
import { createMenuDispatcher } from './menu-target'

describe('menu target', () => {
  it('sends the command to the window focused at click time', () => {
    const first = {
      id: 1,
      destroyed: false,
      commands: [] as string[],
      send(command: string) {
        this.commands.push(command)
      }
    }
    const second = {
      id: 2,
      destroyed: false,
      commands: [] as string[],
      send(command: string) {
        this.commands.push(command)
      }
    }
    let focused: typeof first | null = first
    const dispatch = createMenuDispatcher(() => focused)
    dispatch('save')
    focused = second
    dispatch('save')
    expect(first.commands).toEqual(['save'])
    expect(second.commands).toEqual(['save'])
  })

  it('does not send a command when no window is focused', () => {
    const window = {
      id: 1,
      destroyed: false,
      commands: [] as string[],
      send(command: string) {
        this.commands.push(command)
      }
    }
    const dispatch = createMenuDispatcher(() => null)
    dispatch('save')
    expect(window.commands).toEqual([])
  })
})
