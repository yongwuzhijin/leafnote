import { extractFrontMatter } from '../editor/markdown-frontmatter'

type LiveEditor = {
  isDestroyed: boolean
  getMarkdown(): string
}

export function editedCanonicalForSave(editor: LiveEditor | null, draft: string): string {
  if (editor && !editor.isDestroyed) {
    try {
      return editor.getMarkdown()
    } catch {
      // The editor could not serialize. The draft already holds the edited text.
    }
  }
  const frontMatter = extractFrontMatter(draft)
  return frontMatter ? frontMatter.body.replace(/^\n/, '') : draft
}
