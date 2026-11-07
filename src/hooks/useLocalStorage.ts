'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue)
  const isHydrated = useRef(false)

  // Sync from localStorage after client mount to prevent hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(JSON.parse(stored))
      }
    } catch {
      // Ignore parse errors, fallback to default
    }
    isHydrated.current = true
  }, [key])

  // Save to localStorage only after initial client hydration
  useEffect(() => {
    if (!isHydrated.current) return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.warn(`localStorage quota exceeded for key "${key}"`)
    }
  }, [key, value])

  const updateValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(newValue)
  }, [])

  return [value, updateValue]
}
