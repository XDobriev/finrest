import {
  parse54FzQrString,
  detectAndDecodeQrFromImage,
  type Parsed54FzQr,
} from './qr-54fz'
import {
  extractReceiptWithVision,
  type VisionReceiptResult,
  type VisionReceiptItem,
} from './vision-fallback'

export interface ReceiptPipelineInput {
  imageBuffer?: Buffer
  mimeType?: string
  rawQrString?: string
  rawText?: string
}

export interface ReceiptOcrResult {
  stage: 'qr_54fz' | 'vision_llm'
  amount: number
  date: Date
  vendor: string
  category: string
  confidence: number
  fiscalData?: {
    fn?: string
    i?: string
    fp?: string
    n?: string
    rawQr?: string
  }
  items?: VisionReceiptItem[]
  rawText?: string
}

/**
 * 2-Stage OCR Pipeline:
 * Stage 1: Fast 54-FZ QR code detection & parsing (<80ms, 0 tokens, 100% precision)
 * Stage 2: Multimodal Vision fallback for handwritten and commodity market receipts without QR
 */
export async function processReceiptPipeline(
  input: ReceiptPipelineInput
): Promise<ReceiptOcrResult> {
  const { imageBuffer, rawQrString, rawText, mimeType } = input

  // --- STAGE 1: 54-FZ QR Code Detection ---
  let qrCodeString = rawQrString || null

  // If no raw QR string provided but image buffer is present, try decoding QR code
  if (!qrCodeString && imageBuffer) {
    qrCodeString = detectAndDecodeQrFromImage(imageBuffer)
  }

  if (qrCodeString) {
    const parsedQr: Parsed54FzQr | null = parse54FzQrString(qrCodeString)
    if (parsedQr) {
      return {
        stage: 'qr_54fz',
        amount: parsedQr.amount,
        date: parsedQr.date,
        vendor: 'Кассовый чек (54-ФЗ)',
        category: 'food', // Default for restaurant supply purchases, can be refined
        confidence: 1.0,
        fiscalData: {
          fn: parsedQr.fn,
          i: parsedQr.i,
          fp: parsedQr.fp,
          n: parsedQr.n,
          rawQr: parsedQr.rawQr,
        },
        rawText: qrCodeString,
      }
    }
  }

  // --- STAGE 2: Multimodal Vision Fallback ---
  const visionResult: VisionReceiptResult = await extractReceiptWithVision({
    imageBuffer,
    mimeType,
    rawText,
  })

  return {
    stage: 'vision_llm',
    amount: visionResult.totalAmount,
    date: visionResult.date,
    vendor: visionResult.vendor,
    category: visionResult.suggestedCategory,
    confidence: visionResult.confidence,
    items: visionResult.items,
    rawText: rawText || (visionResult.items ? JSON.stringify(visionResult.items) : undefined),
  }
}
