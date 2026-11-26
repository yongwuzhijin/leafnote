import DOMPurify from 'dompurify'
import { useEffect, useId, useState } from 'react'
import { getMermaidConfig } from './mermaid-config'

type MermaidApi = typeof import('mermaid').default

let mermaidModulePromise: Promise<MermaidApi> | null = null
function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((mod) => mod.default)
  }
  return mermaidModulePromise
}

let renderQueue: Promise<void> = Promise.resolve()

function enqueueRender(fn: () => Promise<void>): void {
  const tail = renderQueue.then(fn, fn).then(() => {
    if (renderQueue === tail) {
      renderQueue = Promise.resolve()
    }
  })
  renderQueue = tail
}

export function MermaidBlock(props: { content: string; isDark?: boolean }) {
  const id = useId().replace(/:/g, '_')
  const isDark = props.isDark ?? false
  const [rendered, setRendered] = useState<{ content: string; svg?: string; error?: string } | null>(null)
  const result = rendered?.content === props.content ? rendered : null

  useEffect(() => {
    let cancelled = false
    const render = async (): Promise<void> => {
      try {
        const mermaid = await loadMermaid()
        if (cancelled) {
          return
        }
        mermaid.initialize(getMermaidConfig(isDark))
        const { svg } = await mermaid.render(`mermaid-${id}`, props.content)
        if (!cancelled) {
          setRendered({
            content: props.content,
            svg: DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true } })
          })
        }
      } catch (error) {
        if (!cancelled) {
          setRendered({
            content: props.content,
            error: error instanceof Error ? error.message : 'Invalid mermaid syntax'
          })
          document.getElementById(`dmermaid-${id}`)?.remove()
        }
      }
    }
    enqueueRender(render)
    return () => {
      cancelled = true
    }
  }, [props.content, id, isDark])

  if (result?.error) {
    return (
      <div className="mermaid-block">
        <div className="mermaid-error">Diagram error: {result.error}</div>
        <pre>
          <code>{props.content}</code>
        </pre>
      </div>
    )
  }
  return <div className="mermaid-block" dangerouslySetInnerHTML={result?.svg ? { __html: result.svg } : undefined} />
}
