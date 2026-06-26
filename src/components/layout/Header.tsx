'use client'

import React from 'react'
import { useApp } from '@/context/AppContext'
import { Building2, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  title: string
  onMenuToggle: () => void
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { venues, selectedVenueId, selectVenue, deduplicationPairs } = useApp()
  const pendingPairs = deduplicationPairs.filter(p => p.status === 'pending').length

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Venue selector */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-slate-50 p-1">
          {venues.map((venue) => (
            <button
              key={venue.id}
              onClick={() => selectVenue(venue.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedVenueId === venue.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{venue.name}</span>
              <span className="md:hidden">{venue.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Deduplication badge */}
        {pendingPairs > 0 && (
          <Badge variant="destructive" className="hidden sm:flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            {pendingPairs} дубликатов
          </Badge>
        )}
      </div>
    </header>
  )
}
