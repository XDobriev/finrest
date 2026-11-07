'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerAction } from '@/app/actions/auth'
import { Shield, Lock, Mail, User, Building2, ArrowRight, Loader2, AlertCircle, ChefHat } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'ACCOUNTANT'>('OWNER')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const res = await registerAction({
        name,
        email,
        password,
        restaurantName,
        role,
      })

      if (!res.success) {
        setError(res.error || 'Ошибка регистрации')
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Не удалось подключиться к серверу')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 shadow-inner">
            <ChefHat className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">FinRest</h1>
          <p className="text-sm text-slate-400 mt-1">Регистрация компании и заведения</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur shadow-2xl rounded-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-semibold text-white">Создание аккаунта</CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Заполните данные для создания рабочего пространства ресторана
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800/60 p-3 text-xs text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-medium text-slate-300">
                  Ваше имя и фамилия
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Александр Смирнов"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500 text-sm h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="restaurant" className="text-xs font-medium text-slate-300">
                  Название первого ресторана / кофейни
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="restaurant"
                    type="text"
                    placeholder="GastroBar & Kitchen"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500 text-sm h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                  Рабочий Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="owner@gastrobar.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500 text-sm h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                  Пароль (от 6 символов)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-emerald-500 text-sm h-9"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <Label className="text-xs font-medium text-slate-300">Роль в компании</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'OWNER', label: 'Владелец' },
                      { id: 'MANAGER', label: 'Управляющий' },
                      { id: 'ACCOUNTANT', label: 'Бухгалтер' },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      className={`py-1.5 px-2 text-xs rounded-lg border font-medium transition-all ${
                        role === r.id
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium h-10 gap-2 mt-2 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Регистрируем...
                  </>
                ) : (
                  <>
                    Создать аккаунт
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-xs text-slate-400">
                Уже есть аккаунт?{' '}
                <Link
                  href="/login"
                  className="text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline"
                >
                  Войти
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Shield className="h-3.5 w-3.5 text-emerald-500/70" />
          <span>Данные заведений защищены и хранятся в РФ (152-ФЗ)</span>
        </div>
      </div>
    </div>
  )
}
