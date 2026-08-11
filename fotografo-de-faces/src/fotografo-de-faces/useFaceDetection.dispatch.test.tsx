import { act, renderHook, waitFor } from '@testing-library/react'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { DetectedFace, FaceDetector } from './faceDetector'
import type { BoundingBox, ImageDataLike, Point2D } from './faceMetrics'
import { createInitialMachineContext, fotografoDeFacesReducer } from './machine'
import { useFaceDetection } from './useFaceDetection'
import type { UseFaceDetectionOptions } from './useFaceDetection'
import type { FotografoDeFacesEvent } from './types'

/**
 * Regressão do bug "o sinal de detecção para de chegar na máquina": o hook
 * mantinha uma cópia-sombra de "já existe candidata" (`hasCandidateRef`), mas
 * o reducer pode zerar a candidata sozinho e voltar a DETECTANDO (§06.4/§06.5)
 * sem que o hook fique sabendo. A partir daí o hook só mandava QUALITY_CHANGED
 * — que DETECTANDO ignora — e o ciclo travava para sempre com o rosto em cena.
 */

const FRAME = { width: 640, height: 480 }

function fakeVideo(): HTMLVideoElement {
  // readyState 4 (HAVE_ENOUGH_DATA): um `<video>` sem quadro decodificado não vai para o motor.
  return { videoWidth: FRAME.width, videoHeight: FRAME.height, readyState: 4 } as unknown as HTMLVideoElement
}

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

/** Mesma face, mas com a cabeça virada — reprova o critério de pose. */
function turnedLandmarks(): Point2D[] {
  const points = frontalLandmarks()
  points[30] = { x: 350, y: 260 }
  return points
}

function centeredBox(coverageRatio = 0.2): BoundingBox {
  const area = FRAME.width * FRAME.height * coverageRatio
  const side = Math.sqrt(area)
  return { x: (FRAME.width - side) / 2, y: (FRAME.height - side) / 2, width: side, height: side }
}

function sharpWellLitImage(): ImageDataLike {
  const width = 20
  const height = 20
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const value = (x + y) % 2 === 0 ? 220 : 60
      data[i * 4] = value
      data[i * 4 + 1] = value
      data[i * 4 + 2] = value
      data[i * 4 + 3] = 255
    }
  }
  return { data, width, height }
}

const faceBoa: DetectedFace = { box: centeredBox(), landmarks: frontalLandmarks() }
const faceVirada: DetectedFace = { box: centeredBox(), landmarks: turnedLandmarks() }

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

/** Junta a máquina real da F1 ao hook, para observar o efeito real do dispatch. */
function useMachineWithDetection(options: Omit<UseFaceDetectionOptions, 'state' | 'value' | 'dispatch'>) {
  const [context, dispatch] = useReducer(fotografoDeFacesReducer, createInitialMachineContext())
  const detection = useFaceDetection({ ...options, state: context.state, value: context.value, dispatch })
  return { context, dispatch, detection }
}

describe('useFaceDetection — continuidade do dispatch para a máquina', () => {
  it('volta a anunciar a candidata quando a máquina retorna sozinha para DETECTANDO com o rosto ainda em cena', async () => {
    const detect = vi.fn().mockResolvedValue([faceBoa])
    const detector: FaceDetector = { loadModels: vi.fn().mockResolvedValue(undefined), detect }
    const scheduler = createManualScheduler()
    const clock = createManualClock()

    const { result } = renderHook(() =>
      useMachineWithDetection({
        videoElement: fakeVideo(),
        detector,
        sampleFaceImageData: () => sharpWellLitImage(),
        scheduleFrame: scheduler.scheduleFrame,
        cancelFrame: scheduler.cancelFrame,
        now: clock.now,
      }),
    )

    await waitFor(() => expect(result.current.detection.status).toBe('ready'))
    act(() => result.current.dispatch({ type: 'DETECTION_STARTED' }))
    await waitFor(() => expect(result.current.context.state).toBe('DETECTANDO'))

    const processarQuadro = async () => {
      clock.advance(200)
      await act(async () => {
        scheduler.tick()
        await Promise.resolve()
        await Promise.resolve()
      })
    }

    // 1) Rosto bom: a máquina avança até PRONTO.
    await processarQuadro()
    await waitFor(() => expect(result.current.context.state).toBe('PRONTO'))

    // 2) Uma oscilação de qualidade (virou o rosto) devolve a máquina a
    //    DETECTANDO e zera a candidata — comportamento correto (§06.4/§06.5).
    //    O rosto NUNCA sai de cena.
    detect.mockResolvedValue([faceVirada])
    await processarQuadro()
    expect(result.current.context.state).toBe('DETECTANDO')
    expect(result.current.context.candidate).toBeNull()

    // 3) O rosto volta a ficar bom. A detecção continua entregando faces, então
    //    a máquina precisa voltar a avançar — era exatamente aqui que travava.
    detect.mockResolvedValue([faceBoa])
    for (let i = 0; i < 5; i++) await processarQuadro()

    expect(result.current.context.state).not.toBe('DETECTANDO')
    expect(result.current.context.candidate).not.toBeNull()
  })

  it('mantém o dispatch a cada quadro válido ao longo de dezenas de ciclos consecutivos', async () => {
    const dispatch = vi.fn()
    const detect = vi.fn().mockResolvedValue([faceBoa])
    const detector: FaceDetector = { loadModels: vi.fn().mockResolvedValue(undefined), detect }
    const scheduler = createManualScheduler()
    const clock = createManualClock()

    const { result } = renderHook(() =>
      useFaceDetection({
        videoElement: fakeVideo(),
        state: 'AVALIANDO',
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

    const QUADROS = 40
    for (let i = 0; i < QUADROS; i++) {
      clock.advance(200)
      await act(async () => {
        scheduler.tick()
        await Promise.resolve()
        await Promise.resolve()
      })
    }

    const qualityDispatches = dispatch.mock.calls.filter(
      (call) => (call[0] as FotografoDeFacesEvent).type === 'QUALITY_CHANGED',
    )
    expect(qualityDispatches).toHaveLength(QUADROS)
    expect(detect).toHaveBeenCalledTimes(QUADROS)
  })
})
