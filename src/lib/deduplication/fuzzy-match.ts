import Fuse from 'fuse.js'

const LEGAL_FORMS = new Set([
  'ооо',
  'зао',
  'оао',
  'пао',
  'ип',
  'ао',
  'llc',
  'jsc',
  'inc',
])

const TRANSLIT_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT_MAP[char] ?? char)
    .join('')
}

export function normalizeTokens(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[«»"'`]/g, '')
    .split(/[^a-zа-я0-9]+/i)
    .filter((token) => token.length > 0 && !LEGAL_FORMS.has(token))
}

export function fuzzyMatch(str1: string, str2: string, threshold = 0.7): boolean {
  if (!str1 || !str2) return false

  // Exact match (case insensitive)
  if (str1.toLowerCase() === str2.toLowerCase()) return true

  // One contains the other
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()
  if (s1.includes(s2) || s2.includes(s1)) return true

  // Fuzzy match with Fuse.js
  const fuse = new Fuse([{ value: str2 }], {
    threshold,
    includeScore: true,
    keys: ['value'],
  })

  const results = fuse.search(str1)
  return results.length > 0 && (results[0].score ?? 1) <= threshold
}

export function fuzzySimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  const s1 = str1.trim().toLowerCase()
  const s2 = str2.trim().toLowerCase()
  if (s1 === s2) return 1

  // Direct substring check
  if (s1.includes(s2) || s2.includes(s1)) return 0.85

  // Transliteration match (e.g. Luding vs Лудинг)
  const t1 = transliterate(s1)
  const t2 = transliterate(s2)
  if (t1 === t2 || t1.includes(t2) || t2.includes(t1)) return 0.85

  // Token-based normalization (e.g. 'ООО Мясоторг' vs 'МЯСОТОРГ ООО')
  const tokens1 = normalizeTokens(str1)
  const tokens2 = normalizeTokens(str2)

  if (tokens1.length > 0 && tokens2.length > 0) {
    const sorted1 = tokens1.slice().sort().join(' ')
    const sorted2 = tokens2.slice().sort().join(' ')
    if (sorted1 === sorted2) return 1
    if (sorted1.includes(sorted2) || sorted2.includes(sorted1)) return 0.85

    // Check transliterated sorted tokens
    const transSorted1 = transliterate(sorted1)
    const transSorted2 = transliterate(sorted2)
    if (transSorted1 === transSorted2 || transSorted1.includes(transSorted2) || transSorted2.includes(transSorted1)) {
      return 0.85
    }

    // Significant token stem overlap (e.g. 'Мосэнергосбыт' vs 'Мосэнерго', 'Ахмедов Овощи' vs 'Ахмедов А.Г.')
    for (const tokA of tokens1) {
      if (tokA.length >= 4) {
        for (const tokB of tokens2) {
          if (tokB.length >= 4) {
            const trA = transliterate(tokA)
            const trB = transliterate(tokB)
            if (tokA === tokB || tokA.includes(tokB) || tokB.includes(tokA) || trA === trB || trA.includes(trB) || trB.includes(trA)) {
              return 0.8
            }
          }
        }
      }
    }

    // Jaccard similarity on tokens
    const set1 = new Set(tokens1)
    const set2 = new Set(tokens2)
    let intersection = 0
    for (const t of set1) {
      if (set2.has(t)) intersection++
    }
    const union = new Set([...tokens1, ...tokens2]).size
    if (union > 0) {
      const jaccard = intersection / union
      if (jaccard >= 0.5) {
        return Math.max(0.75, jaccard)
      }
    }
  }

  // Fast length pre-filter
  const len1 = s1.length
  const len2 = s2.length
  const maxLen = Math.max(len1, len2)
  if (maxLen === 0) return 1
  if (Math.abs(len1 - len2) / maxLen > 0.6) {
    return Math.max(0, 1 - Math.abs(len1 - len2) / maxLen)
  }

  // Fast 1D array Levenshtein
  let prevRow = new Int32Array(len2 + 1)
  let currRow = new Int32Array(len2 + 1)
  for (let j = 0; j <= len2; j++) {
    prevRow[j] = j
  }

  for (let i = 1; i <= len1; i++) {
    currRow[0] = i
    const char1 = s1.charCodeAt(i - 1)
    for (let j = 1; j <= len2; j++) {
      const cost = char1 === s2.charCodeAt(j - 1) ? 0 : 1
      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost // substitution
      )
    }
    const temp = prevRow
    prevRow = currRow
    currRow = temp
  }

  const distance = prevRow[len2]
  return Math.max(0, 1 - distance / maxLen)
}
