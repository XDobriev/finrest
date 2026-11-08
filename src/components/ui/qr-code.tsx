'use client'

import React, { useMemo } from 'react'
import { generateQRCodeMatrix, getQRCodeSvgPath } from '@/lib/qr/qr-code'

export interface QRCodeProps {
  value: string
  size?: number
  className?: string
  color?: string
  bgColor?: string
  quietZone?: number
}

export function QRCode({
  value,
  size = 180,
  className = '',
  color = '#0F172A',
  bgColor = '#FFFFFF',
  quietZone = 3,
}: QRCodeProps) {
  const { matrix, path } = useMemo(() => {
    try {
      const mat = generateQRCodeMatrix(value)
      const p = getQRCodeSvgPath(mat)
      return { matrix: mat, path: p }
    } catch (err) {
      console.error('Failed to generate QR code for value:', value, err)
      return { matrix: null, path: '' }
    }
  }, [value])

  if (!matrix) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-100 text-xs text-slate-500 rounded-lg ${className}`}
      >
        Ошибка QR
      </div>
    )
  }

  const viewBoxSize = matrix.size + quietZone * 2
  const offset = -quietZone

  return (
    <div
      className={`inline-block p-2 bg-white rounded-xl shadow-xs border border-slate-200 ${className}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      <svg
        viewBox={`${offset} ${offset} ${viewBoxSize} ${viewBoxSize}`}
        width={size}
        height={size}
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        aria-label={`QR-код: ${value}`}
      >
        <rect
          x={offset}
          y={offset}
          width={viewBoxSize}
          height={viewBoxSize}
          fill={bgColor}
          rx={1}
        />
        <path d={path} fill={color} />
      </svg>
    </div>
  )
}
