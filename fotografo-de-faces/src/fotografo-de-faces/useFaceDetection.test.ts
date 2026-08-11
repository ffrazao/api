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
  // readyState 4 (HAVE_ENOUGH_DATA): um `<video>` sem quadro decodificado não vai para o motor.
  return { videoWidth: FRAME.width, videoHeight: FRAME.height, readyState: 4 } as unknown as HTMLVideoElement
}

/** 68 landmarks sintéticos de um rosto frontal, ereto — mesma construção de faceMetrics.test.ts. */
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

/** Mesmos landmarks, mas com pose claramente virada/desalinhada (yaw grande). */
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

/** Caixa no canto — longe do centro, para simular uma segunda face bem separada da primeira. */
function offCenterBox(coverageRatio = 0.2): BoundingBox {
  const area = FRAME.width * FRAME.height * coverageRatio
  const side = Math.sqrt(area)
  return { x: FRAME.width - side - 5, y: 5, width: side, height: side }
}

function shiftBox(box: BoundingBox, dx: number, dy: number): BoundingBox {
  return { ...box, x: box.x + dx, y: box.y + dy }
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
  return {
    scheduleFrame,
    cancelFrame,
    tick: () => latestTick?.(),
  }
}

function createManualClock(start = 0) {
  let current = start
  return { now: () => current, advance: (ms: number) => (current += ms) }
}

function createFakeDetector(detect: FaceDetector['detect']): FaceDetector {
  return { loadModels: vi.fn().mockResolvedValue(undefined), detect }
}

/** Junta a máquina real da F1 com o hook da F3, para testar o efeito de ponta a ponta:
 * o sinal que useFaceDetection despacha realmente conduz a máquina ao estado esperado. */
function useMachineWithDetection(options: Omit<UseFaceDetectionOptions, 'state' | 'value' | 'dispatch'>) {
  const [context, dispatch] = useReducer(fotografoDeFacesReducer, createInitialMachineContext())
  const detection = useFaceDetection({ ...options, state: context.state, value: context.value, dispatch })
  return { context, dispatch, detection }
}

async function readyAndDetecting(result: { current: ReturnType<typeof useMachineWithDetection> }) {
  await waitFor(() => expect(result.current.detection.status).toBe('ready'))
  act(() => result.current.dispatch({ type: 'DETECTION_STARTED' }))
  await waitFor(() => expect(result.current.context.state).toBe('DETECTANDO'))
}

describe('useFaceDetection — face alinhada e nítida (§07.3/§07.4)', () => {
  it('sinaliza qualidade aprovada e conduz a máquina até PRONTO', async () => {
    const face: DetectedFace = { box: centeredBox(), landmarks: frontalLandmarks() }
    const detector = createFakeDetector(vi.fn().mockResolvedValue([face]))
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

    await readyAndDetecting(result)

    // 1º quadro processado: nenhuma candidata ainda -> CANDIDATE_DETECTED (DETECTANDO
    // -> AVALIANDO) seguido, no mesmo quadro, de QUALITY_CHANGED aprovado -> PRONTO.
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.context.state).toBe('PRONTO'))

    // Quadros seguintes continuam aprovando a qualidade — permanece em PRONTO.
    clock.advance(200)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.context.state).toBe('PRONTO')
  })
})

describe('useFaceDetection — face desalinhada (§07.3)', () => {
  it('mantém a máquina em AVALIANDO enquanto a pose não é aprovada', async () => {
    const face: DetectedFace = { box: centeredBox(), landmarks: turnedLandmarks() }
    const detector = createFakeDetector(vi.fn().mockResolvedValue([face]))
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

    await readyAndDetecting(result)

    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.context.state).toBe('AVALIANDO')

    clock.advance(200)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.context.state).toBe('AVALIANDO')
    expect(result.current.context.quality?.aprovada).toBe(false)
    expect(result.current.context.quality?.criteria.pose).toBe(false)
  })

  it('não avança quando mais de uma face é detectada (§07.2)', async () => {
    const faces: DetectedFace[] = [
      { box: centeredBox(), landmarks: frontalLandmarks() },
      { box: centeredBox(), landmarks: frontalLandmarks() },
    ]
    const detector = createFakeDetector(vi.fn().mockResolvedValue(faces))
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

    await readyAndDetecting(result)

    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.context.state).toBe('DETECTANDO')
  })
})

describe('useFaceDetection — perda de face (§06.4, §18.4)', () => {
  it('tolera um sumiço breve, mas devolve a máquina a DETECTANDO após a tolerância (CANDIDATE_LOST)', async () => {
    const face: DetectedFace = { box: centeredBox(), landmarks: frontalLandmarks() }
    const detect = vi.fn().mockResolvedValue([face])
    const detector = createFakeDetector(detect)
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
        candidateLossToleranceMs: 500,
      }),
    )

    await readyAndDetecting(result)

    // Estabelece a candidata primeiro (face bem alinhada -> chega a PRONTO no mesmo quadro).
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.context.state).toBe('PRONTO'))

    // A face some por um instante curto — não deve, sozinho, perder a candidata.
    detect.mockResolvedValue([])
    clock.advance(200)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.context.state).toBe('PRONTO')

    // Passa da tolerância de oscilação (§18.4) — agora sim, perde a candidata.
    clock.advance(600)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })

    // §06.4: o retorno observável é DETECTANDO (o "AGUARDANDO -> DETECTANDO" da
    // spec é um único salto, já validado nos testes da F1 em machine.test.ts).
    expect(result.current.context.state).toBe('DETECTANDO')
  })
})

describe('useFaceDetection — regras por modo (§03, §09.11, F6)', () => {
  it('autorretrato: múltiplas faces bloqueiam o avanço, mesmo com uma delas perfeita', async () => {
    const faces: DetectedFace[] = [
      { box: centeredBox(), landmarks: frontalLandmarks() },
      { box: offCenterBox(), landmarks: frontalLandmarks() },
    ]
    const detector = createFakeDetector(vi.fn().mockResolvedValue(faces))
    const scheduler = createManualScheduler()
    const clock = createManualClock()

    const { result } = renderHook(() =>
      useMachineWithDetection({
        videoElement: fakeVideo(),
        mode: 'autorretrato',
        detector,
        sampleFaceImageData: () => sharpWellLitImage(),
        scheduleFrame: scheduler.scheduleFrame,
        cancelFrame: scheduler.cancelFrame,
        now: clock.now,
      }),
    )

    await readyAndDetecting(result)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.context.state).toBe('DETECTANDO')
  })

  it('assistido: mesma regra de exatamente uma face do autorretrato', async () => {
    const faces: DetectedFace[] = [
      { box: centeredBox(), landmarks: frontalLandmarks() },
      { box: offCenterBox(), landmarks: frontalLandmarks() },
    ]
    const detector = createFakeDetector(vi.fn().mockResolvedValue(faces))
    const scheduler = createManualScheduler()
    const clock = createManualClock()

    const { result } = renderHook(() =>
      useMachineWithDetection({
        videoElement: fakeVideo(),
        mode: 'assistido',
        detector,
        sampleFaceImageData: () => sharpWellLitImage(),
        scheduleFrame: scheduler.scheduleFrame,
        cancelFrame: scheduler.cancelFrame,
        now: clock.now,
      }),
    )

    await readyAndDetecting(result)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.context.state).toBe('DETECTANDO')
  })

  it('quiosque: o mesmo cenário de múltiplas faces não bloqueia — seleciona e trava a de melhor qualidade (§03.2, §09.1)', async () => {
    // A caixa maior/mais perto (cobre mais do quadro) tem pose ruim e pouca luz;
    // a menor é frontal, nítida e bem enquadrada — a seleção deve escolher
    // a de melhor qualidade, nunca a maior/mais perto (§09.2, §09.9).
    const faces: DetectedFace[] = [
      { box: centeredBox(0.5), landmarks: turnedLandmarks() },
      { box: centeredBox(0.15), landmarks: frontalLandmarks() },
    ]
    const detector = createFakeDetector(vi.fn().mockResolvedValue(faces))
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
      }),
    )

    await readyAndDetecting(result)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })

    // Não bloqueia (diferente de autorretrato/assistido) — avança de verdade.
    expect(result.current.context.state).not.toBe('DETECTANDO')
    expect(result.current.detection.visibleFaces).toHaveLength(2)
    const locked = result.current.detection.visibleFaces.find((face) => face.locked)
    expect(locked?.box).toEqual(faces[1].box)
  })
})

describe('useFaceDetection — Face Lock: invariabilidade de foco (§08.3, §08.5, §09.5, F6)', () => {
  it('mantém o foco na candidata travada mesmo quando uma face "melhor" invade o quadro depois', async () => {
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
      }),
    )

    await readyAndDetecting(result)

    // 1º quadro: só a candidata original — trava nela.
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.detection.visibleFaces).toHaveLength(1)
    expect(result.current.detection.visibleFaces[0].locked).toBe(true)

    // 2º quadro: a candidata original se move um pouco, e uma "invasora" com
    // ótima qualidade aparece longe dela — o foco deve continuar na original.
    const invasora: DetectedFace = { box: offCenterBox(0.3), landmarks: frontalLandmarks() }
    const originalMovida: DetectedFace = { box: shiftBox(original.box, 5, 4), landmarks: frontalLandmarks() }
    detect.mockResolvedValue([invasora, originalMovida])
    clock.advance(200)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.detection.visibleFaces).toHaveLength(2)
    const locked = result.current.detection.visibleFaces.find((face) => face.locked)
    expect(locked?.box).toEqual(originalMovida.box)
  })
})

describe('useFaceDetection — Face Lock: perda transitória mantém, perda permanente libera (§08.6, §08.7, §08.10, F6)', () => {
  it('tolera oscilação breve sem soltar o lock, mas libera e volta a DETECTANDO após a tolerância', async () => {
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
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.detection.visibleFaces).toHaveLength(1)

    // Oclusão breve — abaixo da tolerância — não deve soltar o Face Lock.
    detect.mockResolvedValue([])
    clock.advance(200)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.context.state).not.toBe('DETECTANDO')

    // A candidata reaparece na mesma posição — retoma o rastreamento normalmente.
    detect.mockResolvedValue([original])
    clock.advance(100)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.context.state).not.toBe('DETECTANDO')

    // Agora uma oclusão que ultrapassa a tolerância — libera o lock (§08.10) e
    // devolve o fluxo à busca (§08.7; observável como DETECTANDO — §06.4). A
    // reaparição no passo anterior zerou o contador de oscilação, então o
    // primeiro quadro sem face aqui só MARCA o início da nova ausência —
    // exceder a tolerância exige um quadro seguinte, já além dos 500ms. O
    // avanço precisa superar o intervalo mínimo entre quadros processados
    // (~83ms a 12fps) para este quadro intermediário não ser descartado pelo
    // limitador de taxa (crit. "Processamento Otimizado").
    detect.mockResolvedValue([])
    clock.advance(90)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.context.state).not.toBe('DETECTANDO')

    clock.advance(600)
    await act(async () => {
      scheduler.tick()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.context.state).toBe('DETECTANDO')
    expect(result.current.detection.visibleFaces).toHaveLength(0)
  })
})
