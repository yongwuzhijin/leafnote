export function SourceEditor(props: { value: string; onChange(value: string): void }) {
  return (
    <textarea
      className="source-editor"
      spellCheck={false}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}
