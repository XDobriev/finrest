'use client'

import React, { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useApp } from '@/context/AppContext'
import { formatCurrency } from '@/lib/utils'
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  FileText,
  Settings,
  BarChart3,
} from 'lucide-react'

export default function VenuesPage() {
  const { venues, addVenue, updateVenue, deleteVenue, transactions, fileUploads, selectedVenueId, selectVenue } = useApp()

  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [editVenueId, setEditVenueId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAddress, setEditAddress] = useState('')

  const handleAdd = () => {
    if (!newName.trim()) return
    addVenue(newName.trim(), newAddress.trim() || undefined)
    setNewName('')
    setNewAddress('')
  }

  const handleEdit = (venueId: string) => {
    const venue = venues.find((v) => v.id === venueId)
    if (!venue) return
    setEditVenueId(venueId)
    setEditName(venue.name)
    setEditAddress(venue.address || '')
  }

  const handleSaveEdit = () => {
    if (!editVenueId || !editName.trim()) return
    updateVenue(editVenueId, { name: editName.trim(), address: editAddress.trim() || undefined })
    setEditVenueId(null)
  }

  const getVenueStats = (venueId: string) => {
    const venueTx = transactions.filter((t) => t.venueId === venueId)
    const venueUploads = fileUploads.filter((u) => u.venueId === venueId)
    const income = venueTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = venueTx.filter((t) => t.type === 'expense' && t.status !== 'duplicate').reduce((s, t) => s + t.amount, 0)
    const duplicates = venueTx.filter((t) => t.status === 'duplicate').length

    return { totalTx: venueTx.length, income, expenses, duplicates, uploads: venueUploads.length }
  }

  return (
    <div>
      <Header title="Заведения" onMenuToggle={() => {}} />
      <main className="p-6 space-y-6">
        {/* Add venue */}
        <Card className="rounded-lg shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Plus className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-slate-900">Добавить заведение</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="flex-1 space-y-1.5 w-full">
                <Label className="text-xs">Название</Label>
                <Input
                  placeholder="Название заведения"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1 space-y-1.5 w-full">
                <Label className="text-xs">Адрес</Label>
                <Input
                  placeholder="Адрес (необязательно)"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button onClick={handleAdd} disabled={!newName.trim()} className="gap-2 mt-5">
                <Plus className="h-4 w-4" />
                Добавить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Venue list */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => {
            const stats = getVenueStats(venue.id)
            const isActive = selectedVenueId === venue.id

            return (
              <Card
                key={venue.id}
                className={`rounded-lg shadow-sm cursor-pointer transition-all ${
                  isActive ? 'ring-2 ring-emerald-500 bg-emerald-50/30' : 'hover:shadow-md'
                }`}
                onClick={() => selectVenue(venue.id)}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-emerald-600" />
                        <h3 className="font-semibold text-slate-900">{venue.name}</h3>
                      </div>
                      {venue.address && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3 w-3" />
                          {venue.address}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <Badge className="bg-emerald-600">Активно</Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-blue-50 p-2.5">
                      <p className="text-[10px] text-blue-600 font-medium">Доходы</p>
                      <p className="text-sm font-bold text-blue-900">{formatCurrency(stats.income)}</p>
                    </div>
                    <div className="rounded-lg bg-red-50 p-2.5">
                      <p className="text-[10px] text-red-600 font-medium">Расходы</p>
                      <p className="text-sm font-bold text-red-900">{formatCurrency(stats.expenses)}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-border">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        {stats.totalTx} транзакций
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {stats.uploads} загрузок
                      </span>
                    </div>
                    {stats.duplicates > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {stats.duplicates} дублей
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="gap-1 text-xs flex-1" onClick={() => handleEdit(venue.id)}>
                      <Pencil className="h-3 w-3" />
                      Изменить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                      onClick={() => deleteVenue(venue.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                      Удалить
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Edit dialog */}
        <Dialog open={!!editVenueId} onOpenChange={(open) => !open && setEditVenueId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать заведение</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Название</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Адрес</Label>
                <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditVenueId(null)}>Отмена</Button>
              <Button onClick={handleSaveEdit}>Сохранить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
