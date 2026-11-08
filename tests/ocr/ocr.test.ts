import test from 'node:test'
import assert from 'node:assert/strict'
import { parse54FzQrString } from '../../src/lib/ocr/qr-54fz'
import { extractReceiptWithVision } from '../../src/lib/ocr/vision-fallback'
import { processReceiptPipeline } from '../../src/lib/ocr/pipeline'

test('54-FZ QR Parser: accurately parses standard 54-FZ QR strings', () => {
  const qrRaw = 't=20261108T143000&s=12450.50&fn=9282440300829880&i=10556&fp=189504453&n=1'
  const parsed = parse54FzQrString(qrRaw)

  assert.ok(parsed, 'should successfully parse valid 54-FZ QR')
  assert.equal(parsed?.amount, 12450.50)
  assert.equal(parsed?.fn, '9282440300829880')
  assert.equal(parsed?.i, '10556')
  assert.equal(parsed?.fp, '189504453')
  assert.equal(parsed?.n, '1')
  assert.equal(parsed?.date.getFullYear(), 2026)
  assert.equal(parsed?.date.getMonth(), 10) // 10 is November (0-indexed)
  assert.equal(parsed?.date.getDate(), 8)
  assert.equal(parsed?.date.getHours(), 14)
  assert.equal(parsed?.date.getMinutes(), 30)
})

test('54-FZ QR Parser: handles short date format (YYYYMMDDTHHMM) and comma decimal separator', () => {
  const qrRaw = 't=20261108T0915&s=3500,00&fn=99990789&i=42&fp=123456'
  const parsed = parse54FzQrString(qrRaw)

  assert.ok(parsed)
  assert.equal(parsed?.amount, 3500.0)
  assert.equal(parsed?.date.getHours(), 9)
  assert.equal(parsed?.date.getMinutes(), 15)
})

test('54-FZ QR Parser: rejects invalid or non-54-FZ strings', () => {
  assert.equal(parse54FzQrString('https://example.com'), null)
  assert.equal(parse54FzQrString('some random text without params'), null)
  assert.equal(parse54FzQrString(''), null)
})

test('Vision Fallback: parses commodity market receipt text with itemized rows', async () => {
  const mockMarketReceiptText = `
    Товарный чек № 142
    ИП Мамедов А.Г. (Даниловский рынок)
    Дата: 08.11.2026
    1. Томаты Баку - 20 кг х 450 = 9000
    2. Кинза и базилик свежие - 10 кг х 640 = 6400
    Итого к оплате: 15400.00 руб.
    Оплачено наличными
  `

  const extracted = await extractReceiptWithVision({
    rawText: mockMarketReceiptText,
  })

  assert.ok(extracted)
  assert.equal(extracted.totalAmount, 15400)
  assert.match(extracted.vendor, /Мамедов|Даниловский/)
  assert.equal(extracted.suggestedCategory, 'food')
  assert.ok(extracted.items && extracted.items.length >= 2)
  assert.equal(extracted.confidence >= 0.8, true)
})

test('Vision Fallback: parses household/chemistry receipt accurately', async () => {
  const householdText = `
    ХозТовары плюс
    Чек от 08.11.2026
    Моющее средство для посуды 5л - 1800
    Салфетки бумажные 20 пачек - 1200
    Всего: 3000.00
  `

  const extracted = await extractReceiptWithVision({
    rawText: householdText,
  })

  assert.equal(extracted.totalAmount, 3000)
  assert.equal(extracted.suggestedCategory, 'household')
})

test('OCR Pipeline: Stage 1 (QR 54-FZ) takes precedence when QR is detected', async () => {
  const qrString = 't=20261108T180000&s=8250.00&fn=123456789&i=99&fp=777'

  const result = await processReceiptPipeline({
    rawQrString: qrString,
  })

  assert.equal(result.stage, 'qr_54fz')
  assert.equal(result.amount, 8250.00)
  assert.equal(result.fiscalData?.fn, '123456789')
  assert.equal(result.confidence, 1.0)
})

test('OCR Pipeline: Stage 2 (Vision LLM) activates when QR is absent', async () => {
  const nonQrReceipt = `
    ООО "Мясной Двор"
    Товарная накладная
    Дата: 2026-11-08
    Говядина вырезка 15 кг - 13500 руб.
    Итого: 13500 руб.
  `

  const result = await processReceiptPipeline({
    rawText: nonQrReceipt,
  })

  assert.equal(result.stage, 'vision_llm')
  assert.equal(result.amount, 13500)
  assert.equal(result.category, 'food')
  assert.match(result.vendor, /Мясной Двор/)
})

test('54-FZ QR Parser: parses lowercase t and space-separated amount', () => {
  const qrRaw = 't=20261108t164500&s=15 200,50&fn=1234567890&i=456&fp=789'
  const parsed = parse54FzQrString(qrRaw)

  assert.ok(parsed)
  assert.equal(parsed?.amount, 15200.50)
  assert.equal(parsed?.date.getHours(), 16)
  assert.equal(parsed?.date.getMinutes(), 45)
})

test('54-FZ QR Parser: handles uppercase parameter names (T=...&S=...)', () => {
  const qrRaw = 'T=20261108T120000&S=9500.00&FN=9988776655'
  const parsed = parse54FzQrString(qrRaw)

  assert.ok(parsed)
  assert.equal(parsed?.amount, 9500)
  assert.equal(parsed?.fn, '9988776655')
})

test('Vision Fallback: parses unitemized receipt with "Итого к оплате"', async () => {
  const receiptText = `
    Рынок Даниловский
    Товарный чек № 88
    Итого к оплате: 18 500.00 руб.
    Оплачено
  `
  const result = await extractReceiptWithVision({ rawText: receiptText })
  assert.equal(result.totalAmount, 18500)
  assert.match(result.vendor, /Даниловский/)
})

test('Vision Fallback: rejects phone/doc numbers from becoming rollover dates in year 5680', async () => {
  const receiptText = `
    ООО Поставщик
    Тел: 12-34-5678
    Сумма: 4500
  `
  const result = await extractReceiptWithVision({ rawText: receiptText })
  assert.equal(result.totalAmount, 4500)
  // Date should not roll over to year 5680+
  assert.ok(result.date.getFullYear() < 2100)
})

