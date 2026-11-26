export type TooltipBox = { left: number; top: number; width: number; height: number }

const margin = 8
const gap = 6

export function placeTooltip(anchor: TooltipBox, tip: Pick<TooltipBox, 'width' | 'height'>, viewport: Pick<TooltipBox, 'width' | 'height'>): { top: number; left: number } {
  let top = anchor.top + anchor.height + gap
  if (top + tip.height > viewport.height - margin) {
    top = anchor.top - tip.height - gap
  }
  if (top < margin) {
    top = margin
  }
  let left = anchor.left + anchor.width / 2 - tip.width / 2
  const maxLeft = Math.max(margin, viewport.width - tip.width - margin)
  if (left < margin) {
    left = margin
  }
  if (left > maxLeft) {
    left = maxLeft
  }
  return { top, left }
}
