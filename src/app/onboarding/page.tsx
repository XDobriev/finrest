'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { UtensilsCrossed } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()

  const handleComplete = () => {
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-50/80 flex flex-col justify-between">
      {/* Top Brand Header */}
      <header className="border-b border-slate-200 bg-white py-4 px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 leading-none block">
              FinRest
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              HoReCa Financial Management
            </span>
          </div>
        </Link>
        <span className="text-xs text-slate-500 font-medium">
          Мастер первого запуска
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6">
        <OnboardingWizard onComplete={handleComplete} />
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        FinRest © {new Date().getFullYear()} — Управленческий учет и дедупликация для ресторанов
      </footer>
    </div>
  )
}
