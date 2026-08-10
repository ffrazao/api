import { describe, expect, it } from 'vitest'
import {
  computeLuminance,
  computeSharpness,
  estimateFraming,
  estimatePose,
  estimateStability,
  evaluateQuality,
  findClosestBoxIndex,
  isPoseFrontal,
  scoreFaceCandidate,
  selectBestFaceIndex,
  type BoundingBox,
  type ImageDataLike,
  type Point2D,
} from './faceMetrics'

const FRAME = { width: 640, height: 480 }

/** 68 landmarks sintéticos de um rosto frontal, ereto e centralizado. */
function frontalLandmarks(): Point2D[] {
  const points: Point2D[] = new Array(68)
  // Preenche tudo com um valor neutro central para não deixar índices não usados como (0,0).
  for (let i = 0; i < 68; i++) points[i] = { x: 320, y: 240 }

  const eyeACenterX = 280
  const eyeBCenterX = 360
  const eyeY = 210
  for (const i of [36, 37, 38, 39, 40, 41]) points[i] = { x: eyeACenterX, y: eyeY }
  for (const i of [42, 43, 44, 45, 46, 47]) points[i] = { x: eyeBCenterX, y: eyeY }

  points[27] = { x: 320, y: 215 } // topo da ponte do nariz
  points[30] = { x: 320, y: 260 } // ponta do nariz
  points[8] = { x: 320, y: 330 } // queixo

  return points
}

/** Mesmos landmarks, mas com a cabeça claramente virada para o lado (yaw). */
function turnedLandmarks(): Point2D[] {
  const points = frontalLandmarks()
  points[30] = { x: 350, y: 260 } // nariz deslocado para perto de um dos olhos
  return points
}

function boxCenteredIn(frame: { width: number; height: number }, coverageRatio: number): BoundingBox {
  const area = frame.width * frame.height * coverageRatio
  const side = Math.sqrt(area)
  return { x: (frame.width - side) / 2, y: (frame.height - side) / 2, width: side, height: side }
}

function solidColorImage(width: number, height: number, [r, g, b]: [number, number, number]): ImageDataLike {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return { data, width, height }
}

function checkerboardImage(width: number, height: number): ImageDataLike {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const on = (x + y) % 2 === 0
      const value = on ? 255 : 0
      data[i * 4] = value
      data[i * 4 + 1] = value
      data[i * 4 + 2] = value
      data[i * 4 + 3] = 255
    }
  }
  return { data, width, height }
}

describe('estimatePose / isPoseFrontal (§08.10)', () => {
  it('reconhece uma pose frontal a partir de landmarks simétricos', () => {
    const pose = estimatePose(frontalLandmarks())
    expect(isPoseFrontal(pose)).toBe(true)
  })

  it('reprova uma pose com yaw acentuado (nariz deslocado para um dos olhos)', () => {
    const pose = estimatePose(turnedLandmarks())
    expect(isPoseFrontal(pose)).toBe(false)
  })
})

describe('estimateFraming (§02.1 item 3)', () => {
  it('aprova um rosto centralizado com cobertura dentro da faixa aceitável', () => {
    const box = boxCenteredIn(FRAME, 0.2)
    const framing = estimateFraming(box, FRAME)
    expect(framing.withinBounds).toBe(true)
    expect(framing.centered).toBe(true)
    expect(framing.distanceOk).toBe(true)
  })

  it('reprova o enquadramento quando o rosto está encostado na borda do quadro', () => {
    const box: BoundingBox = { x: -10, y: 50, width: 150, height: 150 }
    const framing = estimateFraming(box, FRAME)
    expect(framing.withinBounds).toBe(false)
  })

  it('reprova a distância quando o rosto ocupa quase todo o quadro (perto demais)', () => {
    const box = boxCenteredIn(FRAME, 0.9)
    const framing = estimateFraming(box, FRAME)
    expect(framing.distanceOk).toBe(false)
  })

  it('reprova o posicionamento quando o rosto está fora do centro', () => {
    const box: BoundingBox = { x: 500, y: 200, width: 100, height: 100 }
    const framing = estimateFraming(box, FRAME)
    expect(framing.centered).toBe(false)
  })
})

describe('computeLuminance / computeSharpness (§08.10 — Canvas 2D/ImageData)', () => {
  it('mede luminância baixa em um recorte escuro e alta em um recorte claro', () => {
    const dark = solidColorImage(20, 20, [10, 10, 10])
    const bright = solidColorImage(20, 20, [230, 230, 230])
    expect(computeLuminance(dark)).toBeLessThan(60)
    expect(computeLuminance(bright)).toBeGreaterThan(200)
  })

  it('mede nitidez ~0 em uma imagem lisa e alta em uma imagem com bastante contraste', () => {
    const flat = solidColorImage(20, 20, [128, 128, 128])
    const sharp = checkerboardImage(20, 20)
    expect(computeSharpness(flat)).toBe(0)
    expect(computeSharpness(sharp)).toBeGreaterThan(computeSharpness(flat))
  })
})

describe('estimateStability (§10.13)', () => {
  const box: BoundingBox = { x: 250, y: 150, width: 140, height: 140 }

  it('não penaliza o primeiro frame do ciclo (sem frame anterior para comparar)', () => {
    expect(estimateStability(box, null, FRAME)).toBe(true)
  })

  it('tolera um pequeno movimento natural entre frames', () => {
    const previous: BoundingBox = { x: 252, y: 151, width: 141, height: 139 }
    expect(estimateStability(box, previous, FRAME)).toBe(true)
  })

  it('reprova um salto grande de posição entre frames consecutivos', () => {
    const previous: BoundingBox = { x: 60, y: 40, width: 140, height: 140 }
    expect(estimateStability(box, previous, FRAME)).toBe(false)
  })
})

describe('evaluateQuality — combinação dos 7 critérios (§06.1, §08.10)', () => {
  it('aprova quando todos os critérios são atendidos', () => {
    const quality = evaluateQuality({
      box: boxCenteredIn(FRAME, 0.2),
      landmarks: frontalLandmarks(),
      frame: FRAME,
      faceImage: checkerboardImage(20, 20),
      previousBox: null,
    })
    expect(quality.aprovada).toBe(true)
    expect(quality.criteria).toEqual({
      enquadramento: true,
      posicionamento: true,
      distancia: true,
      pose: true,
      nitidez: true,
      iluminacao: true,
      estabilidade: true,
    })
  })

  it('reprova (mas só no critério de pose) quando a cabeça está virada', () => {
    const quality = evaluateQuality({
      box: boxCenteredIn(FRAME, 0.2),
      landmarks: turnedLandmarks(),
      frame: FRAME,
      faceImage: checkerboardImage(20, 20),
      previousBox: null,
    })
    expect(quality.aprovada).toBe(false)
    expect(quality.criteria.pose).toBe(false)
    expect(quality.criteria.enquadramento).toBe(true)
  })

  it('reprova quando o recorte da face está escuro e borrado (nitidez e iluminação)', () => {
    const quality = evaluateQuality({
      box: boxCenteredIn(FRAME, 0.2),
      landmarks: frontalLandmarks(),
      frame: FRAME,
      faceImage: solidColorImage(20, 20, [5, 5, 5]),
      previousBox: null,
    })
    expect(quality.aprovada).toBe(false)
    expect(quality.criteria.nitidez).toBe(false)
    expect(quality.criteria.iluminacao).toBe(false)
  })
})

function offsetBox(box: BoundingBox, dx: number, dy: number): BoundingBox {
  return { ...box, x: box.x + dx, y: box.y + dy }
}

function offCenterBox(frame: { width: number; height: number }, coverageRatio: number): BoundingBox {
  const area = frame.width * frame.height * coverageRatio
  const side = Math.sqrt(area)
  return { x: frame.width - side - 5, y: 5, width: side, height: side }
}

describe('scoreFaceCandidate / selectBestFaceIndex (§09.2, §09.3, §09.9)', () => {
  it('pontua melhor uma face bem enquadrada, frontal, nítida e bem iluminada do que uma face de baixa qualidade', () => {
    const good = scoreFaceCandidate({
      box: boxCenteredIn(FRAME, 0.2),
      landmarks: frontalLandmarks(),
      frame: FRAME,
      faceImage: checkerboardImage(20, 20),
    })
    const bad = scoreFaceCandidate({
      box: offCenterBox(FRAME, 0.2),
      landmarks: turnedLandmarks(),
      frame: FRAME,
      faceImage: solidColorImage(20, 20, [5, 5, 5]),
    })
    expect(good).toBeGreaterThan(bad)
  })

  it('nunca usa o tamanho/cobertura da caixa como fator — duas caixas de tamanhos bem diferentes, mesma qualidade, pontuam igual', () => {
    const small = scoreFaceCandidate({
      box: boxCenteredIn(FRAME, 0.08),
      landmarks: frontalLandmarks(),
      frame: FRAME,
      faceImage: checkerboardImage(20, 20),
    })
    const large = scoreFaceCandidate({
      box: boxCenteredIn(FRAME, 0.45),
      landmarks: frontalLandmarks(),
      frame: FRAME,
      faceImage: checkerboardImage(20, 20),
    })
    expect(small).toBeCloseTo(large, 5)
  })

  it('selectBestFaceIndex escolhe a candidata de melhor pontuação, não a maior/mais perto', () => {
    const candidates = [
      {
        // maior caixa (mais perto da câmera), mas virada e mal iluminada.
        box: boxCenteredIn(FRAME, 0.5),
        landmarks: turnedLandmarks(),
        frame: FRAME,
        faceImage: solidColorImage(20, 20, [5, 5, 5]),
      },
      {
        // caixa menor (mais longe), mas frontal, nítida e bem iluminada.
        box: boxCenteredIn(FRAME, 0.15),
        landmarks: frontalLandmarks(),
        frame: FRAME,
        faceImage: checkerboardImage(20, 20),
      },
    ]
    expect(selectBestFaceIndex(candidates)).toBe(1)
  })
})

describe('findClosestBoxIndex — continuidade espacial do Face Lock (§08.3, §08.5, §09.5)', () => {
  const locked = boxCenteredIn(FRAME, 0.2)

  it('encontra a caixa que corresponde a um pequeno deslocamento da candidata travada', () => {
    const boxes = [offsetBox(locked, 6, 4), offCenterBox(FRAME, 0.2)]
    expect(findClosestBoxIndex(boxes, locked, FRAME)).toBe(0)
  })

  it('ignora outra face de melhor qualidade se ela não é espacialmente a mesma candidata', () => {
    const invasora = offCenterBox(FRAME, 0.2)
    const boxes = [invasora, offsetBox(locked, 3, 2)]
    expect(findClosestBoxIndex(boxes, locked, FRAME)).toBe(1)
  })

  it('retorna -1 quando nenhuma caixa está perto o suficiente (candidata travada não está mais na cena)', () => {
    const boxes = [offCenterBox(FRAME, 0.2)]
    expect(findClosestBoxIndex(boxes, locked, FRAME)).toBe(-1)
  })
})
