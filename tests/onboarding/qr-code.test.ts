import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import jsQR from 'jsqr'
import { generateQRCodeMatrix, getQRCodeSvgPath } from '../../src/lib/qr/qr-code'

describe('QR Code Generator & Scanner', () => {
  test('generates valid matrix for short and medium deep-links', () => {
    const text = 'https://t.me/FinRestBot?start=auth_1234567890abcdef'
    const matrix = generateQRCodeMatrix(text)

    assert.ok(matrix.size >= 21, 'QR size should be at least Version 1 (21x21)')
    assert.strictEqual(matrix.modules.length, matrix.size)
    assert.strictEqual(matrix.modules[0].length, matrix.size)

    const svgPath = getQRCodeSvgPath(matrix)
    assert.ok(svgPath.startsWith('M'), 'SVG path should start with M')
    assert.ok(svgPath.includes('h1v1h-1z'), 'SVG path should contain square definitions')
  })

  test('jsQR accurately scans and decodes generated QR code', () => {
    const originalUrl = 'https://t.me/FinRestBot?start=test_onboarding_token'
    const matrix = generateQRCodeMatrix(originalUrl)

    const scale = 8
    const quietZone = 4
    const totalModules = matrix.size + quietZone * 2
    const imgSize = totalModules * scale

    // RGBA buffer
    const rgba = new Uint8ClampedArray(imgSize * imgSize * 4)

    // Fill white background
    rgba.fill(255)

    // Render dark modules
    for (let r = 0; r < matrix.size; r++) {
      for (let c = 0; c < matrix.size; c++) {
        if (matrix.modules[r][c]) {
          const startX = (c + quietZone) * scale
          const startY = (r + quietZone) * scale
          for (let py = 0; py < scale; py++) {
            for (let px = 0; px < scale; px++) {
              const idx = ((startY + py) * imgSize + (startX + px)) * 4
              rgba[idx] = 0 // R
              rgba[idx + 1] = 0 // G
              rgba[idx + 2] = 0 // B
              rgba[idx + 3] = 255 // A
            }
          }
        }
      }
    }

    const decoded = jsQR(rgba, imgSize, imgSize)
    assert.ok(decoded !== null, 'jsQR should successfully detect and decode the QR code')
    assert.strictEqual(decoded.data, originalUrl, 'Decoded QR code text must match original URL')
  })
})
