import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { MermaidBlock } from '../renderer/mermaid-block'

const LANGUAGES: ReadonlyArray<readonly [string, string]> = [
  ['', 'Plain text'],
  ['bash', 'Bash'],
  ['c', 'C'],
  ['cpp', 'C++'],
  ['css', 'CSS'],
  ['diff', 'Diff'],
  ['go', 'Go'],
  ['html', 'HTML'],
  ['java', 'Java'],
  ['javascript', 'JavaScript'],
  ['json', 'JSON'],
  ['markdown', 'Markdown'],
  ['mermaid', 'Mermaid'],
  ['python', 'Python'],
  ['ruby', 'Ruby'],
  ['rust', 'Rust'],
  ['shell', 'Shell'],
  ['sql', 'SQL'],
  ['swift', 'Swift'],
  ['typescript', 'TypeScript'],
  ['xml', 'XML'],
  ['yaml', 'YAML']
]

function languageLabel(value: string): string {
  return LANGUAGES.find(([language]) => language === value)?.[1] ?? (value || 'Plain text')
}

export function LeafNoteCodeBlock({ node, updateAttributes }: NodeViewProps) {
  const language = (node.attrs.language as string) || ''
  const [copied, setCopied] = useState(false)
  const [languageListMounted, setLanguageListMounted] = useState(false)
  const known = LANGUAGES.some(([value]) => value === language)

  return (
    <NodeViewWrapper className="rich-markdown-code-block-wrapper">
      <select
        className="rich-markdown-code-block-lang"
        contentEditable={false}
        value={language}
        aria-label="Code block language"
        onMouseDown={() => setLanguageListMounted(true)}
        onFocus={() => setLanguageListMounted(true)}
        onChange={(event) => updateAttributes({ language: event.target.value })}
      >
        {languageListMounted ? (
          LANGUAGES.map(([value, label]) => (
            <option key={value || 'plain'} value={value}>
              {label}
            </option>
          ))
        ) : (
          <option value={language}>{languageLabel(language)}</option>
        )}
        {languageListMounted && language && !known ? (
          <option value={language}>{language}</option>
        ) : null}
      </select>
      <button
        type="button"
        className="code-block-copy-btn"
        contentEditable={false}
        aria-label="Copy code"
        onClick={(event) => {
          event.stopPropagation()
          void navigator.clipboard?.writeText(node.textContent).then(() => {
            setCopied(true)
            window.setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <NodeViewContent<'pre'> as="pre" />
      {language === 'mermaid' && node.textContent.trim() ? (
        <div contentEditable={false} className="mermaid-preview">
          <MermaidBlock content={node.textContent.trim()} />
        </div>
      ) : null}
    </NodeViewWrapper>
  )
}
