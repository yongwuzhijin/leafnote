import type mermaid from 'mermaid'

export function getMermaidConfig(isDark: boolean): Parameters<typeof mermaid.initialize>[0] {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: isDark ? 'dark' : 'default',
    darkMode: isDark,
    htmlLabels: false
  }
}
