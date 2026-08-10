/**
 * Recorte, normalização e produção do Blob final — F9 (§12, §17, §18.6-§18.17).
 *
 * Módulo que isola a matemática de recorte/escala (pura, testável sem DOM) da
 * orquestração real em Canvas 2D (precisa do DOM, injetável para testes via
 * `createCanvas`) — mesmo padrão de separação usado em faceMetrics.ts/useFaceDetection.ts.
 */
import type { BoundingBox, FrameSize } from './faceMetrics'

// --- Recorte com margem de contexto (§12.2, §17.5, §17.6) ------------------

export interface CropMarginRatios {
  /** Espaço acima da caixa da face, como fração da altura da face — cabelo/topo da cabeça. */
  top: number
  /** Espaço abaixo, como fração da altura da face — pescoço/início dos ombros. */
  bottom: number
  left: number
  right: number
}

export const DEFAULT_CROP_MARGIN_RATIOS: CropMarginRatios = {
  top: 0.35,
  bottom: 0.35,
  left: 0.3,
  right: 0.3,
}

/**
 * §12.2/§17.5: retângulo de recorte com margem de contexto proporcional à
 * face — nunca um recorte justo ao contorno, preserva cabelo/pescoço/um
 * pequeno espaço acima da cabeça.
 */
export function computeCropRect(
  faceBox: BoundingBox,
  margins: CropMarginRatios = DEFAULT_CROP_MARGIN_RATIOS,
): BoundingBox {
  const marginTop = faceBox.height * margins.top
  const marginBottom = faceBox.height * margins.bottom
  const marginLeft = faceBox.width * margins.left
  const marginRight = faceBox.width * margins.right
  return {
    x: faceBox.x - marginLeft,
    y: faceBox.y - marginTop,
    width: faceBox.width + marginLeft + marginRight,
    height: faceBox.height + marginTop + marginBottom,
  }
}

/**
 * §17.6: o recorte com margem de contexto precisa caber inteiro no quadro —
 * sem isso, não há como enquadrar sem cortes mutilados, e a captura (ou o
 * próprio avanço a PRONTO — ver faceMetrics.ts/estimateFraming) não deve
 * prosseguir.
 */
export function canFitCropRect(cropRect: BoundingBox, frame: FrameSize): boolean {
  return (
    cropRect.x >= 0 &&
    cropRect.y >= 0 &&
    cropRect.x + cropRect.width <= frame.width &&
    cropRect.y + cropRect.height <= frame.height
  )
}

// --- Redimensionamento padronizado (§12.4, §17.7) ---------------------------

export const MIN_OUTPUT_LONG_SIDE = 640
export const MAX_OUTPUT_LONG_SIDE = 800
export const DEFAULT_OUTPUT_LONG_SIDE = 720

/** §12.4/§17.7: redimensiona mantendo a proporção, com o lado maior fixado no alvo (640–800px). */
export function computeOutputSize(
  size: { width: number; height: number },
  targetLongSide: number = DEFAULT_OUTPUT_LONG_SIDE,
): { width: number; height: number } {
  const longSide = Math.max(size.width, size.height)
  if (longSide <= 0) return { width: 0, height: 0 }
  const clampedTarget = clamp(targetLongSide, MIN_OUTPUT_LONG_SIDE, MAX_OUTPUT_LONG_SIDE)
  const scale = clampedTarget / longSide
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// --- Formato e compressão (§12.5, §17.2, §17.8) -----------------------------

export const JPEG_MIME_TYPE = 'image/jpeg'
export const MIN_JPEG_QUALITY = 0.85
export const MAX_JPEG_QUALITY = 0.92
export const DEFAULT_JPEG_QUALITY = 0.9

// --- Orquestração real em Canvas 2D (precisa do DOM) ------------------------

export class ImageProcessingError extends Error {}

/** Só o suficiente de `HTMLCanvasElement`/`CanvasRenderingContext2D` para permitir injeção em testes. */
export interface CanvasLike {
  width: number
  height: number
  getContext(contextId: '2d'): CanvasContextLike | null
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void
}

export interface CanvasContextLike {
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sWidth: number,
    sHeight: number,
    dx: number,
    dy: number,
    dWidth: number,
    dHeight: number,
  ): void
}

export interface CapturePhotoOptions {
  cropMargins?: CropMarginRatios
  targetLongSide?: number
  jpegQuality?: number
  /** Injeção para testes; por padrão cria um `<canvas>` real via `document.createElement`. */
  createCanvas?: () => CanvasLike
}

/**
 * §12.1: desenha sempre a partir do `<video>` ao vivo, na resolução nativa do
 * instante do disparo — nunca reaproveita o recorte de baixa resolução usado
 * pela avaliação contínua de qualidade (ver `sampleFaceImageData` em
 * useFaceDetection.ts), que é só para análise, não para a fotografia final.
 *
 * §17.9/§17.10: nunca espelha. O espelhamento do preview em autorretrato é
 * puramente CSS na tag `<video>` (ver FotografoDeFaces.styles.ts) —
 * `drawImage()` sempre lê o frame bruto decodificado, não a apresentação
 * visual transformada, então não há nada a desfazer aqui.
 */
export async function capturePhotoBlob(
  video: HTMLVideoElement,
  faceBox: BoundingBox,
  options: CapturePhotoOptions = {},
): Promise<Blob> {
  const frame: FrameSize = { width: video.videoWidth, height: video.videoHeight }
  const cropMargins = options.cropMargins ?? DEFAULT_CROP_MARGIN_RATIOS
  const cropRect = computeCropRect(faceBox, cropMargins)

  if (!canFitCropRect(cropRect, frame)) {
    throw new ImageProcessingError(
      'A candidata está perto demais da borda do quadro para um recorte com margem — não é possível enquadrar sem cortes mutilados (§17.6).',
    )
  }

  const outputSize = computeOutputSize(cropRect, options.targetLongSide ?? DEFAULT_OUTPUT_LONG_SIDE)
  const jpegQuality = clamp(options.jpegQuality ?? DEFAULT_JPEG_QUALITY, MIN_JPEG_QUALITY, MAX_JPEG_QUALITY)

  const createCanvas = options.createCanvas ?? (() => document.createElement('canvas') as unknown as CanvasLike)
  const canvas = createCanvas()
  canvas.width = outputSize.width
  canvas.height = outputSize.height

  let ctx: CanvasContextLike | null
  try {
    ctx = canvas.getContext('2d')
  } catch (cause) {
    throw toImageProcessingError(cause, 'Falha de hardware ao obter o contexto 2D do canvas.')
  }
  if (!ctx) {
    throw new ImageProcessingError('Não foi possível obter o contexto 2D do canvas.')
  }

  try {
    ctx.drawImage(
      video,
      cropRect.x,
      cropRect.y,
      cropRect.width,
      cropRect.height,
      0,
      0,
      outputSize.width,
      outputSize.height,
    )
  } catch (cause) {
    throw toImageProcessingError(cause, 'Falha de hardware ao processar o frame no canvas.')
  }

  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new ImageProcessingError('O canvas não conseguiu gerar o Blob da fotografia.'))
          }
        },
        JPEG_MIME_TYPE,
        jpegQuality,
      )
    } catch (cause) {
      reject(toImageProcessingError(cause, 'Falha inesperada ao gerar o Blob da fotografia.'))
    }
  })
}

function toImageProcessingError(cause: unknown, fallbackMessage: string): ImageProcessingError {
  if (cause instanceof Error) return new ImageProcessingError(cause.message)
  return new ImageProcessingError(fallbackMessage)
}
