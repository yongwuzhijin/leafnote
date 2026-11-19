import { describe, expect, it } from 'vitest'
import { findInDocument } from './find-in-document'

describe('find', () => {
  it('finds the query inside one document', () => {
    expect(findInDocument('alpha Beta', 'beta')).toEqual([{ start: 6, end: 10 }])
  })

  it('returns no matches for an empty query', () => {
    expect(findInDocument('alpha', '')).toEqual([])
  })
})
