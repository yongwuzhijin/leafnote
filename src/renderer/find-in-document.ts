export function findInDocument(text: string, query: string): { start: number; end: number }[] {
  if (query.length === 0) {
    return []
  }
  const haystack = text.toLowerCase()
  const needle = query.toLowerCase()
  const matches: { start: number; end: number }[] = []
  let index = 0
  while (index < haystack.length) {
    const found = haystack.indexOf(needle, index)
    if (found === -1) {
      break
    }
    matches.push({ start: found, end: found + needle.length })
    index = found + Math.max(needle.length, 1)
  }
  return matches
}
