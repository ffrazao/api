/**
 * Métricas geométricas e de imagem para avaliação de qualidade — F3
 * (§02.1 item 2/3, §08.10, §10.13).
 *
 * Módulo puro (sem face-api.js, sem canvas, sem React): recebe landmarks e
 * pixels já extraídos e devolve os 7 critérios de `QualityCriteria` (F1).
 * Isso é o que torna o motor testável com dados simulados — quem sabe
 * desenhar em canvas/rodar o face-api.js é useFaceDetection.ts.
 *
 * Os thresholds abaixo são decisões de engenharia provisórias (a spec cita
 * as regras mas não os números exatos) — pensados para serem fáceis de
 * recalibrar depois de testes com câmeras/rostos reais.
 */
import { DEFAULT_CROP_MARGIN_RATIOS, canFitCropRect, computeCropRect } from './imageProcessor'
import type { CropMarginRatios } from './imageProcessor'
import type { Quality, QualityCriteria } from './types'

export interface Point2D {
  x: number
  y: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FrameSize {
  width: number
  height: number
}

/** Formato mínimo de um `ImageData` — não depende do DOM, então é fácil de simular em teste. */
export interface ImageDataLike {
  data: ArrayLike<number>
  width: number
  height: number
}

// Índices do modelo de 68 pontos (ordem padrão usada pelo face-api.js).
const BROW_BRIDGE = 27
const NOSE_TIP = 30
const CHIN = 8
const EYE_A_INDICES = [36, 37, 38, 39, 40, 41]
const EYE_B_INDICES = [42, 43, 44, 45, 46, 47]

function average(points: Point2D[]): Point2D {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// --- Pose (§08.10) ---------------------------------------------------------

export interface PoseEstimate {
  rollDeg: number
  /** Assimetria horizontal nariz↔olhos, aproximadamente -1..1; 0 = frontal. */
  yawRatio: number
  /** Desvio da posição vertical esperada do nariz entre sobrancelha e queixo. */
  pitchRatio: number
}

export interface PoseThresholds {
  maxRollDeg: number
  maxYawRatio: number
  maxPitchDeviation: number
}

export const DEFAULT_POSE_THRESHOLDS: PoseThresholds = {
  maxRollDeg: 12,
  maxYawRatio: 0.18,
  maxPitchDeviation: 0.12,
}

/**
 * Deriva uma pose aproximada a partir da simetria dos 68 landmarks — não é
 * uma pose 3D calibrada (exigiria intrínsecos de câmera e um modelo 3D de
 * referência, fora do escopo desta fase), mas o suficiente para detectar
 * cabeça virada/inclinada/balançada de forma consistente frame a frame.
 */
export function estimatePose(landmarks: Point2D[]): PoseEstimate {
  const eyeACenter = average(EYE_A_INDICES.map((i) => landmarks[i]))
  const eyeBCenter = average(EYE_B_INDICES.map((i) => landmarks[i]))
  const noseTip = landmarks[NOSE_TIP]
  const chin = landmarks[CHIN]
  const browBridge = landmarks[BROW_BRIDGE]

  const rollDeg = (Math.atan2(eyeBCenter.y - eyeACenter.y, eyeBCenter.x - eyeACenter.x) * 180) / Math.PI

  const distToA = distance(noseTip, eyeACenter)
  const distToB = distance(noseTip, eyeBCenter)
  const yawRatio = (distToA - distToB) / (distToA + distToB || 1)

  const upperSpan = distance(noseTip, browBridge)
  const lowerSpan = distance(noseTip, chin)
  const verticalRatio = upperSpan / (upperSpan + lowerSpan || 1)
  // Para um rosto frontal e ereto, o nariz fica perto de ~42% do caminho
  // entre a sobrancelha e o queixo — valor empírico usado como referência.
  const pitchRatio = verticalRatio - 0.42

  return { rollDeg, yawRatio, pitchRatio }
}

export function isPoseFrontal(pose: PoseEstimate, thresholds: PoseThresholds = DEFAULT_POSE_THRESHOLDS): boolean {
  return (
    Math.abs(pose.rollDeg) <= thresholds.maxRollDeg &&
    Math.abs(pose.yawRatio) <= thresholds.maxYawRatio &&
    Math.abs(pose.pitchRatio) <= thresholds.maxPitchDeviation
  )
}

// --- Enquadramento, posicionamento e distância (§02.1 item 3) -------------

export interface FramingThresholds {
  /**
   * §17.6 (F9): margens do recorte final com contexto (cabelo/pescoço/espaço
   * acima da cabeça) — "enquadramento" só aprova se esse recorte inteiro
   * couber no quadro, senão não há como fotografar sem cortes mutilados.
   */
  cropMargins: CropMarginRatios
  /** Deslocamento máximo do centro do rosto em relação ao centro do quadro. */
  maxCenterOffsetRatio: number
  /** Cobertura mínima da área do quadro pelo rosto (rosto longe demais abaixo disso). */
  minCoverageRatio: number
  /** Cobertura máxima da área do quadro pelo rosto (rosto perto demais acima disso). */
  maxCoverageRatio: number
}

export const DEFAULT_FRAMING_THRESHOLDS: FramingThresholds = {
  cropMargins: DEFAULT_CROP_MARGIN_RATIOS,
  maxCenterOffsetRatio: 0.18,
  minCoverageRatio: 0.06,
  maxCoverageRatio: 0.55,
}

export interface FramingEstimate {
  /** O recorte final (rosto + margem de contexto) cabe inteiro no quadro (§02.1 item 3, §17.6). */
  withinBounds: boolean
  /** Rosto centralizado na área de preview (posicionamento). */
  centered: boolean
  /** Distância aproximada dentro da faixa aceitável (nem longe, nem perto demais). */
  distanceOk: boolean
  coverageRatio: number
}

export function estimateFraming(
  box: BoundingBox,
  frame: FrameSize,
  thresholds: FramingThresholds = DEFAULT_FRAMING_THRESHOLDS,
): FramingEstimate {
  // §17.6: "enquadramento" verifica se o recorte final COM margem de contexto
  // caberia no quadro — não só a caixa crua do rosto — para nunca chegar a
  // PRONTO com uma candidata perto demais da borda para fotografar direito.
  const cropRect = computeCropRect(box, thresholds.cropMargins)
  const withinBounds = canFitCropRect(cropRect, frame)

  const boxCenterX = box.x + box.width / 2
  const boxCenterY = box.y + box.height / 2
  const offsetX = Math.abs(boxCenterX - frame.width / 2) / frame.width
  const offsetY = Math.abs(boxCenterY - frame.height / 2) / frame.height
  const centered = offsetX <= thresholds.maxCenterOffsetRatio && offsetY <= thresholds.maxCenterOffsetRatio

  const coverageRatio = (box.width * box.height) / (frame.width * frame.height || 1)
  const distanceOk = coverageRatio >= thresholds.minCoverageRatio && coverageRatio <= thresholds.maxCoverageRatio

  return { withinBounds, centered, distanceOk, coverageRatio }
}

// --- Nitidez e iluminação via Canvas 2D/ImageData (§08.10) ----------------

export interface ImageQualityThresholds {
  /** Variância mínima do Laplaciano para considerar o recorte nítido. */
  minSharpness: number
  minLuminance: number
  maxLuminance: number
}

export const DEFAULT_IMAGE_QUALITY_THRESHOLDS: ImageQualityThresholds = {
  minSharpness: 35,
  minLuminance: 55,
  maxLuminance: 200,
}

function toGrayscale(image: ImageDataLike): Float64Array {
  const { data, width, height } = image
  const gray = new Float64Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4
    gray[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2]
  }
  return gray
}

/** Luminância média (0–255) do recorte — quadros escuros/estourados reprovam (§08.10). */
export function computeLuminance(image: ImageDataLike): number {
  const gray = toGrayscale(image)
  if (gray.length === 0) return 0
  let sum = 0
  for (let i = 0; i < gray.length; i++) sum += gray[i]
  return sum / gray.length
}

/**
 * Nitidez básica via variância do Laplaciano (gradiente de luminância) — uma
 * métrica clássica e barata de "blur", adequada para uma checagem em CPU a
 * cada frame sem depender de bibliotecas de visão computacional pesadas.
 */
export function computeSharpness(image: ImageDataLike): number {
  const { width, height } = image
  if (width < 3 || height < 3) return 0
  const gray = toGrayscale(image)

  let sum = 0
  let sumSq = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const laplacian = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - width] + gray[idx + width]
      sum += laplacian
      sumSq += laplacian * laplacian
      count++
    }
  }
  if (count === 0) return 0
  const mean = sum / count
  return sumSq / count - mean * mean
}

// --- Estabilidade entre frames (§10.13) ------------------------------------

export interface StabilityThresholds {
  /** Deslocamento máximo do centro do rosto entre frames, como fração da largura do quadro. */
  maxCenterShiftRatio: number
  /** Variação máxima de área da caixa entre frames, como fração da área anterior. */
  maxSizeChangeRatio: number
}

export const DEFAULT_STABILITY_THRESHOLDS: StabilityThresholds = {
  maxCenterShiftRatio: 0.08,
  maxSizeChangeRatio: 0.3,
}

/**
 * §10.13: pequenos movimentos naturais não devem reprovar o frame — só
 * variações que violem a biometria básica (salto grande de posição/tamanho
 * entre frames consecutivos, típico de detecção instável ou movimento brusco).
 */
export function estimateStability(
  currentBox: BoundingBox,
  previousBox: BoundingBox | null,
  frame: FrameSize,
  thresholds: StabilityThresholds = DEFAULT_STABILITY_THRESHOLDS,
): boolean {
  if (!previousBox) return true // nada para comparar ainda — não penaliza o primeiro frame do ciclo.

  const currentCenter = { x: currentBox.x + currentBox.width / 2, y: currentBox.y + currentBox.height / 2 }
  const previousCenter = { x: previousBox.x + previousBox.width / 2, y: previousBox.y + previousBox.height / 2 }
  const centerShiftRatio = distance(currentCenter, previousCenter) / (frame.width || 1)

  const previousArea = previousBox.width * previousBox.height
  const currentArea = currentBox.width * currentBox.height
  const sizeChangeRatio = Math.abs(currentArea - previousArea) / (previousArea || 1)

  return centerShiftRatio <= thresholds.maxCenterShiftRatio && sizeChangeRatio <= thresholds.maxSizeChangeRatio
}

// --- Avaliação combinada ----------------------------------------------------

export interface QualityThresholds {
  pose: PoseThresholds
  framing: FramingThresholds
  image: ImageQualityThresholds
  stability: StabilityThresholds
}

export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  pose: DEFAULT_POSE_THRESHOLDS,
  framing: DEFAULT_FRAMING_THRESHOLDS,
  image: DEFAULT_IMAGE_QUALITY_THRESHOLDS,
  stability: DEFAULT_STABILITY_THRESHOLDS,
}

export interface QualityEvaluationInput {
  box: BoundingBox
  landmarks: Point2D[]
  frame: FrameSize
  /** Recorte da face já extraído (ver useFaceDetection.ts) para nitidez/iluminação. */
  faceImage: ImageDataLike
  /** Caixa do frame anterior da mesma candidata, para o critério de estabilidade. */
  previousBox: BoundingBox | null
}

/**
 * Combina todas as métricas nos 7 critérios de `QualityCriteria` (§06.1) — o
 * formato que o reducer da F1 já sabe consumir via `QUALITY_CHANGED`.
 * `aprovada` exige todos os critérios (§08.10 — "critérios mínimos obrigatórios").
 */
export function evaluateQuality(
  input: QualityEvaluationInput,
  thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS,
): Quality {
  const pose = estimatePose(input.landmarks)
  const framing = estimateFraming(input.box, input.frame, thresholds.framing)
  const luminance = computeLuminance(input.faceImage)
  const sharpness = computeSharpness(input.faceImage)
  const stable = estimateStability(input.box, input.previousBox, input.frame, thresholds.stability)

  const criteria: QualityCriteria = {
    enquadramento: framing.withinBounds,
    posicionamento: framing.centered,
    distancia: framing.distanceOk,
    pose: isPoseFrontal(pose, thresholds.pose),
    nitidez: sharpness >= thresholds.image.minSharpness,
    iluminacao: luminance >= thresholds.image.minLuminance && luminance <= thresholds.image.maxLuminance,
    estabilidade: stable,
  }

  const aprovada = Object.values(criteria).every(Boolean)

  return { criteria, aprovada }
}

// --- Seleção de face no quiosque e continuidade do Face Lock (§08, §09) ----

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export interface FaceScoreInput {
  box: BoundingBox
  landmarks: Point2D[]
  frame: FrameSize
  faceImage: ImageDataLike
}

/**
 * Pontuação contínua (0–1) de qualidade geométrica/biométrica de uma face —
 * enquadramento/centralização, frontalidade, nitidez e iluminação (§09.2).
 * Deliberadamente NUNCA usa o tamanho da caixa/cobertura (distância) como
 * fator: é exatamente o que §09.2/§09.9 proíbem como critério de seleção
 * ("nunca se basear puramente no tamanho da caixa... ou na proximidade da
 * câmera"). Serve só para RANKEAR candidatas no quiosque — a aprovação
 * final de qualidade de quem já está travada continua sendo `evaluateQuality`.
 */
export function scoreFaceCandidate(input: FaceScoreInput, thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS): number {
  const { box, landmarks, frame, faceImage } = input

  const boxCenterX = box.x + box.width / 2
  const boxCenterY = box.y + box.height / 2
  const offsetX = Math.abs(boxCenterX - frame.width / 2) / (frame.width || 1)
  const offsetY = Math.abs(boxCenterY - frame.height / 2) / (frame.height || 1)
  const framingScore = clamp01(1 - (offsetX + offsetY) / (2 * thresholds.framing.maxCenterOffsetRatio))

  const pose = estimatePose(landmarks)
  const poseDeviation =
    Math.abs(pose.rollDeg) / thresholds.pose.maxRollDeg +
    Math.abs(pose.yawRatio) / thresholds.pose.maxYawRatio +
    Math.abs(pose.pitchRatio) / thresholds.pose.maxPitchDeviation
  const frontalScore = clamp01(1 - poseDeviation / 3)

  const sharpnessScore = clamp01(computeSharpness(faceImage) / (thresholds.image.minSharpness * 2))

  const luminance = computeLuminance(faceImage)
  const idealLuminance = (thresholds.image.minLuminance + thresholds.image.maxLuminance) / 2
  const luminanceRange = (thresholds.image.maxLuminance - thresholds.image.minLuminance) / 2
  const luminanceScore = clamp01(1 - Math.abs(luminance - idealLuminance) / (luminanceRange || 1))

  return (framingScore + frontalScore + sharpnessScore + luminanceScore) / 4
}

/** Índice, dentre várias candidatas visíveis, da que tem a melhor pontuação (§09.3). */
export function selectBestFaceIndex(
  candidates: FaceScoreInput[],
  thresholds: QualityThresholds = DEFAULT_QUALITY_THRESHOLDS,
): number {
  let bestIndex = 0
  let bestScore = -Infinity
  candidates.forEach((candidate, index) => {
    const score = scoreFaceCandidate(candidate, thresholds)
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })
  return bestIndex
}

/**
 * Índice, dentre várias caixas do quadro atual, da que mais provavelmente é a
 * MESMA face travada no quadro anterior — pura proximidade espacial, nunca
 * qualidade (§08.3/§08.5/§09.5: o Face Lock nunca reavalia quem está melhor,
 * só tenta continuar rastreando quem já foi escolhido). Retorna -1 se nenhuma
 * caixa estiver perto o suficiente para ser considerada continuidade.
 */
export function findClosestBoxIndex(
  boxes: BoundingBox[],
  target: BoundingBox,
  frame: FrameSize,
  maxCenterShiftRatio = 0.25,
): number {
  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 }
  let bestIndex = -1
  let bestRatio = Infinity

  boxes.forEach((box, index) => {
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    const ratio = distance(center, targetCenter) / (frame.width || 1)
    if (ratio < bestRatio) {
      bestRatio = ratio
      bestIndex = index
    }
  })

  return bestRatio <= maxCenterShiftRatio ? bestIndex : -1
}
