import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DetectedFace, FaceDetector } from './faceDetector'
import type { BoundingBox, Point2D } from './faceMetrics'
import { useFaceDetection } from './useFaceDetection'

/**
 * Regressão do travamento "o painel congela com 2 mudanças e nunca mais sai de
 * DETECTANDO", reproduzido em Chrome headless contra o Storybook real.
 *
 * O que a reprodução mostrou, com instrumentação no próprio `detect()`:
 * o loop chamava `detect()` UMA vez, com o `<video>` ainda em
 * `readyState === 0` (0x0, sem nenhum quadro decodificado), e essa promessa
 * NUNCA se resolvia nem rejeitava. A face-api.js, ao receber uma mídia que ela
 * considera "não carregada", espera pelo evento `load` do elemento — evento que
 * um `<video>` jamais dispara (ele dispara `loadeddata`/`canplay`). Como a
 * promessa nunca assentava, o `.finally()` do tick não rodava, `processingRef`
 * ficava travado em `true` e todo tick seguinte saía no guarda de exclusividade:
 * loop vivo, porém permanentemente inerte, e sem nenhuma exceção para observar.
 *
 * Daí as duas travas deste arquivo:
 *  1. não entregar ao motor um vídeo sem quadro decodificado (a causa);
 *  2. nenhuma promessa de `detect()` pode inutilizar o ciclo para sempre (a
 *     garantia de que esta classe de falha não volta em outra forma — §05.2).
 */

const FRAME = { width: 640, height: 480 }

/** Vídeo falso mutável, para simular a janela em que a câmera já respondeu mas o quadro ainda não decodificou. */
function fakeVideo(readyState: number, width = FRAME.width, height = FRAME.height) {
  return {
    videoWidth: readyState === 0 ? 0 : width,
    videoHeight: readyState === 0 ? 0 : height,
    readyState,
  } as unknown as HTMLVideoElement
}

function landmarks(): Point2D[] {
  const points: Point2D[] = new Array(68)
  for (let i = 0; i < 68; i++) points[i] = { x: 320, y: 240 }
  for (const i of [36, 37, 38, 39, 40, 41]) points[i] = { x: 280, y: 210 }
  for (const i of [42, 43, 44, 45, 46, 47]) points[i] = { x: 360, y: 210 }
  points[27] = { x: 320, y: 215 }
  points[30] = { x: 320, y: 260 }
  points[8] = { x: 320, y: 330 }
  return points
}

function box(): BoundingBox {
  const side = Math.sqrt(FRAME.width * FRAME.height * 0.2)
  return { x: (FRAME.width - side) / 2, y: (FRAME.height - side) / 2, width: side, height: side }
}

const face: DetectedFace = { box: box(), landmarks: landmarks() }

function sharpWellLitImage() {
  const width = 20
  const height = 20
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const value = i % 2 === 0 ? 220 : 60
    data[i * 4] = value
    data[i * 4 + 1] = value
    data[i * 4 + 2] = value
    data[i * 4 + 3] = 255
  }
  return { data, width, height }
}

function createManualScheduler() {
  let latestTick: (() => void) | null = null
  let handle = 0
  return {
    scheduleFrame: vi.fn((callback: () => void) => {
      latestTick = callback
      return ++handle
    }),
    cancelFrame: vi.fn(),
    tick: () => latestTick?.(),
  }
}

function createManualClock(start = 0) {
  let current = start
  return { now: () => current, advance: (ms: number) => (current += ms) }
}

describe('useFaceDetection — o ciclo não pode morrer (§05.2)', () => {
  it('não entrega ao motor um <video> sem quadro decodificado, e volta a detectar assim que ele fica pronto', async () => {
    const detect = vi.fn().mockResolvedValue([face])
    const detector: FaceDetector = { loadModels: vi.fn().mockResolvedValue(undefined), detect }
    const scheduler = createManualScheduler()
    const clock = createManualClock()
    const dispatch = vi.fn()

    const { result, rerender } = renderHook(
      ({ video }: { video: HTMLVideoElement }) =>
        useFaceDetection({
          videoElement: video,
          state: 'DETECTANDO',
          value: null,
          dispatch,
          detector,
          sampleFaceImageData: () => sharpWellLitImage(),
          scheduleFrame: scheduler.scheduleFrame,
          cancelFrame: scheduler.cancelFrame,
          now: clock.now,
        }),
      // HAVE_NOTHING: é exatamente o estado em que o `<video>` está quando o
      // getUserMedia acabou de resolver e a máquina já entrou em DETECTANDO.
      { initialProps: { video: fakeVideo(0) } },
    )

    await waitFor(() => expect(result.current.status).toBe('ready'))

    const processarQuadro = async () => {
      clock.advance(200)
      await act(async () => {
        scheduler.tick()
        await Promise.resolve()
        await Promise.resolve()
      })
    }

    for (let i = 0; i < 5; i++) await processarQuadro()
    expect(detect).not.toHaveBeenCalled()

    // O primeiro quadro decodificou: agora sim o motor pode receber o vídeo.
    rerender({ video: fakeVideo(4) })
    for (let i = 0; i < 3; i++) await processarQuadro()

    expect(detect).toHaveBeenCalledTimes(3)
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'CANDIDATE_DETECTED' }))
  })

  it('sobrevive a um detect() que nunca assenta: o ciclo retoma em vez de ficar inerte para sempre', async () => {
    const nuncaAssenta = new Promise<DetectedFace[]>(() => {})
    const detect = vi.fn().mockReturnValueOnce(nuncaAssenta).mockResolvedValue([face])
    const detector: FaceDetector = { loadModels: vi.fn().mockResolvedValue(undefined), detect }
    const scheduler = createManualScheduler()
    const clock = createManualClock()
    const dispatch = vi.fn()

    const { result } = renderHook(() =>
      useFaceDetection({
        videoElement: fakeVideo(4),
        state: 'DETECTANDO',
        value: null,
        dispatch,
        detector,
        sampleFaceImageData: () => sharpWellLitImage(),
        scheduleFrame: scheduler.scheduleFrame,
        cancelFrame: scheduler.cancelFrame,
        now: clock.now,
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('ready'))

    const processarQuadro = async (avanco = 200) => {
      clock.advance(avanco)
      await act(async () => {
        scheduler.tick()
        await Promise.resolve()
        await Promise.resolve()
      })
    }

    // Primeiro quadro: entra no motor e nunca volta.
    await processarQuadro()
    expect(detect).toHaveBeenCalledTimes(1)

    // Enquanto o prazo do cão de guarda não vence, a exclusividade é respeitada.
    await processarQuadro()
    expect(detect).toHaveBeenCalledTimes(1)

    // Passado o prazo, o ciclo precisa se soltar e voltar a trabalhar.
    await processarQuadro(5000)
    await processarQuadro()

    expect(detect.mock.calls.length).toBeGreaterThan(1)
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'CANDIDATE_DETECTED' }))
  })
})
