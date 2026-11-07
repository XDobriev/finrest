'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction } from '@/app/actions/auth'
import { Shield, Lock, Mail, ArrowRight, Loader2, AlertCircle, ChefHat } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await loginAction({ email, password })
      if (!res.success) {
        setError(res.error || 'Неверные учетные данные')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('Не удалось подключиться к серверу. Попробуйте снова.')
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 sm:p-6 lg:p-8">
      {/* Background ambient pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-inner">
            <ChefHat className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FinRest</h1>
          <p className="text-sm text-slate-400 mt-1">
            Управленческий учёт и дедупликация расходов ресторанов
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur shadow-2xl rounded-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-white">Вход в систему</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Введите ваш корпоративный email и пароль для доступа к заведениям
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800/60 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="director@restaurant.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500 text-sm h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                    Пароль
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500 text-sm h-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium h-10 gap-2 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Входим...
                  </>
                ) : (
                  <>
                    Войти в систему
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Быстрый вход для проверки
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('admin@finrest.ru', 'finrest2026')}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-left hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all text-xs"
                >
                  <p className="font-medium text-slate-200">Владелец сети</p>
                  <p className="text-xs text-slate-400 font-mono">admin@finrest.ru</p>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('manager@finrest.ru', 'finrest2026')}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 p-2 text-left hover:border-emerald-500/50 hover:bg-emerald-950/20 transition-all text-xs"
                >
                  <p className="font-medium text-slate-200">Управляющий</p>
                  <p className="text-xs text-slate-400 font-mono">manager@finrest.ru</p>
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                Впервые в сервисе?{' '}
                <Link
                  href="/register"
                  className="text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline"
                >
                  Зарегистрировать заведение
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 152-FZ Compliance badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5 text-emerald-500/70" />
          <span>Данные заведений защищены и хранятся в РФ (152-ФЗ)</span>
        </div>
      </div>
    </div>
  )
}
