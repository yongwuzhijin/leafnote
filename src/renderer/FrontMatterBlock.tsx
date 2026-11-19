export function FrontMatterBlock(props: { raw: string | null; label: string }) {
  if (!props.raw) {
    return null
  }
  return (
    <pre className="front-matter" aria-label={props.label}>
      {props.raw}
    </pre>
  )
}
