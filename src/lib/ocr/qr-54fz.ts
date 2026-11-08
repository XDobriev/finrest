import jsQR from 'jsqr'
import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'

export interface Parsed54FzQr {
  amount: number
  date: Date
  fn: string
  i?: string
  fp?: string
  n?: string
  rawQr: string
}

/**
 * Parses date string from 54-FZ QR code.
 * Formats: YYYYMMDDTHHmmss, YYYYMMDDTHHmm, or ISO-8601.
 */
export function parse54FzDate(tStr: string): Date {
  const compactMatch = tStr.match(/^(\d{4})(\d{2})(\d{2})[Tt](\d{2})(\d{2})(\d{2})?$/)
  if (compactMatch) {
    const [, year, month, day, hour, min, sec] = compactMatch
    return new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(min, 10),
      sec ? parseInt(sec, 10) : 0
    )
  }

  const parsed = new Date(tStr)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

/**
 * Parses 54-FZ QR string (e.g. t=20261108T143000&s=12450.50&fn=9282440300829880&i=10556&fp=189504453&n=1)
 */
export function parse54FzQrString(raw: string): Parsed54FzQr | null {
  if (!raw || typeof raw !== 'string') return null

  // Ensure query string format (e.g. contains & or key=value)
  if (!raw.includes('=') || (!raw.toLowerCase().includes('t=') && !raw.toLowerCase().includes('s='))) {
    return null
  }

  const cleaned = raw.trim().replace(/^.*[?#]/, '')
  const params = new URLSearchParams(cleaned)

  const sVal = params.get('s') || params.get('S')
  const tVal = params.get('t') || params.get('T')
  const fnVal = params.get('fn') || params.get('FN')

  if (!sVal || !tVal) {
    return null
  }

  const amount = parseFloat(sVal.replace(/\s+/g, '').replace(',', '.'))
  if (isNaN(amount) || amount <= 0) {
    return null
  }

  const date = parse54FzDate(tVal)

  return {
    amount,
    date,
    fn: fnVal || '',
    i: params.get('i') || params.get('I') || undefined,
    fp: params.get('fp') || params.get('FP') || undefined,
    n: params.get('n') || params.get('N') || undefined,
    rawQr: raw,
  }
}

/**
 * Decodes image buffer (JPEG/PNG) to raw RGBA pixel data and runs jsQR scanner.
 */
export function detectAndDecodeQrFromImage(imageBuffer: Buffer): string | null {
  if (!imageBuffer || imageBuffer.length === 0) return null

  let rgbaData: Uint8Array | Uint8ClampedArray | null = null
  let width = 0
  let height = 0

  // 1. Check if PNG (magic 89 50 4E 47)
  if (
    imageBuffer.length > 4 &&
    imageBuffer[0] === 0x89 &&
    imageBuffer[1] === 0x50 &&
    imageBuffer[2] === 0x4e &&
    imageBuffer[3] === 0x47
  ) {
    try {
      const png = PNG.sync.read(imageBuffer)
      rgbaData = png.data
      width = png.width
      height = png.height
    } catch {
      // Fallback
    }
  }

  // 2. Check if JPEG (magic FF D8 FF)
  if (!rgbaData) {
    try {
      const decodedJpeg = jpeg.decode(imageBuffer, { useTArray: true })
      rgbaData = decodedJpeg.data
      width = decodedJpeg.width
      height = decodedJpeg.height
    } catch {
      // Not JPEG
    }
  }

  if (!rgbaData || width <= 0 || height <= 0) {
    return null
  }

  const clampedData = new Uint8ClampedArray(rgbaData.buffer, rgbaData.byteOffset, rgbaData.byteLength)
  const qrCode = jsQR(clampedData, width, height)

  return qrCode ? qrCode.data : null
}
