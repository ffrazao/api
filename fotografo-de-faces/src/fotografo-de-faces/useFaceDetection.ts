/**
 * Motor de detecção e avaliação de qualidade — F3/F6 (§03, §05.2, §07.2–§07.4,
 * §08, §09, §10.13, §18.4).
 *
 * Carrega os modelos da face-api.js de forma assíncrona e roda um loop de
 * avaliação throttled sobre o elemento `<video>` (F2), alimentando a máquina
 * de estados (F1) com `CANDIDATE_DETECTED`/`QUALITY_CHANGED`/`CANDIDATE_LOST` —
 * nunca decidindo estado por conta própria; quem decide é sempre o reducer.
 *
 * F6 acrescenta o comportamento por modo (§03): autorretrato/assistido
 * continuam exigindo exatamente uma face; quiosque aceita várias, seleciona a
 * de melhor qualidade geométrica/biométrica (nunca a maior/mais perto — §09.2,
 * §09.9) e então mantém o Face Lock nela por continuidade espacial entre
 * quadros, ignorando qualquer outra face — mesmo uma "melhor" — enquanto o
 * lock estiver ativo (§08.3, §08.5, §09.5).
 */
import { useEffect, useRef, useState } from 'react'
import { createFaceApiDetector } from './faceDetector'
import type { DetectedFace, FaceDetector } from './faceDetector'
import { evaluateQuality, findClosestBoxIndex, selectBestFaceIndex } from './faceMetrics'
import type { BoundingBox, FrameSize, ImageDataLike, QualityThresholds } from './faceMetrics'
import type { FotografiaValue, FotografoDeFacesEvent, FotografoDeFacesMode, FotografoDeFacesState } from './types'

export type FaceDetectionStatus = 'idle' | 'loading-models' | 'ready' | 'error'

/** Uma face atualmente visível no quadro, para renderização (§07.9, §09.6) — não é usada pela máquina de estados. */
export interface VisibleFace {
  id: string
  box: BoundingBox
  /** true só para a candidata selecionada/travada pelo Face Lock no quiosque. */
  locked: boolean
}

export interface UseFaceDetectionOptions {
  /** Elemento de vídeo já conectado ao stream da câmera (F2); `null` enquanto não houver um. */
  videoElement: HTMLVideoElement | null
  state: FotografoDeFacesState
  value: FotografiaValue
  dispatch: (event: FotografoDeFacesEvent) => void
  /** §03 — muda a regra de contagem de faces e ativa a seleção/Face Lock no quiosque. */
  mode?: FotografoDeFacesMode
  /** URL de onde carregar os modelos da face-api.js. Padrão: `/models`. */
  modelsUrl?: string
  /** Injeção para testes; por padrão usa a face-api.js real. */
  detector?: FaceDetector
  /** Extrai os pixels do recorte da face para nitidez/iluminação; injetável para testes. */
  sampleFaceImageData?: (video: HTMLVideoElement, box: BoundingBox) => ImageDataLike
  thresholds?: QualityThresholds
  /** Limite de quadros processados por segundo (crit. "Processamento Otimizado"). */
  targetFps?: number
  /** Tolerância de oscilação antes de considerar a candidata perdida (§08.6, §18.4), em ms. */
  candidateLossToleranceMs?: number
  /** Agenda o próximo quadro; por padrão `requestAnimationFrame`. Injetável para testes. */
  scheduleFrame?: (callback: () => void) => number
  cancelFrame?: (handle: number) => void
  /** Relógio injetável para testes; por padrão `performance.now()`. */
  now?: () => number
}

export interface UseFaceDetectionResult {
  status: FaceDetectionStatus
  /** Só populado no modo quiosque — todas as faces do quadro atual, com a travada marcada (§07.9, §09.6). */
  visibleFaces: VisibleFace[]
  /**
   * Última caixa conhecida da candidata atual, em qualquer modo — é o que a
   * captura (F9) usa para recortar a fotografia. Continua disponível durante
   * CAPTURANDO (a detecção já não roda mais nesse estado, mas o valor não é
   * limpo só por isso) até a próxima candidata real substituí-lo.
   */
  candidateBox: BoundingBox | null
}

/** Estados em que a máquina está buscando/avaliando uma candidata (§06.1, §07.2–§07.5). */
const ACTIVE_STATES = new Set<FotografoDeFacesState>(['DETECTANDO', 'AVALIANDO', 'PRONTO', 'CRONOMETRANDO'])

const DEFAULT_MODELS_URL = '/models'
const DEFAULT_TARGET_FPS = 12
const DEFAULT_CANDIDATE_LOSS_TOLERANCE_MS = 700
/** Deslocamento máximo (fração da largura do quadro) para considerar duas caixas a mesma face entre quadros (§08.4). */
const DEFAULT_LOCK_CONTINUITY_RATIO = 0.25

function defaultSampleFaceImageData(video: HTMLVideoElement, box: BoundingBox): ImageDataLike {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(box.width))
  canvas.height = Math.max(1, Math.round(box.height))
  const ctx = canvas.getContext('2d')
  if (!ctx) return { data: new Uint8ClampedArray(0), width: 0, height: 0 }
  ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, canvas.width, canvas.height)
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

const defaultScheduleFrame = (callback: () => void) => requestAnimationFrame(() => callback())
const defaultCancelFrame = (handle: number) => cancelAnimationFrame(handle)
const defaultNow = () => performance.now()

function areVisibleFacesEqual(a: VisibleFace[], b: VisibleFace[]): boolean {
  if (a === b) return true
  if (a.length !== b.length) return false
  return a.every((face, index) => {
    const other = b[index]
    return (
      face.id === other.id &&
      face.locked === other.locked &&
      face.box.x === other.box.x &&
      face.box.y === other.box.y &&
      face.box.width === other.box.width &&
      face.box.height === other.box.height
    )
  })
}

export function useFaceDetection(options: UseFaceDetectionOptions): UseFaceDetectionResult {
  const {
    videoElement,
    state,
    value,
    dispatch,
    mode = 'autorretrato',
    modelsUrl = DEFAULT_MODELS_URL,
    thresholds,
    targetFps = DEFAULT_TARGET_FPS,
    candidateLossToleranceMs = DEFAULT_CANDIDATE_LOSS_TOLERANCE_MS,
  } = options

  const sampleFaceImageData = options.sampleFaceImageData ?? defaultSampleFaceImageData
  const scheduleFrame = options.scheduleFrame ?? defaultScheduleFrame
  const cancelFrame = options.cancelFrame ?? defaultCancelFrame
  const now = options.now ?? defaultNow

  const defaultDetectorRef = useRef<FaceDetector | null>(null)
  if (!options.detector && !defaultDetectorRef.current) {
    defaultDetectorRef.current = createFaceApiDetector()
  }
  const detector = options.detector ?? defaultDetectorRef.current!

  const [status, setStatus] = useState<FaceDetectionStatus>('idle')
  const [visibleFaces, setVisibleFaces] = useState<VisibleFace[]>([])
  const [candidateBox, setCandidateBox] = useState<BoundingBox | null>(null)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Carrega os modelos assim que houver chance de precisar deles (value nulo),
  // sem bloquear a thread principal (§1 — não bloqueio) e sem esperar o vídeo.
  useEffect(() => {
    if (value !== null) return

    let cancelled = false
    setStatus('loading-models')
    detector
      .loadModels(modelsUrl)
      .then(() => {
        if (!cancelled) setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [value, detector, modelsUrl])

  const hasCandidateRef = useRef(false)
  const previousBoxRef = useRef<BoundingBox | null>(null)
  const noFaceStreakStartRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  // -Infinity garante que o primeiro quadro do ciclo seja sempre processado,
  // mesmo quando o relógio injetado (testes) começa em 0.
  const lastProcessedAtRef = useRef(-Infinity)

  const active = status === 'ready' && value === null && ACTIVE_STATES.has(state) && videoElement !== null

  useEffect(() => {
    // Só atualiza o estado quando o conteúdo de fato muda — indispensável
    // aqui: este efeito reexecuta a cada render em que alguma opção
    // injetada (ex.: `sampleFaceImageData` inline nos testes) não for
    // referencialmente estável, e um setState incondicional nesse caminho
    // criaria um loop infinito de re-render.
    const updateVisibleFaces = (next: VisibleFace[]) => {
      setVisibleFaces((prev) => (areVisibleFacesEqual(prev, next) ? prev : next))
    }

    const updateCandidateBox = (next: BoundingBox) => {
      setCandidateBox((prev) =>
        prev && prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height
          ? prev
          : next,
      )
    }

    if (!active || !videoElement) {
      // Desativação de verdade (não é uma reexecução síncrona do efeito) —
      // encerra a sessão de candidata local para começar do zero da próxima vez.
      hasCandidateRef.current = false
      previousBoxRef.current = null
      noFaceStreakStartRef.current = null
      updateVisibleFaces([])
      return
    }

    const frameIntervalMs = 1000 / targetFps

    const evaluateAndDispatch = (face: DetectedFace, frame: FrameSize) => {
      const faceImage = sampleFaceImageData(videoElement, face.box)
      const quality = evaluateQuality(
        { box: face.box, landmarks: face.landmarks, frame, faceImage, previousBox: previousBoxRef.current },
        thresholds,
      )
      previousBoxRef.current = face.box
      updateCandidateBox(face.box)
      dispatch({ type: 'QUALITY_CHANGED', quality })
    }

    /** §08.6/§18.4: tolera oscilação antes de liberar o Face Lock e voltar a buscar (§08.7, §08.10, §06.4). */
    const handleCandidateNotVisible = (nowMs: number) => {
      if (!hasCandidateRef.current) return
      if (noFaceStreakStartRef.current === null) {
        noFaceStreakStartRef.current = nowMs
      } else if (nowMs - noFaceStreakStartRef.current >= candidateLossToleranceMs) {
        dispatch({ type: 'CANDIDATE_LOST' })
        hasCandidateRef.current = false
        noFaceStreakStartRef.current = null
        previousBoxRef.current = null
        updateVisibleFaces([])
      }
    }

    // §03.1/§03.3, §09.11: autorretrato/assistido só avançam com exatamente uma face.
    const handleSingleFaceMode = (faces: DetectedFace[], frame: FrameSize, nowMs: number) => {
      if (faces.length !== 1) {
        handleCandidateNotVisible(nowMs)
        return
      }

      noFaceStreakStartRef.current = null
      const face = faces[0]

      if (!hasCandidateRef.current) {
        hasCandidateRef.current = true
        previousBoxRef.current = null
        dispatch({ type: 'CANDIDATE_DETECTED', candidate: { id: `face-${Math.round(nowMs)}` } })
      }

      evaluateAndDispatch(face, frame)
    }

    // §03.2, §08, §09: quiosque aceita várias faces, seleciona a melhor (nunca a
    // maior) e trava por continuidade espacial, ignorando as demais depois.
    const handleQuiosqueMode = (faces: DetectedFace[], frame: FrameSize, nowMs: number) => {
      if (!hasCandidateRef.current) {
        if (faces.length === 0) {
          updateVisibleFaces([])
          return
        }

        const bestIndex = selectBestFaceIndex(
          faces.map((face) => ({ box: face.box, landmarks: face.landmarks, frame, faceImage: sampleFaceImageData(videoElement, face.box) })),
          thresholds,
        )

        hasCandidateRef.current = true
        previousBoxRef.current = null
        noFaceStreakStartRef.current = null
        dispatch({ type: 'CANDIDATE_DETECTED', candidate: { id: `face-${Math.round(nowMs)}` } })
        evaluateAndDispatch(faces[bestIndex], frame)
        updateVisibleFaces(faces.map((face, index) => ({ id: `visible-${index}`, box: face.box, locked: index === bestIndex })))
        return
      }

      // Já travado: só tenta reencontrar a MESMA face por proximidade espacial
      // — nunca reavalia qualidade nem deixa outra face "invadir" o foco.
      const lockedBox = previousBoxRef.current
      const matchIndex =
        lockedBox && faces.length > 0
          ? findClosestBoxIndex(
              faces.map((face) => face.box),
              lockedBox,
              frame,
              DEFAULT_LOCK_CONTINUITY_RATIO,
            )
          : -1

      if (matchIndex === -1) {
        updateVisibleFaces(faces.map((face, index) => ({ id: `visible-${index}`, box: face.box, locked: false })))
        handleCandidateNotVisible(nowMs)
        return
      }

      noFaceStreakStartRef.current = null
      evaluateAndDispatch(faces[matchIndex], frame)
      updateVisibleFaces(faces.map((face, index) => ({ id: `visible-${index}`, box: face.box, locked: index === matchIndex })))
    }

    // Cada execução do efeito é dona do seu próprio ciclo. O handle fica numa
    // variável local (não num ref compartilhado) para que uma execução nunca
    // cancele o quadro agendado por outra, e `encerrado` garante que um
    // `detect()` ainda em voo de uma execução antiga não despache resultado
    // depois do cleanup — ali as closures de `mode`/`videoElement` já estão
    // obsoletas. Note que isso só descarta o resultado ANTIGO: a execução nova
    // agenda o próprio quadro normalmente, sem ficar bloqueada.
    let frameHandle: number | null = null
    let encerrado = false

    const tick = () => {
      if (encerrado) return
      frameHandle = scheduleFrame(tick)

      if (processingRef.current) return // exclusividade: não sobrepõe detecções.
      const nowMs = now()
      if (nowMs - lastProcessedAtRef.current < frameIntervalMs) return // limita a taxa (crit. 2).
      lastProcessedAtRef.current = nowMs

      processingRef.current = true
      detector
        .detect(videoElement)
        .then((faces) => {
          if (encerrado || !isMountedRef.current) return
          const frame = { width: videoElement.videoWidth, height: videoElement.videoHeight }
          if (mode === 'quiosque') {
            handleQuiosqueMode(faces, frame, nowMs)
          } else {
            handleSingleFaceMode(faces, frame, nowMs)
          }
        })
        .catch(() => {
          // Falha pontual do motor não deve travar o ciclo — só pula o quadro.
        })
        .finally(() => {
          processingRef.current = false
        })
    }

    frameHandle = scheduleFrame(tick)
    return () => {
      encerrado = true
      if (frameHandle !== null) cancelFrame(frameHandle)
    }
  }, [
    active,
    videoElement,
    detector,
    dispatch,
    mode,
    targetFps,
    candidateLossToleranceMs,
    thresholds,
    sampleFaceImageData,
    scheduleFrame,
    cancelFrame,
    now,
  ])

  return { status, visibleFaces, candidateBox }
}
