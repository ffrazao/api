/**
 * Forma da moldura no quiosque, de ponta a ponta — F13.
 *
 * Reprodução determinística (mesmo harness de FotografoDeFaces.remount.test.tsx:
 * câmera/canvas/vídeo falsos, motor de detecção real via `./faceDetector`
 * mockado, temporizadores reais do React) do bug relatado: a moldura da
 * candidata travada no quiosque alternava entre retângulo (correto) e círculo
 * (o fallback de face única de autorretrato/assistido) sempre que o motor
 * deixava de encontrar alguma face por um único quadro — mesmo com o Face Lock
 * ainda ativo para a máquina (dentro da tolerância de perda). A cor
 * acompanhava o estado corretamente durante a alternância; só a geometria
 * estava errada. Ver useFaceDetection.quiosque-continuidade.test.ts para a
 * cobertura equivalente no nível do hook, incluindo a causa distinta da
 * instabilidade do cronômetro.
 */
import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FotografoDeFaces } from './FotografoDeFaces'
import { capturePhotoBlob } from './imageProcessor'
import type { DetectedFace } from './faceDetector'
import type { BoundingBox, Point2D } from './faceMetrics'
import type { FotografiaValue } from './types'

const FRAME = { width: 640, height: 480 }

let facesDoQuadro: DetectedFace[] = []

vi.mock('./faceDetector', () => ({
  createFaceApiDetector: () => ({
    loadModels: () => Promise.resolve(),
    detect: () => Promise.resolve(facesDoQuadro),
  }),
}))

vi.mock('./imageProcessor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./imageProcessor')>()),
  capturePhotoBlob: vi.fn(),
}))

function frontalLandmarks(): Point2D[] {
  const points: Point2D[] = new Array(68)
  for (let i = 0; i < 68; i++) points[i] = { x: 320, y: 240 }
  for (const i of [36, 37, 38, 39, 40, 41]) points[i] = { x: 280, y: 210 }
  for (const i of [42, 43, 44, 45, 46, 47]) points[i] = { x: 360, y: 210 }
  points[27] = { x: 320, y: 215 }
  points[30] = { x: 320, y: 260 }
  points[8] = { x: 320, y: 330 }
  return points
}

function centeredBox(coverageRatio = 0.2): BoundingBox {
  const area = FRAME.width * FRAME.height * coverageRatio
  const side = Math.sqrt(area)
  return { x: (FRAME.width - side) / 2, y: (FRAME.height - side) / 2, width: side, height: side }
}

function faceParada(): DetectedFace {
  return { box: centeredBox(), landmarks: frontalLandmarks() }
}

function pixelsNitidos(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const value = (x + y) % 2 === 0 ? 220 : 60
      data[i] = value
      data[i + 1] = value
      data[i + 2] = value
      data[i + 3] = 255
    }
  }
  return { data, width, height, colorSpace: 'srgb' } as unknown as ImageData
}

function instalarCanvasFalso() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    ((): unknown => ({
      drawImage: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) => pixelsNitidos(w, h),
    })) as typeof HTMLCanvasElement.prototype.getContext,
  )
}

function instalarVideoPronto() {
  Object.defineProperty(HTMLVideoElement.prototype, 'readyState', { configurable: true, get: () => 4 })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => FRAME.width })
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => FRAME.height })
  Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
    configurable: true,
    set: () => {},
    get: () => null,
  })
}

function instalarCameraFalsa() {
  const track = { stop: vi.fn(), kind: 'video' }
  const stream = { getTracks: () => [track] } as unknown as MediaStream
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => Promise.resolve(stream) },
  })
}

function Host(props: { autoCaptureAfter: number | null }) {
  const [value, setValue] = useState<FotografiaValue>(null)
  return (
    <FotografoDeFaces
      value={value}
      onChange={setValue}
      mode="quiosque"
      showFaceFrame
      autoCaptureAfter={props.autoCaptureAfter}
    />
  )
}

function estadoAtual(): string {
  return screen.getByTestId('fotografo-de-faces').getAttribute('data-state') ?? '?'
}

/** Distingue as duas formas pela mesma propriedade que cada styled-component usa de fato. */
function formaDaModuraTravada(): 'retangulo' | 'circulo' | 'ausente' {
  const frames = screen.queryAllByTestId('face-frame')
  if (frames.length === 0) return 'ausente'
  // S.FaceFrameBox recebe `style` inline com left/top/width/height calculados
  // a partir da caixa; S.FaceFrameOval usa posição fixa via CSS, sem `style`.
  return frames[0].hasAttribute('style') ? 'retangulo' : 'circulo'
}

/** Avança o relógio em fatias pequenas, como o navegador entrega quadros — um
 * único salto grande pode pular frames de requestAnimationFrame intermediários. */
async function avancar(ms: number) {
  const passo = 16
  for (let i = 0; i < Math.round(ms / passo); i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(passo)
    })
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  facesDoQuadro = [faceParada()]
  instalarCanvasFalso()
  instalarVideoPronto()
  instalarCameraFalsa()
  vi.mocked(capturePhotoBlob).mockImplementation(() => Promise.resolve(new Blob(['foto'], { type: 'image/jpeg' })))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('FotografoDeFaces — quiosque: forma da moldura durante uma falha momentânea de detecção', () => {
  it('permanece retangular mesmo num quadro em que o motor não encontra nenhuma face', async () => {
    render(<Host autoCaptureAfter={3} />)

    // Chega a PRONTO/CRONOMETRANDO com a candidata travada e moldura retangular.
    await avancar(2000)
    expect(estadoAtual()).not.toBe('DETECTANDO')
    expect(formaDaModuraTravada()).toBe('retangulo')

    // Falha momentânea do motor por UM quadro (bem dentro da tolerância de
    // perda de 700ms) — a pessoa não se moveu, é só ruído do detector.
    facesDoQuadro = []
    await avancar(200)

    // A máquina não considerou a candidata perdida (dentro da tolerância)...
    expect(estadoAtual()).not.toBe('DETECTANDO')
    // ...e a moldura continua exclusivamente retangular — nunca a oval de
    // face única.
    expect(formaDaModuraTravada()).toBe('retangulo')

    // A candidata reaparece — volta a rastrear normalmente, sem nenhum salto.
    facesDoQuadro = [faceParada()]
    await avancar(200)
    expect(formaDaModuraTravada()).toBe('retangulo')
  })

  it('nunca cai para a moldura oval mesmo quando não há ninguém para desenhar', async () => {
    facesDoQuadro = []
    render(<Host autoCaptureAfter={3} />)

    await avancar(500)

    expect(estadoAtual()).toBe('DETECTANDO')
    expect(formaDaModuraTravada()).toBe('ausente')
  })
})
