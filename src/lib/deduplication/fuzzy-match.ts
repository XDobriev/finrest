import Fuse from 'fuse.js'

export function fuzzyMatch(str1: string, str2: string, threshold = 0.7): boolean {
  if (!str1 || !str2) return false

  // Exact match (case insensitive)
  if (str1.toLowerCase() === str2.toLowerCase()) return true

  // One contains the other
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  if (s1.includes(s2) || s2.includes(s1)) return true

  // Fuzzy match with Fuse.js
  const fuse = new Fuse([str1], {
    threshold,
    includeScore: true,
    keys: ['value'],
  })

  const fuseStr2 = [{ value: str2 }]
  fuse.setCollection(fuseStr2)

  const results = fuse.search(str1)
  return results.length > 0 && (results[0].score ?? 1) <= threshold
}

export function fuzzySimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1.toLowerCase() === str2.toLowerCase()) return 1

  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  if (s1.includes(s2) || s2.includes(s1)) return 0.85

  // Levenshtein-based similarity
  const len1 = s1.length
  const len2 = s2.length
  const maxLen = Math.max(len1, len2)

  if (maxLen === 0) return 1

  // Quick distance calculation
  const matrix: number[][] = []
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const distance = matrix[len1][len2]
  return 1 - distance / maxLen
}
