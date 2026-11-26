import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DocumentApp } from './DocumentApp'
import './startup-open'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.css'
import './app.css'
import './styles/rich-markdown-editor.css'
import './styles/markdown-preview.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    <StrictMode>
      <DocumentApp />
    </StrictMode>
  )
}
