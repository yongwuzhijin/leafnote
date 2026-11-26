import type { ReactNodeViewRendererOptions } from '@tiptap/react'

type NodeViewUpdate = NonNullable<ReactNodeViewRendererOptions['update']>

/** Skip React renders when only the document position changed. Copied from Orca. */
export const positionStableNodeViewUpdate: NodeViewUpdate = ({
  oldNode,
  oldDecorations,
  oldInnerDecorations,
  newNode,
  newDecorations,
  innerDecorations,
  updateProps
}) => {
  if (
    oldNode === newNode &&
    oldDecorations === newDecorations &&
    oldInnerDecorations === innerDecorations
  ) {
    return true
  }
  updateProps()
  return true
}
