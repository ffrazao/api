import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_JPEG_QUALITY,
  DEFAULT_OUTPUT_LONG_SIDE,
  ImageProcessingError,
  JPEG_MIME_TYPE,
  MAX_JPEG_QUALITY,
  MAX_OUTPUT_LONG_SIDE,
  MIN_JPEG_QUALITY,
  MIN_OUTPUT_LONG_SIDE,
  canFitCropRect,
  capturePhotoBlob,
  computeCropRect,
  computeOutputSize,
} from './imageProcessor'
import type { CanvasContextLike, CanvasLike } from './imageProcessor'
import type { BoundingBox } from './faceMetrics'

const FRAME = { width: 1280, height: 960 }

function fakeVideo(): HTMLVideoElement {
  return { videoWidth: FRAME.width, videoHeight: FRAME.height } as unknown as HTMLVideoElement
}

function centeredFace(coverageRatio = 0.1): BoundingBox {
  const area = FRAME.width * FRAME.height * coverageRatio
  const side = Math.sqrt(area)
  return { x: (FRAME.width - side) / 2, y: (FRAME.height - side) / 2, width: side, height: side }
}

describe('computeCropRect (§12.2, §17.5)', () => {
  it('expande a caixa da face proporcionalmente, nunca um recorte justo ao contorno', () => {
    const face: BoundingBox = { x: 100, y: 100, width: 200, height: 200 }
    const crop = computeCropRect(face, { top: 0.5, bottom: 0.4, left: 0.3, right: 0.3 })

    expect(crop.x).toBeCloseTo(100 - 200 * 0.3)
    expect(crop.y).toBeCloseTo(100 - 200 * 0.5)
    expect(crop.width).toBeCloseTo(200 + 200 * 0.3 + 200 * 0.3)
    expect(crop.height).toBeCloseTo(200 + 200 * 0.5 + 200 * 0.4)
  })

  it('a margem de topo (cabelo/espaço acima da cabeça) é aplicada mesmo sem simetria vertical', () => {
    const face: BoundingBox = { x: 0, y: 0, width: 100, height: 100 }
    const crop = computeCropRect(face, { top: 0.6, bottom: 0.2, left: 0.1, right: 0.1 })
    // Recorte mais alto ACIMA do rosto do que abaixo — mais espaço para cabelo/topo da cabeça.
    const spaceAbove = face.y - crop.y
    const spaceBelow = crop.y + crop.height - (face.y + face.height)
    expect(spaceAbove).toBeGreaterThan(spaceBelow)
  })
})

describe('canFitCropRect (§17.6)', () => {
  it('aprova quando o recorte cabe inteiro no quadro', () => {
    const face = centeredFace(0.1)
    const crop = computeCropRect(face)
    expect(canFitCropRect(crop, FRAME)).toBe(true)
  })

  it('reprova quando a face está perto demais da borda para caber com margem', () => {
    const face: BoundingBox = { x: 5, y: 5, width: 150, height: 150 }
    const crop = computeCropRect(face)
    expect(canFitCropRect(crop, FRAME)).toBe(false)
  })
})

describe('computeOutputSize (§12.4, §17.7)', () => {
  it('redimensiona mantendo a proporção, com o lado maior no alvo padrão', () => {
    const output = computeOutputSize({ width: 400, height: 200 }, DEFAULT_OUTPUT_LONG_SIDE)
    expect(Math.max(output.width, output.height)).toBe(DEFAULT_OUTPUT_LONG_SIDE)
    expect(output.width / output.height).toBeCloseTo(400 / 200, 2)
  })

  it('funciona tanto para recortes mais largos quanto mais altos que largos', () => {
    const wide = computeOutputSize({ width: 300, height: 150 })
    expect(wide.width).toBeGreaterThan(wide.height)

    const tall = computeOutputSize({ width: 150, height: 300 })
    expect(tall.height).toBeGreaterThan(tall.width)
  })

  it('o lado maior do resultado está sempre entre 640 e 800px, mesmo pedindo um alvo fora da faixa', () => {
    const tooSmall = computeOutputSize({ width: 400, height: 300 }, 100)
    expect(Math.max(tooSmall.width, tooSmall.height)).toBe(MIN_OUTPUT_LONG_SIDE)

    const tooBig = computeOutputSize({ width: 400, height: 300 }, 2000)
    expect(Math.max(tooBig.width, tooBig.height)).toBe(MAX_OUTPUT_LONG_SIDE)
  })
})

function createFakeCanvas(overrides: {
  context?: CanvasContextLike | null
  blob?: Blob | null
  drawImageImpl?: CanvasContextLike['drawImage']
} = {}): { canvas: CanvasLike; toBlob: ReturnType<typeof vi.fn>; getContext: ReturnType<typeof vi.fn> } {
  const drawImage = overrides.drawImageImpl ?? vi.fn()
  const context: CanvasContextLike | null =
    overrides.context !== undefined ? overrides.context : { drawImage }
  const getContext = vi.fn(() => context)
  const toBlob = vi.fn((callback: (blob: Blob | null) => void) => {
    const blob = overrides.blob !== undefined ? overrides.blob : new Blob(['fake-jpeg-bytes'], { type: JPEG_MIME_TYPE })
    callback(blob)
  })
  const canvas: CanvasLike = { width: 0, height: 0, getContext, toBlob }
  return { canvas, toBlob, getContext }
}

describe('capturePhotoBlob — caminho de sucesso (§12.1, §12.5, §17.2, §17.8, §17.9)', () => {
  it('produz um Blob JPEG a partir do frame ao vivo, sem espelhar, com qualidade e tamanho corretos', async () => {
    const { canvas, toBlob } = createFakeCanvas()
    const video = fakeVideo()
    const face = centeredFace(0.1)

    const blob = await capturePhotoBlob(video, face, { createCanvas: () => canvas })

    expect(blob.type).toBe(JPEG_MIME_TYPE)

    const [, type, quality] = toBlob.mock.calls[0]
    expect(type).toBe(JPEG_MIME_TYPE)
    expect(quality).toBe(DEFAULT_JPEG_QUALITY)

    expect(Math.max(canvas.width, canvas.height)).toBeGreaterThanOrEqual(MIN_OUTPUT_LONG_SIDE)
    expect(Math.max(canvas.width, canvas.height)).toBeLessThanOrEqual(MAX_OUTPUT_LONG_SIDE)
  })

  it('desenha diretamente do <video> recebido — nunca de uma imagem intermediária (§12.1)', async () => {
    const drawImage = vi.fn()
    const { canvas } = createFakeCanvas({ drawImageImpl: drawImage })
    const video = fakeVideo()
    const face = centeredFace(0.1)

    await capturePhotoBlob(video, face, { createCanvas: () => canvas })

    expect(drawImage).toHaveBeenCalledTimes(1)
    const [source] = drawImage.mock.calls[0]
    expect(source).toBe(video)
  })

  it('recorta a partir do frame bruto (sem inversão horizontal) — a fonte usa largura positiva (§17.9/§17.10)', async () => {
    const drawImage = vi.fn()
    const { canvas } = createFakeCanvas({ drawImageImpl: drawImage })
    const video = fakeVideo()
    const face = centeredFace(0.1)

    await capturePhotoBlob(video, face, { createCanvas: () => canvas })

    const [, sx, sy, sWidth, sHeight] = drawImage.mock.calls[0]
    const expectedCrop = computeCropRect(face)
    expect(sx).toBeCloseTo(expectedCrop.x)
    expect(sy).toBeCloseTo(expectedCrop.y)
    // Espelhar exigiria largura/origem negativas ou um sinal invertido — aqui é sempre positivo.
    expect(sWidth).toBeCloseTo(expectedCrop.width)
    expect(sWidth).toBeGreaterThan(0)
    expect(sHeight).toBeCloseTo(expectedCrop.height)
  })

  it('satura a qualidade JPEG informada para dentro de 0.85–0.92 (§12.5/§17.8)', async () => {
    const { canvas, toBlob } = createFakeCanvas()
    await capturePhotoBlob(fakeVideo(), centeredFace(0.1), { createCanvas: () => canvas, jpegQuality: 0.5 })
    expect(toBlob.mock.calls[0][2]).toBe(MIN_JPEG_QUALITY)

    const { canvas: canvas2, toBlob: toBlob2 } = createFakeCanvas()
    await capturePhotoBlob(fakeVideo(), centeredFace(0.1), { createCanvas: () => canvas2, jpegQuality: 1 })
    expect(toBlob2.mock.calls[0][2]).toBe(MAX_JPEG_QUALITY)
  })
})

describe('capturePhotoBlob — falhas (§17.6, §18.6, §18.7, §18.11)', () => {
  it('rejeita sem tocar no canvas quando a candidata está perto demais da borda para enquadrar (§17.6)', async () => {
    const { canvas, getContext } = createFakeCanvas()
    const video = fakeVideo()
    const faceNaBorda: BoundingBox = { x: 2, y: 2, width: 100, height: 100 }

    await expect(capturePhotoBlob(video, faceNaBorda, { createCanvas: () => canvas })).rejects.toThrow(
      ImageProcessingError,
    )
    expect(getContext).not.toHaveBeenCalled()
  })

  it('rejeita quando o contexto 2D não está disponível (falha de hardware)', async () => {
    const { canvas } = createFakeCanvas({ context: null })
    await expect(capturePhotoBlob(fakeVideo(), centeredFace(0.1), { createCanvas: () => canvas })).rejects.toThrow(
      ImageProcessingError,
    )
  })

  it('rejeita quando drawImage lança (estouro de memória/hardware)', async () => {
    const drawImage = vi.fn(() => {
      throw new Error('out of memory')
    })
    const { canvas } = createFakeCanvas({ drawImageImpl: drawImage })
    await expect(capturePhotoBlob(fakeVideo(), centeredFace(0.1), { createCanvas: () => canvas })).rejects.toThrow(
      ImageProcessingError,
    )
  })

  it('rejeita quando toBlob() produz null (canvas não conseguiu gerar o Blob)', async () => {
    const { canvas } = createFakeCanvas({ blob: null })
    await expect(capturePhotoBlob(fakeVideo(), centeredFace(0.1), { createCanvas: () => canvas })).rejects.toThrow(
      ImageProcessingError,
    )
  })
})
