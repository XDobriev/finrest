import 'dotenv/config'
import { bot } from '../src/lib/telegram/bot'

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    console.error('❌ Error: TELEGRAM_BOT_TOKEN is not defined in .env')
    process.exit(1)
  }

  console.log('🤖 Starting FinRest Telegram Bot in Long Polling mode (Development)...')
  console.log('Press Ctrl+C to stop.')

  bot.start({
    onStart: (botInfo) => {
      console.log(`✅ Bot @${botInfo.username} successfully started and listening for updates!`)
    },
  })
}

main().catch((err) => {
  console.error('Fatal bot error:', err)
  process.exit(1)
})
