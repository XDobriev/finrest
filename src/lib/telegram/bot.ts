import { Bot, InlineKeyboard } from 'grammy'
import type { UserFromGetMe } from 'grammy/types'
import { prisma } from '../db/client'
import {
  verifyAndLinkTelegramAccount,
  getTelegramAccount,
  setActiveVenue,
} from './auth'
import { generateFlashReportData, formatFlashReportMessage } from './flash-report'
import { processReceiptPipeline } from '../ocr/pipeline'
import { categorizeTransaction } from '../categorizer'
import { resolveDeduplicationPair } from '../db/transactions'

/**
 * Parses quick expense text in Russian.
 * Examples:
 * - "14500 зелень и овощи Фудсити нал"
 * - "Такси 450 руб"
 * - "Бытовая химия 2500"
 */
export function parseQuickExpenseText(text: string): {
  amount: number
  counterparty: string
  description: string
  category: string
} | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Number pattern supporting space/NBSP thousand separators and dot/comma decimals
  const numPattern = '(\\d{1,3}(?:[ \\xA0]\\d{3})*(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)'

  let rawAmount = ''
  let remainder = ''

  // 1. Amount at start: '14 500 зелень', '14500р зелень', '14500₽ зелень'
  const startRegex = new RegExp('^' + numPattern + '\\s*(?:руб\\.?|р\\.?|₽)?\\s+(.+)$', 'i')
  const startMatch = trimmed.match(startRegex)

  if (startMatch) {
    rawAmount = startMatch[1]
    remainder = startMatch[2]
  } else {
    // 2. Amount at end: 'Зелень 14 500 руб', 'мясо на 15 000 нал', 'Зелень 14 500'
    const endRegex = new RegExp('^(.+?)\\s+' + numPattern + '\\s*(?:руб\\.?|р\\.?|₽)?(?:\\s+(?:нал|наличные|безнал|карта))?$', 'i')
    const endMatch = trimmed.match(endRegex)
    if (endMatch) {
      remainder = endMatch[1]
      rawAmount = endMatch[2]
    } else {
      // 3. Amount in middle: 'мясо на 15 000 нал', 'закупка 4500 руб в кафе'
      const midRegex = new RegExp('^(.+?)\\s+' + numPattern + '\\s*(?:руб\\.?|р\\.?|₽)?\\s+(.+)$', 'i')
      const midMatch = trimmed.match(midRegex)
      if (midMatch) {
        remainder = `${midMatch[1]} ${midMatch[3]}`
        rawAmount = midMatch[2]
      }
    }
  }

  if (!rawAmount) return null

  const amount = parseFloat(rawAmount.replace(/[ \xA0]/g, '').replace(',', '.'))
  if (isNaN(amount) || amount <= 0) return null

  // Clean remainder: strip leading prepositions like "на "
  const cleanedRemainder = remainder.replace(/^на\s+/i, '').trim()

  // Identify supplier or market if mentioned
  const vendorMatch = cleanedRemainder.match(/(?<!\p{L})(фудсити|фуд\s+сити|даниловский|метро|ашан|мираторг|вкусвилл)(?!\p{L})/iu)
  const words = cleanedRemainder.split(/\s+/).filter(w => !/^(на|в|для|по|из|руб\.?|р\.?|₽|нал|безнал|карта)$/i.test(w))

  const counterparty = vendorMatch ? vendorMatch[0] : (words[0] || 'Поставщик')
  const category = categorizeTransaction(counterparty, cleanedRemainder)

  return {
    amount,
    counterparty,
    description: cleanedRemainder,
    category,
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(amount)
}

/**
 * Factory for creating configured FinRest Telegram Bot instance.
 */
export function createFinRestBot(token?: string): Bot {
  const botToken = token || process.env.TELEGRAM_BOT_TOKEN || 'dummy_telegram_bot_token'
  const bot = new Bot(botToken, {
    botInfo: {
      id: 100001,
      is_bot: true,
      first_name: 'FinRest Bot',
      username: 'finrest_bot',
      can_join_groups: false,
      can_read_all_group_messages: false,
      supports_inline_queries: false,
      can_connect_to_business: false,
      has_main_web_app: false,
      has_topics_enabled: false,
      allows_users_to_create_topics: false,
      can_manage_bots: false,
      supports_join_request_queries: false,
    } as unknown as UserFromGetMe,
  })

  bot.catch((err) => {
    console.error(`[Telegram Bot Error]:`, err)
  })

  // 1. Command: /start [auth_token_or_pin]
  bot.command('start', async (ctx) => {
    const payload = ctx.match?.trim()
    const from = ctx.from
    if (!from) return

    if (payload) {
      const result = await verifyAndLinkTelegramAccount(from, payload)
      if (result.success && result.account) {
        const venueName = result.account.activeVenueId
          ? (await prisma.venue.findUnique({ where: { id: result.account.activeVenueId } }))?.name
          : 'Не выбран'
        await ctx.reply(
          `✅ Telegram-аккаунт успешно подключен к ресторану «${venueName}»!\n\n` +
          `Теперь вы можете:\n` +
          `• Отправлять фото чеков для автоматического распознавания\n` +
          `• Вводить расходы текстом (напр. «14500 зелень Фудсити нал»)\n` +
          `• Смотреть ежедневную финансовую сводку: /flash`
        )
        return
      } else {
        await ctx.reply(`❌ ${result.error || 'Неверный код авторизации.'}`)
        return
      }
    }

    // No payload: check if already linked
    const account = await getTelegramAccount(from.id)
    if (account) {
      const venueName = account.venue?.name || 'Основной ресторан'
      await ctx.reply(
        `👋 С возвращением! Текущий ресторан: «${venueName}».\n\n` +
        `Доступные команды:\n` +
        `• /flash — Вечерний экспресс-отчет\n` +
        `• /venues — Сменить активный ресторан\n\n` +
        `Или просто отправьте фото чека или текст расхода в этот чат.`
      )
    } else {
      await ctx.reply(
        `🔒 Добро пожаловать в FinRest!\n\n` +
        `Для привязки аккаунта введите 6-значный PIN-код из настроек системы FinRest ` +
        `или перейдите по персональной ссылке подключения.`
      )
    }
  })

  // 2. Command: /flash (Evening flash report on-demand)
  bot.command('flash', async (ctx) => {
    const from = ctx.from
    if (!from) return

    const account = await getTelegramAccount(from.id)
    if (!account || !account.activeVenueId) {
      await ctx.reply('⚠️ Аккаунт не привязан к ресторану. Введите PIN-код для входа.')
      return
    }

    try {
      const data = await generateFlashReportData(account.activeVenueId)
      const reportMessage = formatFlashReportMessage(data)
      await ctx.reply(reportMessage)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      await ctx.reply(`❌ Ошибка формирования отчета: ${msg}`)
    }
  })

  // 3. Command: /venues (Switch restaurant)
  bot.command('venues', async (ctx) => {
    const from = ctx.from
    if (!from) return

    const account = await getTelegramAccount(from.id)
    if (!account) {
      await ctx.reply('⚠️ Аккаунт не авторизован.')
      return
    }

    const venues = account.user.venues
    if (venues.length === 0) {
      await ctx.reply('У вас нет доступных ресторанов.')
      return
    }

    const keyboard = new InlineKeyboard()
    for (const v of venues) {
      const isCurrent = v.id === account.activeVenueId ? ' (активен)' : ''
      keyboard.text(`${v.name}${isCurrent}`, `switch_venue:${v.id}`).row()
    }

    await ctx.reply('Выберите ресторан для ввода расходов и отчетов:', {
      reply_markup: keyboard,
    })
  })

  // 4. Message: Photo (OCR 2-Stage Pipeline)
  bot.on('message:photo', async (ctx) => {
    const from = ctx.from
    if (!from) return

    const account = await getTelegramAccount(from.id)
    if (!account || !account.activeVenueId) {
      await ctx.reply('🔒 Пожалуйста, сначала авторизуйтесь через PIN-код.')
      return
    }

    try {
      // Get highest resolution photo
      const photos = ctx.message.photo
      if (!photos || photos.length === 0) {
        await ctx.reply('⚠️ Фотография не найдена в сообщении.')
        return
      }
      const highestPhoto = photos[photos.length - 1]

      let imageBuffer: Buffer | undefined
      try {
        const file = await ctx.api.getFile(highestPhoto.file_id)
        if (file.file_path) {
          const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`
          const res = await fetch(downloadUrl)
          if (res.ok) {
            const arrayBuf = await res.arrayBuffer()
            imageBuffer = Buffer.from(arrayBuf)
          }
        }
      } catch {
        // In local or test mock environments without telegram CDN
      }

      // Run 2-Stage OCR Pipeline
      const ocrResult = await processReceiptPipeline({
        imageBuffer,
        mimeType: 'image/jpeg',
        rawText: ctx.message.caption || undefined,
      })

      if (ocrResult.amount <= 0) {
        await ctx.reply(
          `❌ Не удалось распознать сумму на чеке.\n\n` +
          `Пожалуйста, отправьте более четкое фото чека или введите расход текстом (например: «15400 овощи Фудсити нал»).`
        )
        return
      }

      // Create pending scan in DB
      const scan = await prisma.receiptScan.create({
        data: {
          telegramAccountId: account.id,
          venueId: account.activeVenueId,
          sourceType: ocrResult.stage,
          rawText: ocrResult.rawText || ctx.message.caption || null,
          extractedAmount: ocrResult.amount,
          extractedDate: ocrResult.date,
          extractedVendor: ocrResult.vendor,
          category: ocrResult.category,
          confidence: ocrResult.confidence,
          status: 'pending',
        },
      })

      const keyboard = new InlineKeyboard()
        .text('✅ Записать в ДДС', `confirm_receipt:${scan.id}`)
        .text('❌ Отклонить', `reject_receipt:${scan.id}`)

      const dateStr = ocrResult.date.toLocaleDateString('ru-RU')
      await ctx.reply(
        `🧾 Чек распознан (${ocrResult.stage === 'qr_54fz' ? '54-ФЗ QR' : 'Товарный чек / Накладная'}):\n` +
        `• Сумма: ${formatCurrency(ocrResult.amount)} ₽\n` +
        `• Поставщик: ${ocrResult.vendor}\n` +
        `• Дата: ${dateStr}\n` +
        `• Категория: ${ocrResult.category}\n` +
        `• Точность: ${Math.round(ocrResult.confidence * 100)}%\n\n` +
        `Сохранить этот расход в ДДС?`,
        { reply_markup: keyboard }
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      await ctx.reply(`❌ Не удалось обработать чек: ${msg}`)
    }
  })

  // 5. Message: Text (Auth PIN or Quick Expense)
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text.trim()
    if (text.startsWith('/')) return // Skip commands

    const from = ctx.from
    if (!from) return

    const account = await getTelegramAccount(from.id)

    // Unauthenticated user: try linking with PIN
    if (!account) {
      const linkResult = await verifyAndLinkTelegramAccount(from, text)
      if (linkResult.success && linkResult.account) {
        const venue = linkResult.account.activeVenueId
          ? await prisma.venue.findUnique({ where: { id: linkResult.account.activeVenueId } })
          : null
        await ctx.reply(
          `✅ Аккаунт успешно подключен! Текущий ресторан: «${venue?.name || 'Основной'}».\n\n` +
          `Теперь вы можете отправлять фото чеков или писать расходы текстом.`
        )
      } else {
        await ctx.reply(`❌ Неверный PIN-код или ссылка авторизации. Попробуйте еще раз.`)
      }
      return
    }

    // Authenticated user: check for quick expense
    const quickExpense = parseQuickExpenseText(text)
    if (quickExpense && quickExpense.amount > 0 && account.activeVenueId) {
      const scan = await prisma.receiptScan.create({
        data: {
          telegramAccountId: account.id,
          venueId: account.activeVenueId,
          sourceType: 'manual_text',
          rawText: text,
          extractedAmount: quickExpense.amount,
          extractedDate: new Date(),
          extractedVendor: quickExpense.counterparty,
          category: quickExpense.category,
          confidence: 0.95,
          status: 'pending',
        },
      })

      const keyboard = new InlineKeyboard()
        .text('✅ Подтвердить', `confirm_receipt:${scan.id}`)
        .text('❌ Отмена', `reject_receipt:${scan.id}`)

      await ctx.reply(
        `🧾 Распознан расход наличными:\n` +
        `• Сумма: ${formatCurrency(quickExpense.amount)} ₽\n` +
        `• Контрагент: ${quickExpense.counterparty}\n` +
        `• Описание: ${quickExpense.description}\n` +
        `• Статья: ${quickExpense.category}\n` +
        `• Источник: Сейф / Наличные\n\n` +
        `Подтвердить запись в ДДС?`,
        { reply_markup: keyboard }
      )
      return
    }

    await ctx.reply(
      `💬 Сообщение получено. Чтобы внести расход, напишите сумму и контрагента (напр. «14500 зелень Фудсити нал») или отправьте фото чека.`
    )
  })

  // 6. Callback Query Actions
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data
    const from = ctx.from

    // Action 1: confirm_receipt:<scanId>
    if (data.startsWith('confirm_receipt:')) {
      const scanId = data.replace('confirm_receipt:', '')
      const scan = await prisma.receiptScan.findUnique({ where: { id: scanId } })

      if (!scan) {
        await ctx.answerCallbackQuery({ text: 'Чек не найден.' })
        return
      }

      if (scan.status === 'confirmed') {
        await ctx.answerCallbackQuery({ text: 'Чек уже был сохранен ранее.' })
        return
      }

      // Create transaction in DB
      const tx = await prisma.transaction.create({
        data: {
          venueId: scan.venueId,
          source: 'manual',
          date: scan.extractedDate,
          amount: scan.extractedAmount,
          type: 'expense',
          category: scan.category,
          counterparty: scan.extractedVendor || 'Поставщик',
          description: scan.rawText || 'Расход через Telegram-бота',
          status: 'unique',
        },
      })

      // Update scan record
      await prisma.receiptScan.update({
        where: { id: scan.id },
        data: {
          status: 'confirmed',
          transactionId: tx.id,
        },
      })

      await ctx.answerCallbackQuery({ text: 'Сохранено в ДДС!' })
      await ctx.editMessageText(
        `✅ Расход на сумму ${formatCurrency(scan.extractedAmount)} ₽ успешно сохранен и записан в ДДС!`
      )
      return
    }

    // Action 2: reject_receipt:<scanId>
    if (data.startsWith('reject_receipt:')) {
      const scanId = data.replace('reject_receipt:', '')
      await prisma.receiptScan.update({
        where: { id: scanId },
        data: { status: 'rejected' },
      }).catch(() => {})

      await ctx.answerCallbackQuery({ text: 'Чек отклонен.' })
      await ctx.editMessageText('❌ Чек отклонен и не внесен в учет.')
      return
    }

    // Action 3: merge_pair:<pairId>
    if (data.startsWith('merge_pair:')) {
      const pairId = data.replace('merge_pair:', '')
      try {
        await resolveDeduplicationPair(pairId, 'merge')
        await ctx.answerCallbackQuery({ text: 'Дубликат объединен!' })
        await ctx.editMessageText('✅ Расходы успешно объединены в отчете ОПиУ и ДДС (дубликат скрыт).')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        await ctx.answerCallbackQuery({ text: `Ошибка: ${msg}` })
      }
      return
    }

    // Action 4: skip_pair:<pairId>
    if (data.startsWith('skip_pair:')) {
      const pairId = data.replace('skip_pair:', '')
      try {
        await resolveDeduplicationPair(pairId, 'skip')
        await ctx.answerCallbackQuery({ text: 'Платежи разделены.' })
        await ctx.editMessageText('❌ Задвоение отклонено (платежи оставлены раздельными).')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        await ctx.answerCallbackQuery({ text: `Ошибка: ${msg}` })
      }
      return
    }

    // Action 5: switch_venue:<venueId>
    if (data.startsWith('switch_venue:')) {
      const venueId = data.replace('switch_venue:', '')
      const success = await setActiveVenue(from.id, venueId)
      if (success) {
        const venue = await prisma.venue.findUnique({ where: { id: venueId } })
        await ctx.answerCallbackQuery({ text: 'Ресторан переключен!' })
        await ctx.editMessageText(`✅ Активный ресторан переключен на «${venue?.name}».`)
      } else {
        await ctx.answerCallbackQuery({ text: 'Ошибка смены ресторана.' })
      }
      return
    }

    await ctx.answerCallbackQuery()
  })

  return bot
}

export const bot = createFinRestBot()
