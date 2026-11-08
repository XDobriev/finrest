import test from 'node:test'
import assert from 'node:assert/strict'
import { prisma } from '../../src/lib/db/client'
import { createFinRestBot, parseQuickExpenseText } from '../../src/lib/telegram/bot'
import { generateAuthToken } from '../../src/lib/telegram/auth'

test('Telegram Bot: /start with valid deep-link token authenticates user', async () => {
  const user = await prisma.user.create({
    data: {
      email: `bot_auth_${Date.now()}@finrest.ru`,
      name: 'Owner Boris',
    },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Restaurant Astoria', ownerId: user.id },
  })

  try {
    const authData = await generateAuthToken(user.id, venue.id)
    const bot = createFinRestBot('test_token_123')

    const sentMessages: string[] = []

    // Mock API call to capture sent messages
    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'sendMessage') {
        const text = (payload as { text?: string }).text || ''
        sentMessages.push(text)
        return {
          ok: true,
          result: {
            message_id: 1,
            date: Date.now(),
            chat: { id: 1001, type: 'private', first_name: 'Boris' },
            text,
          },
        } as unknown as ReturnType<typeof prev>
      }
      return prev(method, payload, signal)
    })

    // Simulate /start auth_<token>
    await bot.handleUpdate({
      update_id: 1,
      message: {
        message_id: 10,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 1001, type: 'private', first_name: 'Boris' },
        from: { id: 1001, is_bot: false, first_name: 'Boris', username: 'boris_astoria' },
        text: `/start ${authData.token}`,
        entities: [{ type: 'bot_command', offset: 0, length: 6 }],
      },
    })

    assert.ok(sentMessages.length > 0)
    assert.match(sentMessages[0], /успешно подключен|Restaurant Astoria/i)

    // Verify DB
    const account = await prisma.telegramAccount.findUnique({
      where: { telegramId: BigInt(1001) },
    })
    assert.ok(account)
    assert.equal(account.userId, user.id)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Telegram Bot: quick text expense creates pending scan and confirmation callback saves transaction', async () => {
  const user = await prisma.user.create({
    data: { email: `bot_exp_${Date.now()}@finrest.ru`, name: 'Chef Renat' },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Grill House', ownerId: user.id },
  })
  const tgAccount = await prisma.telegramAccount.create({
    data: {
      telegramId: BigInt(2002),
      userId: user.id,
      activeVenueId: venue.id,
      firstName: 'Renat',
    },
  })
  assert.ok(tgAccount.id)

  try {
    const bot = createFinRestBot('test_token_123')

    let sentMessageText = ''
    let replyMarkup: { inline_keyboard: Array<Array<{ callback_data: string }>> } | null = null
    let editedMessageText = ''

    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'sendMessage') {
        const msgPayload = payload as { text: string; reply_markup?: typeof replyMarkup }
        sentMessageText = msgPayload.text
        replyMarkup = msgPayload.reply_markup || null
        return {
          ok: true,
          result: {
            message_id: 20,
            date: Date.now(),
            chat: { id: 2002, type: 'private', first_name: 'Renat' },
            text: sentMessageText,
          },
        } as unknown as ReturnType<typeof prev>
      }
      if (method === 'editMessageText') {
        const editPayload = payload as { text: string }
        editedMessageText = editPayload.text
        return {
          ok: true,
          result: {
            message_id: 20,
            date: Date.now(),
            chat: { id: 2002, type: 'private', first_name: 'Renat' },
            text: editedMessageText,
          },
        } as unknown as ReturnType<typeof prev>
      }
      if (method === 'answerCallbackQuery') {
        return { ok: true, result: true } as unknown as ReturnType<typeof prev>
      }
      return prev(method, payload, signal)
    })

    // 1. User sends quick expense text: "14500 зелень и овощи Фудсити нал"
    await bot.handleUpdate({
      update_id: 2,
      message: {
        message_id: 21,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 2002, type: 'private', first_name: 'Renat' },
        from: { id: 2002, is_bot: false, first_name: 'Renat' },
        text: '14500 зелень и овощи Фудсити нал',
      },
    })

    assert.match(sentMessageText, /14\s?500/)
    assert.match(sentMessageText, /Фудсити/)
    const currentMarkup = replyMarkup as { inline_keyboard: Array<Array<{ callback_data: string }>> } | null
    assert.ok(currentMarkup?.inline_keyboard)

    // Extract scanId from callback_data e.g. "confirm_receipt:<scanId>"
    const confirmButton = currentMarkup.inline_keyboard[0][0]
    const callbackData = confirmButton.callback_data
    assert.ok(callbackData.startsWith('confirm_receipt:'))
    const scanId = callbackData.split(':')[1]

    // 2. User presses confirm inline button
    await bot.handleUpdate({
      update_id: 3,
      callback_query: {
        id: 'cb_1',
        from: { id: 2002, is_bot: false, first_name: 'Renat' },
        chat_instance: 'inst_1',
        message: {
          message_id: 20,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 2002, type: 'private', first_name: 'Renat' },
          text: sentMessageText,
        },
        data: callbackData,
      },
    })

    assert.match(editedMessageText, /успешно сохранен|записан в ДДС/i)

    // Verify transaction created in DB
    const scan = await prisma.receiptScan.findUnique({
      where: { id: scanId },
      include: { transaction: true },
    })
    assert.ok(scan)
    assert.equal(scan.status, 'confirmed')
    assert.ok(scan.transaction)
    assert.equal(scan.transaction?.amount, 14500)
    assert.equal(scan.transaction?.venueId, venue.id)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Telegram Bot: deduplication inline action merges duplicate transactions', async () => {
  const user = await prisma.user.create({
    data: { email: `bot_dup_${Date.now()}@finrest.ru`, name: 'Manager Dup' },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Bistro Duplicate Test', ownerId: user.id },
  })
  await prisma.telegramAccount.create({
    data: {
      telegramId: BigInt(3003),
      userId: user.id,
      activeVenueId: venue.id,
    },
  })

  try {
    // Create duplicate pair
    const txLeft = await prisma.transaction.create({
      data: {
        venueId: venue.id,
        source: 'iiko',
        date: new Date('2026-11-08T12:00:00Z'),
        amount: 12000,
        type: 'expense',
        category: 'food',
        counterparty: 'ООО Восток Мясо',
        description: 'Оплата поставки',
        status: 'unique',
      },
    })
    const txRight = await prisma.transaction.create({
      data: {
        venueId: venue.id,
        source: 'bank',
        date: new Date('2026-11-08T15:00:00Z'),
        amount: 12000,
        type: 'expense',
        category: 'food',
        counterparty: 'ООО Восток',
        description: 'Списание по счету',
        status: 'pending_review',
      },
    })
    const pair = await prisma.deduplicationPair.create({
      data: {
        venueId: venue.id,
        leftTxId: txLeft.id,
        rightTxId: txRight.id,
        matchScore: 92,
        matchReasons: ['Сумма совпадает (12 000 ₽)', 'Похожий контрагент'],
        status: 'pending',
      },
    })

    const bot = createFinRestBot('test_token_123')

    let editedMessageText = ''
    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'editMessageText') {
        const editPayload = payload as { text: string }
        editedMessageText = editPayload.text
        return {
          ok: true,
          result: {
            message_id: 50,
            date: Date.now(),
            chat: { id: 3003, type: 'private', first_name: 'Manager' },
            text: editedMessageText,
          },
        } as unknown as ReturnType<typeof prev>
      }
      if (method === 'answerCallbackQuery') {
        return { ok: true, result: true } as unknown as ReturnType<typeof prev>
      }
      return prev(method, payload, signal)
    })

    // Simulate clicking "merge_pair:<pairId>"
    await bot.handleUpdate({
      update_id: 4,
      callback_query: {
        id: 'cb_2',
        from: { id: 3003, is_bot: false, first_name: 'Manager' },
        chat_instance: 'inst_2',
        message: {
          message_id: 50,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 3003, type: 'private', first_name: 'Manager' },
          text: '⚠️ Обнаружен дубликат расхода',
        },
        data: `merge_pair:${pair.id}`,
      },
    })

    assert.match(editedMessageText, /объединены|скрыт/i)

    // Verify DB status
    const updatedPair = await prisma.deduplicationPair.findUnique({
      where: { id: pair.id },
    })
    assert.equal(updatedPair?.status, 'merged')

    const updatedRightTx = await prisma.transaction.findUnique({
      where: { id: txRight.id },
    })
    assert.equal(updatedRightTx?.status, 'duplicate')
    assert.equal(updatedRightTx?.duplicateOfId, txLeft.id)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Telegram Bot: parseQuickExpenseText handles Russian expense formats with spaces and currency suffixes', () => {
  // Case 1: Space-separated thousands at start
  const exp1 = parseQuickExpenseText('14 500 зелень и овощи Фудсити нал')
  assert.ok(exp1)
  assert.equal(exp1?.amount, 14500)
  assert.match(exp1?.counterparty || '', /Фудсити|зелень/i)
  assert.equal(exp1?.category, 'food')

  // Case 2: Comma decimal with spaces
  const exp2 = parseQuickExpenseText('14 500,50 зелень Фудсити')
  assert.ok(exp2)
  assert.equal(exp2?.amount, 14500.5)

  // Case 3: Currency suffix 'р'
  const exp3 = parseQuickExpenseText('14500р зелень')
  assert.ok(exp3)
  assert.equal(exp3?.amount, 14500)

  // Case 4: Currency suffix '₽'
  const exp4 = parseQuickExpenseText('14500₽ зелень')
  assert.ok(exp4)
  assert.equal(exp4?.amount, 14500)

  // Case 5: Currency word 'руб'
  const exp5 = parseQuickExpenseText('14500 руб зелень')
  assert.ok(exp5)
  assert.equal(exp5?.amount, 14500)
  assert.notEqual(exp5?.counterparty, 'руб')

  // Case 6: Amount at end with currency and spaces
  const exp6 = parseQuickExpenseText('Зелень Фудсити 14 500 руб')
  assert.ok(exp6)
  assert.equal(exp6?.amount, 14500)

  // Case 7: Preposition 'на'
  const exp7 = parseQuickExpenseText('мясо на 15 000 нал')
  assert.ok(exp7)
  assert.equal(exp7?.amount, 15000)
  assert.notEqual(exp7?.counterparty, 'на')
})

test('Telegram Bot: /flash command replies with formatted report for active venue', async () => {
  const user = await prisma.user.create({
    data: { email: `flash_cmd_${Date.now()}@finrest.ru`, name: 'Manager FlashCmd' },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Кафе Уют', ownerId: user.id },
  })
  await prisma.telegramAccount.create({
    data: {
      telegramId: BigInt(4004),
      userId: user.id,
      activeVenueId: venue.id,
    },
  })

  try {
    const bot = createFinRestBot('test_token_123')
    let repliedText = ''

    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'sendMessage') {
        repliedText = (payload as { text: string }).text
        return {
          ok: true,
          result: {
            message_id: 60,
            date: Date.now(),
            chat: { id: 4004, type: 'private' },
            text: repliedText,
          },
        } as unknown as ReturnType<typeof prev>
      }
      return prev(method, payload, signal)
    })

    await bot.handleUpdate({
      update_id: 10,
      message: {
        message_id: 61,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 4004, type: 'private' as const, first_name: 'Manager' },
        from: { id: 4004, is_bot: false, first_name: 'Manager' },
        text: '/flash',
        entities: [{ type: 'bot_command', offset: 0, length: 6 }],
      },
    })

    assert.match(repliedText, /Flash-отчет: Ресторан «Кафе Уют»/i)
    assert.match(repliedText, /Выручка за день:/i)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Telegram Bot: /venues command displays inline switcher and switch_venue changes active venue', async () => {
  const user = await prisma.user.create({
    data: { email: `venues_cmd_${Date.now()}@finrest.ru`, name: 'Multi Owner' },
  })
  const venue1 = await prisma.venue.create({
    data: { name: 'Ресторан Первый', ownerId: user.id },
  })
  const venue2 = await prisma.venue.create({
    data: { name: 'Ресторан Второй', ownerId: user.id },
  })
  await prisma.telegramAccount.create({
    data: {
      telegramId: BigInt(5005),
      userId: user.id,
      activeVenueId: venue1.id,
    },
  })

  try {
    const bot = createFinRestBot('test_token_123')
    let sentKeyboard: Array<Array<{ text: string; callback_data: string }>> | null = null
    let editedText = ''

    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'sendMessage') {
        const p = payload as { text: string; reply_markup?: { inline_keyboard: typeof sentKeyboard } }
        sentKeyboard = p.reply_markup?.inline_keyboard || null
        return {
          ok: true,
          result: {
            message_id: 70,
            date: Date.now(),
            chat: { id: 5005, type: 'private' },
            text: p.text,
          },
        } as unknown as ReturnType<typeof prev>
      }
      if (method === 'editMessageText') {
        editedText = (payload as { text: string }).text
        return {
          ok: true,
          result: {
            message_id: 70,
            date: Date.now(),
            chat: { id: 5005, type: 'private' },
            text: editedText,
          },
        } as unknown as ReturnType<typeof prev>
      }
      if (method === 'answerCallbackQuery') {
        return { ok: true, result: true } as unknown as ReturnType<typeof prev>
      }
      return prev(method, payload, signal)
    })

    // 1. Send /venues
    await bot.handleUpdate({
      update_id: 11,
      message: {
        message_id: 71,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 5005, type: 'private' as const, first_name: 'Owner' },
        from: { id: 5005, is_bot: false, first_name: 'Owner' },
        text: '/venues',
        entities: [{ type: 'bot_command', offset: 0, length: 7 }],
      },
    })

    assert.ok(sentKeyboard)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const venueButtons = ((sentKeyboard as any) || []).flat()
    assert.equal(venueButtons.length, 2)

    // 2. Click switch_venue:venue2.id
    await bot.handleUpdate({
      update_id: 12,
      callback_query: {
        id: 'cb_switch',
        from: { id: 5005, is_bot: false, first_name: 'Owner' },
        chat_instance: 'inst_sw',
        message: {
          message_id: 70,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 5005, type: 'private' as const, first_name: 'Owner' },
          text: 'Выберите ресторан',
        },
        data: `switch_venue:${venue2.id}`,
      },
    })

    assert.match(editedText, /переключен на «Ресторан Второй»/i)

    const updatedAccount = await prisma.telegramAccount.findUnique({
      where: { telegramId: BigInt(5005) },
    })
    assert.equal(updatedAccount?.activeVenueId, venue2.id)

  } finally {
    await prisma.venue.delete({ where: { id: venue1.id } }).catch(() => {})
    await prisma.venue.delete({ where: { id: venue2.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Telegram Bot: reject_receipt callback marks pending scan as rejected', async () => {
  const user = await prisma.user.create({
    data: { email: `reject_test_${Date.now()}@finrest.ru` },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Rejection Resto', ownerId: user.id },
  })
  const account = await prisma.telegramAccount.create({
    data: {
      telegramId: BigInt(6006),
      userId: user.id,
      activeVenueId: venue.id,
    },
  })
  const scan = await prisma.receiptScan.create({
    data: {
      telegramAccountId: account.id,
      venueId: venue.id,
      sourceType: 'manual_text',
      extractedAmount: 5000,
      extractedDate: new Date(),
      category: 'food',
      status: 'pending',
    },
  })

  try {
    const bot = createFinRestBot('test_token_123')
    let editedText = ''

    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'editMessageText') {
        editedText = (payload as { text: string }).text
        return {
          ok: true,
          result: {
            message_id: 80,
            date: Date.now(),
            chat: { id: 6006, type: 'private' },
            text: editedText,
          },
        } as unknown as ReturnType<typeof prev>
      }
      if (method === 'answerCallbackQuery') {
        return { ok: true, result: true } as unknown as ReturnType<typeof prev>
      }
      return prev(method, payload, signal)
    })

    await bot.handleUpdate({
      update_id: 13,
      callback_query: {
        id: 'cb_reject',
        from: { id: 6006, is_bot: false, first_name: 'Chef' },
        chat_instance: 'inst_rej',
        message: {
          message_id: 80,
          date: Math.floor(Date.now() / 1000),
          chat: { id: 6006, type: 'private' as const, first_name: 'Chef' },
          text: 'Сохранить этот расход?',
        },
        data: `reject_receipt:${scan.id}`,
      },
    })

    assert.match(editedText, /отклонен/i)

    const updatedScan = await prisma.receiptScan.findUnique({ where: { id: scan.id } })
    assert.equal(updatedScan?.status, 'rejected')

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

test('Telegram Bot: photo with unreadable receipt (amount = 0) responds with friendly error prompt', async () => {
  const user = await prisma.user.create({
    data: { email: `photo_err_${Date.now()}@finrest.ru` },
  })
  const venue = await prisma.venue.create({
    data: { name: 'Photo Resto', ownerId: user.id },
  })
  await prisma.telegramAccount.create({
    data: {
      telegramId: BigInt(7007),
      userId: user.id,
      activeVenueId: venue.id,
    },
  })

  try {
    const bot = createFinRestBot('test_token_123')
    let repliedText = ''

    bot.api.config.use(async (prev, method, payload, signal) => {
      if (method === 'sendMessage') {
        repliedText = (payload as { text: string }).text
        return {
          ok: true,
          result: {
            message_id: 90,
            date: Date.now(),
            chat: { id: 7007, type: 'private' },
            text: repliedText,
          },
        } as unknown as ReturnType<typeof prev>
      }
      if (method === 'getFile') {
        return {
          ok: true,
          result: {
            file_id: 'ph_unreadable',
            file_path: 'photos/unreadable.jpg',
          },
        } as unknown as ReturnType<typeof prev>
      }
      return prev(method, payload, signal)
    })

    // Simulate sending a photo that yields 0 amount
    await bot.handleUpdate({
      update_id: 14,
      message: {
        message_id: 91,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 7007, type: 'private' as const, first_name: 'Chef' },
        from: { id: 7007, is_bot: false, first_name: 'Chef' },
        photo: [
          { file_id: 'ph_unreadable', file_unique_id: 'u1', width: 100, height: 100 },
        ],
      },
    })

    assert.match(repliedText, /Не удалось распознать сумму/i)

    // Ensure no 0-amount scan was created
    const scans = await prisma.receiptScan.findMany({
      where: { venueId: venue.id },
    })
    assert.equal(scans.length, 0)

  } finally {
    await prisma.venue.delete({ where: { id: venue.id } }).catch(() => {})
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
  }
})

