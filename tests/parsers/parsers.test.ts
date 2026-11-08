import test from 'node:test'
import assert from 'node:assert/strict'
import { categorizeTransaction, detectTransactionType } from '../../src/lib/categorizer'
import { parse1CClientBank } from '../../src/lib/parsers/1c-bank'
import * as XLSX from 'xlsx'
import { parseExcelFile, decodeTextFile } from '../../src/lib/parsers'

test('1CClientBankExchange Parser: decodeTextFile correctly decodes UTF-8 and Windows-1251', () => {
  const russianSample = '1CClientBankExchange\nВерсияФормата=1.03\nПлательщик=ООО "Ресторан Оливье"\n'
  
  // 1. UTF-8 buffer
  const utf8Buffer = new TextEncoder().encode(russianSample).buffer
  const decodedUtf8 = decodeTextFile(utf8Buffer)
  assert.equal(decodedUtf8, russianSample)
  assert.ok(!decodedUtf8.includes('\uFFFD'))

  // 2. Windows-1251 buffer
  // Construct windows-1251 bytes for "1CClientBankExchange\n"
  const headerBytes = Array.from(Buffer.from('1CClientBankExchange\n'))
  // In windows-1251, 'О' = 0xCE, 'л' = 0xEB, 'и' = 0xE8, 'в' = 0xE2, 'ь' = 0xFC, 'е' = 0xE5
  const win1251Bytes = Buffer.from([...headerBytes, 0xCE, 0xEB, 0xE8, 0xE2, 0xFC, 0xE5, 0x0A])
  const decodedWin1251 = decodeTextFile(win1251Bytes.buffer)
  assert.ok(decodedWin1251.includes('1CClientBankExchange'))
  assert.ok(decodedWin1251.includes('Оливье'))
})

test('Categorizer: accurately classifies restaurant expenses', () => {
  assert.equal(categorizeTransaction('ООО ФудСнаб', 'Поставка мяса и овощей'), 'food')
  assert.equal(categorizeTransaction('ООО АлкоТрейд', 'Вино сухое красное'), 'bar')
  assert.equal(categorizeTransaction('ИП Иванов', 'Аванс по зарплате за ноябрь'), 'salary')
  assert.equal(categorizeTransaction('ООО Мосэнергосбыт', 'Оплата за электроэнергию'), 'utilities')
  assert.equal(categorizeTransaction('ООО Сити-Аренда', 'Арендная плата за ноябрь 2026'), 'rent')
  assert.equal(categorizeTransaction('ООО ХозТорг', 'Моющие средства и перчатки'), 'household')
  assert.equal(categorizeTransaction('Яндекс Директ', 'Рекламная кампания'), 'marketing')
  assert.equal(categorizeTransaction('ООО Айко Софт', 'Лицензия iikoCloud'), 'services')
  assert.equal(categorizeTransaction('Неизвестный контрагент', 'Неопознанный перевод'), 'other')
})

test('Categorizer: detects income vs expense', () => {
  assert.equal(detectTransactionType('Выручка по эквайрингу за смену', 125000, true), 'income')
  assert.equal(detectTransactionType('Поступление выручки от покупателей', 80000, false), 'income')
  assert.equal(detectTransactionType('Оплата поставщику за зелень', 12000, false), 'expense')
})

test('1CClientBankExchange Parser: parses bank statement text correctly', () => {
  const bankFileContent = `1CClientBankExchange
ВерсияФормата=1.03
Кодировка=Windows
Отправитель=Тинькофф Бизнес
ДатаНачала=01.06.2025
ДатаКонца=10.06.2025
РасчетныйСчет=40702810100000012345
НачальныйОстаток=500000.00
КонечныйОстаток=850000.00
ВсегоПоступило=600000.00
ВсегоСписано=250000.00
СекцияДокумент=Платежное поручение
Номер=101
Дата=01.06.2025
Сумма=45000.00
Плательщик=ООО "Ресторан Оливье"
Получатель=ООО "ФудСнаб"
НазначениеПлатежа=Оплата за говядину и сыры по счету 55
КонецДокумента
СекцияДокумент=Платежное поручение
Номер=102
Дата=02.06.2025
Сумма=150000.00
Плательщик=АО "Тинькофф Банк"
Получатель=ООО "Ресторан Оливье"
НазначениеПлатежа=Возмещение по операциям эквайринга за 01.06.2025
КонецДокумента
СекцияДокумент=Платежное поручение
Номер=103
Дата=03.06.2025
Сумма=28000.00
Плательщик=ООО "Ресторан Оливье"
Получатель=ООО "АлкоСнаб"
НазначениеПлатежа=Оплата за вино и пиво по накладной 89
КонецДокумента
КонецФайла`

  const parsed = parse1CClientBank(bankFileContent, 'Ресторан Оливье')

  assert.equal(parsed.success, true)
  assert.equal(parsed.totalRows, 3)
  assert.equal(parsed.rows.length, 3)

  // Document 1: Food expense
  const doc1 = parsed.rows[0]
  assert.equal(doc1.date, '2025-06-01')
  assert.equal(doc1.amount, 45000)
  assert.equal(doc1.type, 'expense')
  assert.equal(doc1.category, 'food')
  assert.equal(doc1.counterparty, 'ООО "ФудСнаб"')

  // Document 2: Inflow (income) from acquiring
  const doc2 = parsed.rows[1]
  assert.equal(doc2.date, '2025-06-02')
  assert.equal(doc2.amount, 150000)
  assert.equal(doc2.type, 'income')
  assert.equal(doc2.counterparty, 'АО "Тинькофф Банк"')

  // Document 3: Bar expense
  const doc3 = parsed.rows[2]
  assert.equal(doc3.date, '2025-06-03')
  assert.equal(doc3.amount, 28000)
  assert.equal(doc3.type, 'expense')
  assert.equal(doc3.category, 'bar')

  // Check metadata
  assert.equal(parsed.meta?.initialBalance, 500000)
  assert.equal(parsed.meta?.finalBalance, 850000)
  assert.equal(parsed.meta?.accountNumber, '40702810100000012345')
})

test('Excel Parser: parses XLSX table with auto-categorization', () => {
  const sampleData = [
    { 'Дата': '05.06.2025', 'Контрагент': 'ООО ХозТорг', 'Описание': 'Бытовая химия', 'Сумма': 18500 },
    { 'Дата': '06.06.2025', 'Контрагент': 'ИП Сидоров', 'Описание': 'Аванс повару', 'Сумма': 35000 },
    { 'Дата': '07.06.2025', 'Контрагент': 'Касса', 'Описание': 'Выручка зала', 'Сумма': 180000, 'Тип': 'доход' },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Данные')
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

  const res = parseExcelFile(buffer, 'admin')
  assert.equal(res.success, true)
  assert.equal(res.rows.length, 3)

  assert.equal(res.rows[0].category, 'household')
  assert.equal(res.rows[0].type, 'expense')

  assert.equal(res.rows[1].category, 'salary')
  assert.equal(res.rows[1].type, 'expense')

  assert.equal(res.rows[2].type, 'income')
  assert.equal(res.rows[2].amount, 180000)
})
