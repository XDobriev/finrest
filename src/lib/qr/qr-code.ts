/**
 * Compact, zero-dependency QR Code generator in pure TypeScript.
 * Generates an SVG path or matrix for any URL / string (supports Byte mode, versions 1-10).
 */

// GF(256) math
const EXP_TABLE = new Uint8Array(512)
const LOG_TABLE = new Uint8Array(256)

;(function initGF() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x
    EXP_TABLE[i + 255] = x
    LOG_TABLE[x] = i
    x <<= 1
    if (x & 256) x ^= 0x11d
  }
})()

function gexp(n: number): number {
  return EXP_TABLE[((n % 255) + 255) % 255]
}

function glog(n: number): number {
  if (n === 0) throw new Error('glog(0)')
  return LOG_TABLE[n]
}

function rsMultiply(p1: number[], p2: number[]): number[] {
  const result = new Array(p1.length + p2.length - 1).fill(0)
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      if (p1[i] !== 0 && p2[j] !== 0) {
        result[i + j] ^= gexp(glog(p1[i]) + glog(p2[j]))
      }
    }
  }
  return result
}

function rsGeneratorPoly(numEcBytes: number): number[] {
  let poly = [1]
  for (let i = 0; i < numEcBytes; i++) {
    poly = rsMultiply(poly, [1, gexp(i)])
  }
  return poly
}

function rsComputeRemainder(data: number[], numEcBytes: number): number[] {
  const gen = rsGeneratorPoly(numEcBytes)
  const remainder = data.concat(new Array(numEcBytes).fill(0))
  for (let i = 0; i < data.length; i++) {
    const factor = remainder[i]
    if (factor !== 0) {
      for (let j = 0; j < gen.length; j++) {
        remainder[i + j] ^= gexp(glog(gen[j]) + glog(factor))
      }
    }
  }
  return remainder.slice(data.length)
}

// Version capacities (Medium Error Correction level 'M')
// [Version, Total Data Codewords, EC Codewords per block, Number of blocks]
const VERSION_M_CONFIG: Array<[number, number, number, number]> = [
  [1, 16, 10, 1],
  [2, 28, 16, 1],
  [3, 44, 26, 1],
  [4, 64, 18, 2],
  [5, 86, 24, 2],
  [6, 108, 16, 4],
  [7, 124, 18, 4],
  [8, 154, 22, 4],
  [9, 182, 22, 5],
  [10, 216, 26, 5],
]

const ALIGNMENT_PATTERN_POSITIONS: number[][] = [
  [], // V1
  [6, 18], // V2
  [6, 22], // V3
  [6, 26], // V4
  [6, 30], // V5
  [6, 34], // V6
  [6, 22, 38], // V7
  [6, 24, 42], // V8
  [6, 26, 46], // V9
  [6, 28, 50], // V10
]

const FORMAT_BITS_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
]

const VERSION_INFO: Record<number, number> = {
  7: 0x07c94,
  8: 0x085bc,
  9: 0x09a99,
  10: 0x0a4d3,
}

export interface QRCodeMatrix {
  size: number
  modules: boolean[][]
}

export function generateQRCodeMatrix(text: string): QRCodeMatrix {
  const utf8Bytes = new TextEncoder().encode(text)
  const byteCount = utf8Bytes.length

  // Find minimum version that fits data in Byte mode (header 4 bits + length bits)
  let selectedVersion = -1
  let dataCapacity = 0
  let ecBytesPerBlock = 0
  let numBlocks = 1

  for (const [ver, cap, ec, blocks] of VERSION_M_CONFIG) {
    const lengthBits = ver < 10 ? 8 : 16
    const totalBitsNeeded = 4 + lengthBits + byteCount * 8
    const totalCodewordsNeeded = Math.ceil(totalBitsNeeded / 8)
    if (totalCodewordsNeeded <= cap) {
      selectedVersion = ver
      dataCapacity = cap
      ecBytesPerBlock = ec
      numBlocks = blocks
      break
    }
  }

  if (selectedVersion === -1) {
    throw new Error(`Text too long for built-in QR generator (${byteCount} bytes)`)
  }

  // Bit buffer creation
  const bitLength = selectedVersion < 10 ? 8 : 16
  const bits: number[] = []

  function pushBits(val: number, length: number) {
    for (let i = length - 1; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }

  // 1. Mode indicator (0100 for Byte mode)
  pushBits(0b0100, 4)
  // 2. Character count indicator
  pushBits(byteCount, bitLength)
  // 3. Data bytes
  for (const b of utf8Bytes) {
    pushBits(b, 8)
  }

  // 4. Terminator (up to 4 zeros)
  const capacityBits = dataCapacity * 8
  const terminatorZeros = Math.min(4, capacityBits - bits.length)
  pushBits(0, terminatorZeros)

  // 5. Pad to multiple of 8
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // 6. Pad bytes 0xEC, 0x11
  const dataCodewords: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let byteVal = 0
    for (let b = 0; b < 8; b++) {
      byteVal = (byteVal << 1) | bits[i + b]
    }
    dataCodewords.push(byteVal)
  }

  const padBytes = [0xec, 0x11]
  let padIdx = 0
  while (dataCodewords.length < dataCapacity) {
    dataCodewords.push(padBytes[padIdx % 2])
    padIdx++
  }

  // Error correction calculation
  const blockSize = Math.floor(dataCapacity / numBlocks)
  const blocksData: number[][] = []
  const blocksEc: number[][] = []

  let offset = 0
  for (let b = 0; b < numBlocks; b++) {
    const curBlockLen = blockSize + (b >= numBlocks - (dataCapacity % numBlocks) ? 1 : 0)
    const blockData = dataCodewords.slice(offset, offset + curBlockLen)
    offset += curBlockLen
    blocksData.push(blockData)
    blocksEc.push(rsComputeRemainder(blockData, ecBytesPerBlock))
  }

  // Interleave data and EC codewords
  const finalCodewords: number[] = []
  const maxBlockLen = Math.max(...blocksData.map((b) => b.length))
  for (let i = 0; i < maxBlockLen; i++) {
    for (const b of blocksData) {
      if (i < b.length) finalCodewords.push(b[i])
    }
  }
  for (let i = 0; i < ecBytesPerBlock; i++) {
    for (const b of blocksEc) {
      finalCodewords.push(b[i])
    }
  }

  // Final bits
  const finalBits: number[] = []
  for (const byte of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      finalBits.push((byte >> i) & 1)
    }
  }
  // Add remainder bits for versions 2-6 (7 bits)
  const remainderBitsCount = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0][selectedVersion] || 0
  for (let i = 0; i < remainderBitsCount; i++) {
    finalBits.push(0)
  }

  // Build matrix
  const size = 17 + 4 * selectedVersion
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  )

  // 1. Finder patterns
  function addFinder(r: number, c: number) {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (dr === -1 || dr === 7 || dc === -1 || dc === 7) {
            matrix[nr][nc] = false // separator
          } else if (dr === 0 || dr === 6 || dc === 0 || dc === 6) {
            matrix[nr][nc] = true
          } else if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) {
            matrix[nr][nc] = true
          } else {
            matrix[nr][nc] = false
          }
        }
      }
    }
  }

  addFinder(0, 0)
  addFinder(0, size - 7)
  addFinder(size - 7, 0)

  // 2. Alignment patterns
  if (selectedVersion >= 2) {
    const positions = ALIGNMENT_PATTERN_POSITIONS[selectedVersion - 1]
    for (const ar of positions) {
      for (const ac of positions) {
        if (
          (ar === 6 && ac === 6) ||
          (ar === 6 && ac === positions[positions.length - 1]) ||
          (ar === positions[positions.length - 1] && ac === 6)
        ) {
          continue // skip finders
        }
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            if (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) {
              matrix[ar + dr][ac + dc] = true
            } else {
              matrix[ar + dr][ac + dc] = false
            }
          }
        }
      }
    }
  }

  // 3. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0
  }

  // 4. Dark module
  matrix[4 * selectedVersion + 9][8] = true

  // 5. Reserve format bits areas
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false
    if (matrix[i][8] === null) matrix[i][8] = false
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false
    if (matrix[i][8] === null) matrix[i][8] = false
  }

  // 5b. Reserve Version Information areas (Versions 7-10)
  if (selectedVersion >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        matrix[i][size - 11 + j] = false
        matrix[size - 11 + j][i] = false
      }
    }
  }

  // 6. Data placement (zigzag)
  let bitIdx = 0
  let right = size - 1
  let goingUp = true

  while (right > 0) {
    if (right === 6) right-- // skip vertical timing
    for (let vert = 0; vert < size; vert++) {
      const r = goingUp ? size - 1 - vert : vert
      for (let c = right; c >= right - 1; c--) {
        if (matrix[r][c] === null) {
          const bit = bitIdx < finalBits.length ? finalBits[bitIdx++] : 0
          // Apply Mask Pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0
          matrix[r][c] = (bit === 1) !== mask
        }
      }
    }
    right -= 2
    goingUp = !goingUp
  }

  // 7. Write Format Bits (Mask 0 with M error correction = 0x5412)
  const formatBits = FORMAT_BITS_M[0]
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> (14 - i)) & 1) === 1
    // Around top-left finder
    if (i < 6) matrix[8][i] = bit
    else if (i === 6) matrix[8][7] = bit
    else if (i === 7) matrix[8][8] = bit
    else if (i === 8) matrix[7][8] = bit
    else matrix[14 - i][8] = bit

    // Around top-right and bottom-left finders
    if (i < 8) matrix[size - 1 - i][8] = bit
    else matrix[8][size - 15 + i] = bit
  }

  // 8. Write Version Information (Versions 7-10)
  if (selectedVersion >= 7) {
    const vInfo = VERSION_INFO[selectedVersion]
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        const bit = ((vInfo >> (i * 3 + j)) & 1) === 1
        // Top-right block (rows 0..5, cols size-11..size-9)
        matrix[i][size - 11 + j] = bit
        // Bottom-left block (rows size-11..size-9, cols 0..5)
        matrix[size - 11 + j][i] = bit
      }
    }
  }

  // Convert to clean boolean array
  const cleanModules: boolean[][] = matrix.map((row) =>
    row.map((cell) => cell ?? false)
  )

  return { size, modules: cleanModules }
}

/**
 * Returns SVG path string for the QR code modules.
 */
export function getQRCodeSvgPath(matrix: QRCodeMatrix): string {
  const { size, modules } = matrix
  const parts: string[] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) {
        parts.push(`M${c},${r}h1v1h-1z`)
      }
    }
  }

  return parts.join(' ')
}
