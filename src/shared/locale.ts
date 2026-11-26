export type LeafNoteLocale = 'zh' | 'en'

export function chooseLocale(language: string): LeafNoteLocale {
  return language.toLowerCase().startsWith('en') ? 'en' : 'zh'
}
