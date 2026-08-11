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
import { DEFAULT_QUALITY_THRESHOLDS, evaluateQuality, findClosestBoxIndex, selectBestFaceIndex } from './faceMetrics'
import type { BoundingBox, FrameSize, ImageDataLike, QualityThresholds } from './faceMetrics'
import type { FotografiaValue, FotografoDeFacesEvent, FotografoDeFacesMode, FotografoDeFacesState } from './types'

export type FaceDetectionStatus = 'idle' | 'loading-models' | 'ready' | 'error'

/**
 * Observabilidade do loop de detecção — NÃO altera comportamento.
 *
 * O `catch` do tick engole qualquer exceção de propósito (uma falha pontual do
 * motor não pode matar o ciclo), mas isso também apagava qualquer rastro de
 * erro em `detect()`, `sampleFaceImageData`, `evaluateQuality` ou nos dispatches.
 * Em desenvolvimento o erro passa a ser anunciado antes de ser engolido; em
 * produção o Vite substitui `import.meta.env.DEV` por `false` e o bloco some no
 * tree-shaking, então o console do usuário final continua limpo.
 */
function avisarFalhaNoQuadro(fase: 'detect' | 'processamento', cause: unknown): void {
  if (!import.meta.env.DEV) return
  console.warn(
    `[FotografoDeFaces] quadro descartado — falha na fase "${fase}" do loop de detecção. ` +
      'O ciclo continua, mas este quadro não alimentou a máquina de estados.',
    cause,
  )
}

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
  /** Prazo para abandonar um quadro cujo `detect()` não assentou, mantendo o ciclo vivo (§05.2). */
  frameWatchdogMs?: number
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

/**
 * `HTMLMediaElement.HAVE_CURRENT_DATA` — há pelo menos um quadro decodificado.
 *
 * Abaixo disso o `<video>` não pode ser entregue ao motor: a face-api.js, ao
 * receber uma mídia que considera "ainda não carregada", fica esperando o
 * evento `load` do elemento — que um `<video>` nunca dispara (ele dispara
 * `loadeddata`/`canplay`). A promessa de `detect()` então nunca assenta: não
 * resolve, não rejeita, e nada aparece no `catch`.
 */
const HAVE_CURRENT_DATA = 2

/**
 * Prazo do cão de guarda do quadro em processamento (§05.2 — o ciclo não pode
 * morrer). É uma rede de segurança genérica: nenhuma promessa de `detect()`,
 * por qualquer motivo, pode deixar o loop inerte para sempre. Folgado de
 * propósito — uma inferência lenta em máquina fraca não pode ser confundida
 * com um travamento.
 */
const DEFAULT_FRAME_WATCHDOG_MS = 4000

/** Um `<video>` só pode ir para o motor com quadro decodificado e dimensões reais. */
function isVideoReadyForDetection(video: HTMLVideoElement): boolean {
  return video.readyState >= HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0
}

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
    frameWatchdogMs: watchdogMs = DEFAULT_FRAME_WATCHDOG_MS,
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

  // Espelho sempre atual do estado da máquina, sem entrar nas dependências do
  // efeito do loop (mesmo padrão de "ref com o valor mais recente" usado na
  // F5): o loop precisa consultar a verdade da máquina a cada quadro, mas não
  // deve ser reiniciado a cada transição de estado.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const hasCandidateRef = useRef(false)
  /** Histórico recente de caixas da candidata atual — base da média móvel de estabilidade (§10.13). */
  const recentBoxesRef = useRef<BoundingBox[]>([])
  const noFaceStreakStartRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  /** Quando o quadro em processamento entrou no motor — base do cão de guarda. */
  const processingStartedAtRef = useRef(0)
  /**
   * Geração do quadro em processamento. O cão de guarda incrementa isto ao
   * abandonar um quadro, para que um resultado atrasado que chegue depois seja
   * descartado em vez de alimentar a máquina fora de hora.
   */
  const processingGenerationRef = useRef(0)
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
      recentBoxesRef.current = []
      noFaceStreakStartRef.current = null
      updateVisibleFaces([])
      return
    }

    const frameIntervalMs = 1000 / targetFps

    /**
     * A MÁQUINA é a fonte da verdade sobre existir ou não uma candidata — o
     * hook só mantém `hasCandidateRef` como atalho local. Os dois podem
     * divergir sozinhos: uma oscilação de qualidade em PRONTO/CRONOMETRANDO
     * faz o reducer voltar a DETECTANDO e limpar a candidata (§06.4/§06.5),
     * e como DETECTANDO continua sendo um estado ativo, o efeito não
     * reexecuta e nada aqui seria avisado.
     *
     * Sem esta reconciliação, o hook seguiria achando que já anunciou a
     * candidata e mandaria apenas QUALITY_CHANGED — que DETECTANDO ignora —
     * travando o ciclo para sempre enquanto o rosto continuasse em cena.
     * Reconciliar a cada quadro torna o ciclo autocorretivo: assim que a
     * máquina volta a DETECTANDO, a próxima detecção reanuncia a candidata.
     */
    const reconciliarComMaquina = () => {
      if (stateRef.current === 'DETECTANDO' && hasCandidateRef.current) {
        hasCandidateRef.current = false
        // O Face Lock morre junto com a candidata: sem isso, o rastreamento
        // por proximidade continuaria mirando uma caixa órfã (§08.7, §08.10).
        recentBoxesRef.current = []
        noFaceStreakStartRef.current = null
      }
    }

    /**
     * Guarda só o necessário para a média móvel do critério de estabilidade —
     * um quadro a mais que a janela, já que a janela conta PARES de quadros.
     */
    const pushRecentBox = (box: BoundingBox) => {
      const limite = Math.max(1, (thresholds?.stability ?? DEFAULT_QUALITY_THRESHOLDS.stability).smoothingFrames)
      const historico = [...recentBoxesRef.current, box]
      recentBoxesRef.current = historico.slice(-limite)
    }

    const evaluateAndDispatch = (face: DetectedFace, frame: FrameSize) => {
      const faceImage = sampleFaceImageData(videoElement, face.box)
      const quality = evaluateQuality(
        { box: face.box, landmarks: face.landmarks, frame, faceImage, recentBoxes: recentBoxesRef.current },
        thresholds,
      )
      pushRecentBox(face.box)
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
        recentBoxesRef.current = []
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
        recentBoxesRef.current = []
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
        recentBoxesRef.current = []
        noFaceStreakStartRef.current = null
        dispatch({ type: 'CANDIDATE_DETECTED', candidate: { id: `face-${Math.round(nowMs)}` } })
        evaluateAndDispatch(faces[bestIndex], frame)
        updateVisibleFaces(faces.map((face, index) => ({ id: `visible-${index}`, box: face.box, locked: index === bestIndex })))
        return
      }

      // Já travado: só tenta reencontrar a MESMA face por proximidade espacial
      // — nunca reavalia qualidade nem deixa outra face "invadir" o foco.
      const lockedBox = recentBoxesRef.current.at(-1) ?? null
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

      const nowMs = now()

      if (processingRef.current) {
        // Exclusividade: não sobrepõe detecções — mas nunca em definitivo. Se o
        // motor não devolveu nada dentro do prazo, o quadro é abandonado e o
        // ciclo volta a andar; senão uma única promessa pendente deixaria o loop
        // vivo porém inerte para sempre (§05.2).
        if (nowMs - processingStartedAtRef.current < watchdogMs) return
        processingGenerationRef.current += 1
        processingRef.current = false
        avisarFalhaNoQuadro(
          'detect',
          new Error(`o motor não respondeu em ${watchdogMs}ms — quadro abandonado para não travar o ciclo`),
        )
      }

      if (nowMs - lastProcessedAtRef.current < frameIntervalMs) return // limita a taxa (crit. 2).

      // Entregar ao motor um `<video>` sem quadro decodificado trava a detecção
      // para sempre (ver HAVE_CURRENT_DATA). Só pula o quadro: assim que a
      // câmera decodificar o primeiro frame, o ciclo segue normalmente.
      if (!isVideoReadyForDetection(videoElement)) return

      lastProcessedAtRef.current = nowMs

      processingRef.current = true
      processingStartedAtRef.current = nowMs
      const geracao = processingGenerationRef.current
      detector
        .detect(videoElement)
        .then((faces) => {
          if (encerrado || !isMountedRef.current) return
          if (geracao !== processingGenerationRef.current) return // quadro já abandonado pelo cão de guarda.
          // O try/catch interno não muda o que acontece (o `.catch` de fora já
          // engolia isto): serve só para separar, no aviso, uma falha do motor
          // de uma falha do processamento do resultado.
          try {
            reconciliarComMaquina()
            const frame = { width: videoElement.videoWidth, height: videoElement.videoHeight }
            if (mode === 'quiosque') {
              handleQuiosqueMode(faces, frame, nowMs)
            } else {
              handleSingleFaceMode(faces, frame, nowMs)
            }
          } catch (cause) {
            avisarFalhaNoQuadro('processamento', cause)
          }
        })
        .catch((cause) => {
          // Falha pontual do motor não deve travar o ciclo — só pula o quadro.
          avisarFalhaNoQuadro('detect', cause)
        })
        .finally(() => {
          // Se o cão de guarda já abandonou este quadro, outro pode estar em
          // voo — liberar aqui atropelaria a exclusividade do quadro atual.
          if (geracao === processingGenerationRef.current) processingRef.current = false
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
    watchdogMs,
    thresholds,
    sampleFaceImageData,
    scheduleFrame,
    cancelFrame,
    now,
  ])

  return { status, visibleFaces, candidateBox }
}
