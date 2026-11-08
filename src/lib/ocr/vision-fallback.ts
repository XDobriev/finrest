import type { ExpenseCategory } from '@/types'
import { categorizeTransaction } from '../categorizer'

export interface VisionReceiptItem {
  name: string
  quantity: number
  unit?: string
  price: number
  total: number
}

export interface VisionReceiptResult {
  vendor: string
  date: Date
  totalAmount: number
  currency: string
  items?: VisionReceiptItem[]
  suggestedCategory: ExpenseCategory
  confidence: number
}

export interface VisionInput {
  imageBuffer?: Buffer
  mimeType?: string
  rawText?: string
}

/**
 * Heuristic parser for Russian market commodity slips, handwritten notes, and OCR texts.
 */
export function parseReceiptTextHeuristic(text: string): VisionReceiptResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  let vendor = 'Рыночный поставщик'
  let date = new Date()
  let totalAmount = 0
  const items: VisionReceiptItem[] = []

  // 1. Extract Vendor (look for ИП, ООО, Рынок or first descriptive header)
  for (const line of lines.slice(0, 5)) {
    if (/(ип|ооо|зао|пао|рынок|магазин|хозтовары|мясной)/i.test(line)) {
      vendor = line.replace(/^[#№\d.\s-]+/, '').trim()
      break
    }
  }

  // 2. Extract Date (DD.MM.YYYY, YYYY-MM-DD, or DD/MM/YYYY)
  const dateMatch = text.match(/(?:дата[:\s]*)?(\d{2})[./-](\d{2})[./-](\d{4})/i)
  if (dateMatch) {
    const [, day, month, year] = dateMatch
    const dNum = parseInt(day, 10)
    const mNum = parseInt(month, 10)
    const yNum = parseInt(year, 10)
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31 && yNum >= 2020 && yNum <= 2040) {
      date = new Date(yNum, mNum - 1, dNum)
    }
  } else {
    const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      const [, year, month, day] = isoMatch
      const dNum = parseInt(day, 10)
      const mNum = parseInt(month, 10)
      const yNum = parseInt(year, 10)
      if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31 && yNum >= 2020 && yNum <= 2040) {
        date = new Date(yNum, mNum - 1, dNum)
      }
    }
  }

  // 3. Extract Total Amount
  // Matches "Итого к оплате: 15400.00", "Итого: 15400.00", "Всего: 3000", "Сумма 12000"
  const totalMatch = text.match(
    /(?:итого(?:\s+к\s+оплате)?|всего(?:\s+к\s+оплате)?|к\s+оплате|сумма|итог)[:\s]*([0-9\s]+(?:[.,]\d{1,2})?)/i
  )
  if (totalMatch) {
    const cleanNum = totalMatch[1].replace(/\s/g, '').replace(',', '.')
    const parsedTotal = parseFloat(cleanNum)
    if (!isNaN(parsedTotal) && parsedTotal > 0) {
      totalAmount = parsedTotal
    }
  }

  // 4. Extract Line Items (e.g. "1. Томаты Баку - 20 кг х 450 = 9000" or "Моющее средство - 1800")
  for (const line of lines) {
    // Skip header or total lines
    if (/(итого|всего|к оплате|дата|чек|оплачено)/i.test(line)) continue

    const itemMatch = line.match(
      /^(?:\d+[.)]\s*)?(.+?)\s*[-–—]\s*(?:(\d+(?:[.,]\d+)?)\s*(кг|г|л|мл|шт|уп|пачек)?\s*[хx*]\s*(\d+(?:[.,]\d+)?)\s*=\s*)?(\d+(?:[.,]\d+)?)\s*(?:руб\.?|₽)?$/i
    )

    if (itemMatch) {
      const [, name, qtyStr, unit, priceStr, totalStr] = itemMatch
      const lineTotal = parseFloat((totalStr || '0').replace(',', '.'))
      const qty = qtyStr ? parseFloat(qtyStr.replace(',', '.')) : 1
      const price = priceStr ? parseFloat(priceStr.replace(',', '.')) : lineTotal / (qty || 1)

      if (lineTotal > 0) {
        items.push({
          name: name.trim(),
          quantity: qty,
          unit: unit || 'шт',
          price,
          total: lineTotal,
        })
      }
    }
  }

  // If totalAmount was not found explicitly, sum item totals
  if (totalAmount === 0 && items.length > 0) {
    totalAmount = items.reduce((sum, it) => sum + it.total, 0)
  }

  // If still 0, look for any standalone trailing currency figure
  if (totalAmount === 0) {
    const fallbackNumbers = text.match(/\b\d{3,7}(?:[.,]\d{2})?\b/g)
    if (fallbackNumbers && fallbackNumbers.length > 0) {
      const candidates = fallbackNumbers.map((n) => parseFloat(n.replace(',', '.'))).filter((n) => !isNaN(n))
      totalAmount = Math.max(...candidates)
    }
  }

  const suggestedCategory = categorizeTransaction(vendor, text)

  let confidence = 0.75
  if (totalAmount > 0) confidence += 0.1
  if (items.length > 0) confidence += 0.1
  if (vendor !== 'Рыночный поставщик') confidence += 0.05
  confidence = Math.min(0.98, confidence)

  return {
    vendor,
    date,
    totalAmount,
    currency: 'RUB',
    items: items.length > 0 ? items : undefined,
    suggestedCategory,
    confidence,
  }
}

/**
 * Stage 2: Multimodal Vision fallback for handwritten and commodity market receipts.
 * Uses Multimodal LLM when configured, or heuristic parser for local/mock processing.
 */
export async function extractReceiptWithVision(input: VisionInput): Promise<VisionReceiptResult> {
  const { imageBuffer, mimeType, rawText } = input

  // If raw text provided or no API key, use the heuristic engine
  if (rawText || !process.env.GEMINI_API_KEY) {
    const textToParse = rawText || 'Товарный чек\nРыночный поставщик\nСумма: 0.00'
    return parseReceiptTextHeuristic(textToParse)
  }

  // Optional: Multimodal Gemini 2.0 Flash call if API key exists
  try {
    const base64Data = imageBuffer ? imageBuffer.toString('base64') : ''
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'You are an expert restaurant accounting OCR system. Extract receipt data in Russian: vendor, date (YYYY-MM-DD), totalAmount (number), currency (RUB), items array ({name, quantity, unit, price, total}), suggestedCategory (food|bar|household|utilities|salary|other), confidence (0.0 to 1.0). Return pure JSON only.',
                },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      }
    )

    if (response.ok) {
      const data = await response.json()
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (rawJson) {
        const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()
        const parsed = JSON.parse(cleaned)
        return {
          vendor: parsed.vendor || 'Рыночный поставщик',
          date: parsed.date ? new Date(parsed.date) : new Date(),
          totalAmount: Number(parsed.totalAmount) || 0,
          currency: parsed.currency || 'RUB',
          items: parsed.items || [],
          suggestedCategory: parsed.suggestedCategory || 'food',
          confidence: Number(parsed.confidence) || 0.9,
        }
      }
    }
  } catch {
    // Fallback on network or parsing error
  }

  return parseReceiptTextHeuristic(rawText || '')
}
