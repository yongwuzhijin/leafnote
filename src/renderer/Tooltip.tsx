import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactElement
} from 'react'
import { createPortal } from 'react-dom'
import { placeTooltip } from './tooltip-position'

export const TOOLTIP_DELAY_MS = 100

type TooltipChildProps = {
  disabled?: boolean
  style?: CSSProperties
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  'aria-describedby'?: string
}

export function Tooltip(props: { label: string; children: ReactElement<TooltipChildProps> }) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const [open, setOpen] = useState(false)
  const [placed, setPlaced] = useState(false)
  const id = useId()

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function hide() {
    clearTimer()
    setOpen(false)
    setPlaced(false)
  }

  function showSoon() {
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      setOpen(true)
    }, TOOLTIP_DELAY_MS)
  }

  useEffect(() => () => clearTimer(), [])

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !tipRef.current) {
      return
    }
    const anchor = anchorRef.current.getBoundingClientRect()
    const tip = tipRef.current.getBoundingClientRect()
    const next = placeTooltip(anchor, tip, { width: window.innerWidth, height: window.innerHeight })
    tipRef.current.style.top = `${next.top}px`
    tipRef.current.style.left = `${next.left}px`
    setPlaced(true)
  }, [open, props.label])

  useEffect(() => {
    if (!open) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        hide()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!isValidElement(props.children)) {
    return props.children
  }

  const child = props.children
  const disabled = Boolean(child.props.disabled)

  return (
    <span
      ref={anchorRef}
      className="leaf-tooltip-anchor"
      onMouseEnter={showSoon}
      onMouseLeave={hide}
      onFocusCapture={(event: FocusEvent<HTMLSpanElement>) => {
        const target = event.target
        if (target instanceof HTMLElement && target.matches(':focus-visible')) {
          showSoon()
        }
      }}
      onBlurCapture={hide}
      onPointerDown={hide}
    >
      {cloneElement(child, {
        'aria-describedby': open ? id : undefined,
        style: disabled ? { ...child.props.style, pointerEvents: 'none' } : child.props.style,
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          hide()
          child.props.onClick?.(event)
        }
      })}
      {open
        ? createPortal(
            <div
              ref={tipRef}
              id={id}
              role="tooltip"
              className="leaf-tooltip"
              style={{ visibility: placed ? 'visible' : 'hidden' }}
            >
              {props.label}
            </div>,
            document.body
          )
        : null}
    </span>
  )
}
