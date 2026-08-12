/**
 * Reprodução determinística do cronômetro em MONTAGEM E REMONTAGEM.
 *
 * Diferente dos outros testes de integração, aqui NÃO mockamos
 * `useFaceDetection`: o objetivo é exercitar o caminho real completo —
 * máquina (F1) + loop de detecção (F3) + efeito do cronômetro (F4) — e só
 * substituir o que jsdom não tem (motor da face-api.js, câmera, Canvas 2D e
 * a produção do JPEG final).
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

/** Quadro atual devolvido pelo motor falso — o teste troca isto entre quadros. */
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

/** Pixels nítidos e bem iluminados — o Canvas 2D de jsdom não desenha nada. */
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

/** Host controlado — dono do `value`, como uma aplicação real (§15.2). */
function Host(props: { autoCaptureAfter: number | null }) {
  const [value, setValue] = useState<FotografiaValue>(null)
  return <FotografoDeFaces value={value} onChange={setValue} autoCaptureAfter={props.autoCaptureAfter} showMessages />
}

function estadoAtual(): string {
  return screen.getByTestId('fotografo-de-faces').getAttribute('data-state') ?? '?'
}

function cronometroAtual(): string | null {
  return screen.queryByTestId('countdown')?.textContent ?? null
}

interface Observacao {
  em: number
  state: string
  countdown: string | null
}

/**
 * Avança o relógio em fatias pequenas (com microtasks liberadas entre elas,
 * como no navegador) e registra o que a interface mostrou a cada fatia.
 */
async function avancar(ms: number, linhaDoTempo: Observacao[], inicio = 0): Promise<number> {
  const passo = 16
  let decorrido = inicio
  for (let i = 0; i < Math.round(ms / passo); i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(passo)
    })
    decorrido += passo
    linhaDoTempo.push({ em: decorrido, state: estadoAtual(), countdown: cronometroAtual() })
  }
  return decorrido
}

/** Compacta a linha do tempo: só o que a interface de fato mostrou, em ordem. */
function transicoes(linhaDoTempo: Observacao[]): string[] {
  const saida: string[] = []
  let anterior = ''
  for (const o of linhaDoTempo) {
    const assinatura = `${o.state}${o.countdown ? `(${o.countdown})` : ''}`
    if (assinatura !== anterior) {
      saida.push(assinatura)
      anterior = assinatura
    }
  }
  return saida
}

/** A contagem que o usuário precisa ver, do primeiro número até a fotografia. */
const CONTAGEM_ESPERADA = [
  'DETECTANDO',
  'CRONOMETRANDO(3)',
  'CRONOMETRANDO(2)',
  'CRONOMETRANDO(1)',
  'FOTOGRAFIA_PRONTA',
]

beforeEach(() => {
  vi.useFakeTimers()
  facesDoQuadro = [faceParada()]
  instalarCanvasFalso()
  instalarVideoPronto()
  instalarCameraFalsa()
  vi.mocked(capturePhotoBlob).mockImplementation(() =>
    Promise.resolve(new Blob(['foto'], { type: 'image/jpeg' })),
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('FotografoDeFaces — cronômetro sob travamento da thread principal', () => {
  /**
   * Reprodução do congelamento relatado: a inferência da face-api.js roda na
   * thread principal e, quando um quadro custa segundos, TODOS os temporizadores
   * ficam presos junto. Modelado aqui como "o relógio de parede andou 5s
   * enquanto o temporizador de 1s só conseguiu disparar uma vez" — exatamente
   * o que a thread bloqueada faz com um `setTimeout`.
   *
   * O cronômetro precisa se guiar pelo PRAZO real (§04.3/§07.5: "N segundos"),
   * e não por um acumulado de ticks: senão cada travada estica a contagem, e
   * uma travada de 5s num cronômetro de 3s deixa a interface parada em "3"
   * sem nunca capturar.
   */
  it('captura assim que o prazo real vence, mesmo se a thread travar no meio da contagem', async () => {
    render(<Host autoCaptureAfter={3} />)

    // Chega a CRONOMETRANDO normalmente.
    const linhaDoTempo: Observacao[] = []
    await avancar(100, linhaDoTempo)
    expect(estadoAtual()).toBe('CRONOMETRANDO')
    expect(cronometroAtual()).toBe('3')

    // A thread trava por 5s: o relógio de parede avança, mas o temporizador de
    // 1s só consegue rodar quando a thread é devolvida.
    vi.setSystemTime(Date.now() + 5000)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    // O prazo de 3s venceu com folga — a captura não pode continuar pendente.
    expect(estadoAtual()).not.toBe('CRONOMETRANDO')
  })

  it('não estica a contagem: uma travada parcial não empurra o disparo para depois do prazo', async () => {
    render(<Host autoCaptureAfter={3} />)
    const linhaDoTempo: Observacao[] = []
    await avancar(100, linhaDoTempo)
    expect(cronometroAtual()).toBe('3')

    // Travada de 1,5s logo no começo. O tique já esperava 1s, então a travada
    // acrescenta 500ms de tempo real em que nenhum temporizador roda; quando a
    // thread volta, 1,5s de prazo já foram embora e sobram 1,5s — "2" na tela.
    vi.setSystemTime(Date.now() + 500)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(cronometroAtual()).toBe('2')

    // Os 1,5s de prazo que restam têm que bastar — a travada não pode ter
    // comprado 3 segundos novos de contagem.
    await avancar(1600, linhaDoTempo)
    expect(estadoAtual()).not.toBe('CRONOMETRANDO')
  })
})

describe('FotografoDeFaces — cronômetro regressivo em montagem e remontagem', () => {
  it('conta 3 → 2 → 1 e captura na PRIMEIRA montagem', async () => {
    const linhaDoTempo: Observacao[] = []
    const { unmount } = render(<Host autoCaptureAfter={3} />)

    await avancar(5000, linhaDoTempo)

    expect(transicoes(linhaDoTempo)).toEqual(CONTAGEM_ESPERADA)
    unmount()
  })

  it('conta igualmente bem na SEGUNDA montagem, depois de um ciclo completo', async () => {
    const primeira: Observacao[] = []
    const { unmount } = render(<Host autoCaptureAfter={3} />)
    await avancar(5000, primeira)
    expect(transicoes(primeira)).toEqual(CONTAGEM_ESPERADA)
    unmount()

    // Nada de estado remanescente entre montagens: a segunda contagem tem que
    // ser indistinguível da primeira, número por número.
    const segunda: Observacao[] = []
    render(<Host autoCaptureAfter={3} />)
    await avancar(5000, segunda)

    expect(transicoes(segunda)).toEqual(transicoes(primeira))
  })
})
