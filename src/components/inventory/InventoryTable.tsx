'use client'

import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { InventoryItem, ExpenseCategory } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'

interface InventoryTableProps {
  items: InventoryItem[]
  onAdd: (item: Omit<InventoryItem, 'id' | 'createdAt'>) => void
  onUpdate: (id: string, data: Partial<InventoryItem>) => void
  onDelete: (id: string) => void
  venueId: string
  period: string
}

const UNITS = ['кг', 'л', 'шт', 'уп', 'бут']

export function InventoryTable({ items, onAdd, onUpdate, onDelete, venueId, period }: InventoryTableProps) {
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'food' as ExpenseCategory,
    unit: 'кг',
    expectedQty: 0,
    actualQty: 0,
    pricePerUnit: 0,
  })

  const handleAdd = () => {
    if (!newItem.name.trim()) return
    onAdd({
      venueId,
      period,
      ...newItem,
    })
    setNewItem({ name: '', category: 'food', unit: 'кг', expectedQty: 0, actualQty: 0, pricePerUnit: 0 })
  }

  const totalShortage = items.reduce((sum, item) => {
    const diff = item.expectedQty - item.actualQty
    return sum + diff * item.pricePerUnit
  }, 0)

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Название</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead className="w-20">Ед.</TableHead>
              <TableHead className="w-24">Расчёт</TableHead>
              <TableHead className="w-24">Факт</TableHead>
              <TableHead className="w-24">Расхождение</TableHead>
              <TableHead className="w-28">Цена/ед.</TableHead>
              <TableHead className="w-28">Сумма</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const shortage = item.expectedQty - item.actualQty
              const shortageCost = shortage * item.pricePerUnit

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-sm">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORY_LABELS[item.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{item.unit}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.expectedQty}
                      onChange={(e) => onUpdate(item.id, { expectedQty: parseFloat(e.target.value) || 0 })}
                      className="h-8 w-20 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.actualQty}
                      onChange={(e) => onUpdate(item.id, { actualQty: parseFloat(e.target.value) || 0 })}
                      className="h-8 w-20 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-mono font-medium ${shortage > 0 ? 'text-red-500' : shortage < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {shortage > 0 ? `-${shortage}` : shortage < 0 ? `+${Math.abs(shortage)}` : '0'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.pricePerUnit}
                      onChange={(e) => onUpdate(item.id, { pricePerUnit: parseFloat(e.target.value) || 0 })}
                      className="h-8 w-24 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-mono font-semibold ${shortageCost > 0 ? 'text-red-500' : shortageCost < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                      {formatCurrency(Math.abs(shortageCost))}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(item.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}

            <TableRow className="bg-slate-50/50">
              <TableCell>
                <Input
                  placeholder="Название позиции..."
                  value={newItem.name}
                  onChange={(e) => setNewItem(s => ({ ...s, name: e.target.value }))}
                  className="h-8 text-sm"
                />
              </TableCell>
              <TableCell>
                <Select value={newItem.category} onValueChange={(v) => setNewItem(s => ({ ...s, category: v as ExpenseCategory }))}>
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select value={newItem.unit} onValueChange={(v) => setNewItem(s => ({ ...s, unit: v || 'кг' }))}>
                  <SelectTrigger className="h-8 text-xs w-16"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Input type="number" value={newItem.expectedQty || ''} onChange={(e) => setNewItem(s => ({ ...s, expectedQty: parseFloat(e.target.value) || 0 }))} className="h-8 w-20 text-sm" />
              </TableCell>
              <TableCell>
                <Input type="number" value={newItem.actualQty || ''} onChange={(e) => setNewItem(s => ({ ...s, actualQty: parseFloat(e.target.value) || 0 }))} className="h-8 w-20 text-sm" />
              </TableCell>
              <TableCell></TableCell>
              <TableCell>
                <Input type="number" value={newItem.pricePerUnit || ''} onChange={(e) => setNewItem(s => ({ ...s, pricePerUnit: parseFloat(e.target.value) || 0 }))} className="h-8 w-24 text-sm" />
              </TableCell>
              <TableCell></TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAdd} disabled={!newItem.name.trim()}>
                  <Plus className="h-4 w-4 text-emerald-600" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className={`rounded-lg p-4 ${totalShortage > 0 ? 'bg-red-50' : totalShortage < 0 ? 'bg-emerald-50' : 'bg-slate-50'}`}>
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">
            {totalShortage > 0 ? 'Итого недостача' : totalShortage < 0 ? 'Итого излишек' : 'Расхождений нет'}
          </span>
          <span className={`text-lg font-mono font-bold ${totalShortage > 0 ? 'text-red-600' : totalShortage < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {formatCurrency(Math.abs(totalShortage))}
          </span>
        </div>
      </div>
    </div>
  )
}
