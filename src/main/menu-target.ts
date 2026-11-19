export type MenuWindow = {
  id: number
  destroyed: boolean
  send(command: string): void
}

export function createMenuDispatcher(getFocused: () => MenuWindow | null) {
  return (command: string) => {
    const target = getFocused()
    if (!target || target.destroyed) {
      return
    }
    target.send(command)
  }
}
