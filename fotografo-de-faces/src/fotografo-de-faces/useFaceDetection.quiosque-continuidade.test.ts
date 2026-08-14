/**
 * Continuidade do Face Lock no quiosque sob ruído/latência do detector — F13
 * (§07.9.1, §08.3, §08.5, §09.5, §10.8).
 *
 * Reproduz e cobre a correção de dois defeitos relatados juntos ("a moldura
 * da candidata travada alterna entre círculo e retângulo" e "o cronômetro
 * reinicia diversas vezes"), com causas raiz DISTINTAS confirmadas por
 * instrumentação antes da correção (ver relatório da investigação):
 *
 * 1. Um único quadro em que o motor não encontra nenhuma face (ruído comum de
 *    detector, não perda de verdade) esvaziava `visibleFaces` mesmo com a
 *    candidata ainda dentro da tolerância de perda — FotografoDeFaces.tsx
 *    caía então no fallback de moldura única em formato OVAL (o mesmo usado
 *    em autorretrato/assistido), violando §07.9.1 ("estritamente molduras
 *    retangulares... nenhuma circunstância") só naquele quadro, e voltando ao
 *    retângulo no quadro seguinte — a alternância observada.
 * 2. A correspondência por proximidade espacial (`findClosestBoxIndex`) usa
 *    um limiar FIXO de 25% da largura do quadro entre dois quadros
 *    PROCESSADOS, sem considerar quanto tempo passou entre eles. Sob um motor
 *    mais lento (quadros mais espaçados — ver `proximoIntervalo` em
 *    useFaceDetection.ts), um deslocamento normal da candidata já ultrapassa
 *    esse limiar, mesmo que o motor encontre uma face em TODO quadro sem
 *    nunca perdê-la de vista de verdade — e isso alimentava a MESMA contagem
 *    de tolerância usada para sumiço total, cancelando o cronômetro sem a
 *    pessoa ter saído de cena.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { useReducer } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { DetectedFace, FaceDetector } from './faceDetector'
import type { BoundingBox, ImageDataLike, Point2D } from './faceMetrics'
import { createInitialMachineContext, fotografoDeFacesReducer } from './machine'
import { useFaceDetection } from './useFaceDetection'
import type { UseFaceDetectionOptions } from './useFaceDetection'

const FRAME = { width: 640, height: 480 }

function fakeVideo(): HTMLVideoElement {
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

function boxAt(centerX: number, coverageRatio = 0.2): BoundingBox {
  const area = FRAME.width * FRAME.height * coverageRatio
  const side = Math.sqrt(area)
  return { x: centerX - side / 2, y: (FRAME.height - side) / 2, width: side, height: side }
}

function centeredBox(coverageRatio = 0.2): BoundingBox {
  return boxAt(FRAME.width / 2, coverageRatio)
}

/** Segunda caixa bem separada da primeira, para os cenários com duas faces no quadro. */
function offCenterBox(coverageRatio = 0.2): BoundingBox {
  const area = FRAME.width * FRAME.height * coverageRatio
  const side = Math.sqrt(area)
  return { x: FRAME.width - side - 5, y: 5, width: side, height: side }
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

function createManualScheduler() {
  let latestTick: (() => void) | null = null
  let handle = 0
  const scheduleFrame = vi.fn((callback: () => void) => {
    latestTick = callback
    return ++handle
  })
  const cancelFrame = vi.fn()
  return { scheduleFrame, cancelFrame, tick: () => latestTick?.() }
}

function createManualClock(start = 0) {
  let current = start
  return { now: () => current, advance: (ms: number) => (current += ms) }
}

function createFakeDetector(detect: FaceDetector['detect']): FaceDetector {
  return { loadModels: vi.fn().mockResolvedValue(undefined), detect }
}

function useMachineWithDetection(options: Omit<UseFaceDetectionOptions, 'state' | 'value' | 'dispatch'>) {
  const [context, dispatch] = useReducer(
    fotografoDeFacesReducer,
    createInitialMachineContext({ autoCaptureAfter: 3 }),
  )
  const detection = useFaceDetection({ ...options, state: context.state, value: context.value, dispatch })
  return { context, dispatch, detection }
}

async function readyAndDetecting(result: { current: ReturnType<typeof useMachineWithDetection> }) {
  await waitFor(() => expect(result.current.detection.status).toBe('ready'))
  act(() => result.current.dispatch({ type: 'DETECTION_STARTED' }))
  await waitFor(() => expect(result.current.context.state).toBe('DETECTANDO'))
}

async function quadro(scheduler: ReturnType<typeof createManualScheduler>) {
  await act(async () => {
    scheduler.tick()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('useFaceDetection — quiosque: falha momentânea de detecção não apaga a moldura travada (§07.9.1)', () => {
  it('um único quadro sem nenhuma face preserva visibleFaces enquanto a candidata segue dentro da tolerância de perda', async () => {
    const face: DetectedFace = { box: centeredBox(0.2), landmarks: frontalLandmarks() }
    const detect = vi.fn().mockResolvedValue([face])
    const detector = createFakeDetector(detect)
    const scheduler = createManualScheduler()
    const clock = createManualClock()

    const { result } = renderHook(() =>
      useMachineWithDetection({
        videoElement: fakeVideo(),
        mode: 'quiosque',
        detector,
        sampleFaceImageData: () => sharpWellLitImage(),
        scheduleFrame: scheduler.scheduleFrame,
        cancelFrame: scheduler.cancelFrame,
        now: clock.now,
        candidateLossToleranceMs: 700,
      }),
    )

    await readyAndDetecting(result)

    // Quadro 1: trava a candidata.
    await quadro(scheduler)
    expect(result.current.detection.visibleFaces).toHaveLength(1)
    expect(result.current.detection.visibleFaces[0].locked).toBe(true)

    // Quadro 2: falha momentânea do detector (nenhuma face encontrada neste
    // quadro específico) — bem dentro dos 700ms de tolerância.
    detect.mockResolvedValue([])
    clock.advance(200)
    await quadro(scheduler)

    // A máquina não considera a candidata perdida...
    expect(result.current.context.state).not.toBe('DETECTANDO')
    expect(result.current.context.candidate).not.toBeNull()
    // ...e a UI continua tendo uma face travada para desenhar (retângulo),
    // em vez de cair no fallback de moldura única oval.
    expect(result.current.detection.visibleFaces).toHaveLength(1)
    expect(result.current.detection.visibleFaces[0].locked).toBe(true)

    // A candidata reaparece — segue rastreando normalmente.
    detect.mockResolvedValue([face])
    clock.advance(100)
    await quadro(scheduler)
    expect(result.current.detection.visibleFaces[0].locked).toBe(true)
  })

  it('uma perda de verdade (tolerância esgotada) ainda limpa visibleFaces normalmente', async () => {
    const face: DetectedFace = { box: centeredBox(0.2), landmarks: frontalLandmarks() }
    const detect = vi.fn().mockResolvedValue([face])
    const detector = createFakeDetector(detect)
    const scheduler = createManualScheduler()
    const clock = createManualClock()

    const { result } = renderHook(() =>
      useMachineWithDetection({
        videoElement: fakeVideo(),
        mode: 'quiosque',
        detector,
        sampleFaceImageData: () => sharpWellLitImage(),
        scheduleFrame: scheduler.scheduleFrame,
        cancelFrame: scheduler.cancelFrame,
        now: clock.now,
        candidateLossToleranceMs: 500,
      }),
    )

    await readyAndDetecting(result)
    await quadro(scheduler)
    expect(result.current.detection.visibleFaces).toHaveLength(1)

    detect.mockResolvedValue([])
    clock.advance(200)
    await quadro(scheduler)
    expect(result.current.context.state).not.toBe('DETECTANDO')

    clock.advance(600)
    await quadro(scheduler)

    expect(result.current.context.state).toBe('DETECTANDO')
    expect(result.current.detection.visibleFaces).toHaveLength(0)
  })
})

describe('useFaceDetection — quiosque: continuidade do Face Lock não depende de distância quando só há uma face (§08.3, §08.5, §09.5, §20.8)', () => {
  it('uma face sempre detectada (nunca some), mas deslocando mais que o antigo limiar de 25% entre quadros processados, não perde mais o Face Lock', async () => {
    let centerX = FRAME.width / 2
    const detect = vi.fn(async () => [{ box: boxAt(centerX), landmarks: frontalLandmarks() }] as DetectedFace[])
    const detector = createFakeDetector(detect)
    const scheduler = createManualScheduler()
    const clock = createManualClock()

    const { result } = renderHook(() =>
      useMachineWithDetection({
        videoElement: fakeVideo(),
        mode: 'quiosque',
        detector,
        sampleFaceImageData: () => sharpWellLitImage(),
        scheduleFrame: scheduler.scheduleFrame,
        cancelFrame: scheduler.cancelFrame,
        now: clock.now,
        candidateLossToleranceMs: 700,
      }),
    )

    await readyAndDetecting(result)

    // Quadro 1: trava a candidata parada no centro.
    await quadro(scheduler)
    expect(result.current.detection.visibleFaces[0]?.locked).toBe(true)
    await waitFor(() => expect(['PRONTO', 'CRONOMETRANDO']).toContain(result.current.context.state))

    // Simula um motor mais lento (quadros processados bem mais espaçados que
    // os ~83ms do alvo de 12fps) enquanto a candidata se desloca moderamente
    // entre dois quadros processados — `faces.length` é SEMPRE 1, o motor
    // nunca deixa de encontrar a face.
    for (let i = 0; i < 6; i++) {
      centerX += 180 // acima dos 160px (25% de 640px) do antigo limiar fixo.
      clock.advance(400)
      await quadro(scheduler)
    }

    expect(detect).toHaveBeenCalledTimes(7)
    // O cronômetro nunca deveria ter sido cancelado: a candidata jamais
    // deixou de ser detectada em nenhum quadro processado.
    expect(result.current.context.state).toBe('CRONOMETRANDO')
    expect(result.current.context.candidate).not.toBeNull()
  })

  it('com DUAS faces no quadro, a correspondência por proximidade continua obrigatória (evita "roubo" de foco)', async () => {
    // Mantém a cobertura já existente de "Face Lock: invariabilidade de
    // foco" (useFaceDetection.test.ts), mas focada na fronteira exata da
    // correção: mais de uma face no quadro ainda precisa da checagem de
    // distância — só o caso de exatamente uma face foi relaxado.
    const original: DetectedFace = { box: centeredBox(0.2), landmarks: frontalLandmarks() }
    const detect = vi.fn().mockResolvedValue([original])
    const detector = createFakeDetector(detect)
    const scheduler = createManualScheduler()
    const clock = createManualClock()

    const { result } = renderHook(() =>
      useMachineWithDetection({
        videoElement: fakeVideo(),
        mode: 'quiosque',
        detector,
        sampleFaceImageData: () => sharpWellLitImage(),
        scheduleFrame: scheduler.scheduleFrame,
        cancelFrame: scheduler.cancelFrame,
        now: clock.now,
        candidateLossToleranceMs: 500,
      }),
    )

    await readyAndDetecting(result)
    await quadro(scheduler)
    expect(result.current.detection.visibleFaces).toHaveLength(1)

    // Duas faces aparecem: a candidata original NÃO se move, mas uma segunda
    // face bem distante entra em cena. Continua sem ambiguidade (a mais
    // próxima do último lock ainda é a original), então o lock segue nela.
    const invasora: DetectedFace = { box: offCenterBox(0.3), landmarks: frontalLandmarks() }
    detect.mockResolvedValue([invasora, original])
    clock.advance(200)
    await quadro(scheduler)

    expect(result.current.detection.visibleFaces).toHaveLength(2)
    const travada = result.current.detection.visibleFaces.find((face) => face.locked)
    expect(travada?.box).toEqual(original.box)
    expect(result.current.context.state).not.toBe('DETECTANDO')
  })
})
