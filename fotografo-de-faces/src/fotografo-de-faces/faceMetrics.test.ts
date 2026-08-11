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

  /** Constrói uma sequência aplicando deslocamentos/escalas sucessivas a partir de uma caixa base. */
  function sequencia(base: BoundingBox, passos: { dx?: number; dy?: number; escala?: number }[]): BoundingBox[] {
    let atual = base
    return passos.map(({ dx = 0, dy = 0, escala = 1 }) => {
      const width = atual.width * escala
      const height = atual.height * escala
      atual = {
        x: atual.x + dx + (atual.width - width) / 2,
        y: atual.y + dy + (atual.height - height) / 2,
        width,
        height,
      }
      return atual
    })
  }

  it('não penaliza o primeiro frame do ciclo (sem histórico para comparar)', () => {
    expect(estimateStability(box, [], FRAME)).toBe(true)
  })

  it('tolera um pequeno movimento natural entre frames', () => {
    expect(estimateStability(box, [{ x: 252, y: 151, width: 141, height: 139 }], FRAME)).toBe(true)
  })

  it('reprova um salto grande de posição entre frames consecutivos', () => {
    expect(estimateStability(box, [{ x: 60, y: 40, width: 140, height: 140 }], FRAME)).toBe(false)
  })

  /**
   * Números reais medidos a 12fps contra rosto de verdade, pessoa quase parada:
   * variação linear de escala com mediana 0,011 e pior quadro 0,082; deslocamento
   * do centro com pior quadro 0,015 (limite 0,08). O critério tem que aprovar
   * isso com folga — era exatamente aqui que ele reprovava antes, porque media
   * ÁREA (os mesmos quadros davam até 0,178) e decidia por quadro isolado.
   */
  it('aprova o tremor real do detector medido com a pessoa parada, inclusive no pior quadro', () => {
    const historico = sequencia(box, [
      { dx: 1.2, dy: -0.8, escala: 1.011 },
      { dx: -0.9, dy: 1.1, escala: 0.989 },
      { dx: 1.4, dy: 0.6, escala: 1.032 },
    ])
    const pior = sequencia(historico[historico.length - 1], [{ dx: 2.4, dy: -1.6, escala: 1.082 }])[0]
    expect(estimateStability(pior, historico, FRAME)).toBe(true)
  })

  it('não deixa um único quadro de pico derrubar a estabilidade quando o resto está parado', () => {
    const historico = sequencia(box, [{ escala: 1.005 }, { escala: 0.997 }, { escala: 1.004 }])
    // Pico isolado de 22% num quadro só: a média de 3 pares o dilui.
    const pico = sequencia(historico[historico.length - 1], [{ escala: 1.22 }])[0]
    expect(estimateStability(pico, historico, FRAME)).toBe(true)
  })

  it('continua reprovando movimento real sustentado — aproximar-se da câmera quadro após quadro', () => {
    const historico = sequencia(box, [{ escala: 1.2 }, { escala: 1.2 }, { escala: 1.2 }])
    const seguinte = sequencia(historico[historico.length - 1], [{ escala: 1.2 }])[0]
    expect(estimateStability(seguinte, historico, FRAME)).toBe(false)
  })

  /**
   * Uma rotação pura de cabeça é assunto do critério `pose`, não de
   * `estabilidade`: girar o rosto quase não move o centro da caixa. O que
   * `estabilidade` tem que pegar é quem sai de posição — vira a cabeça e
   * acompanha com o corpo, se levanta, anda para o lado.
   */
  it('continua reprovando movimento real sustentado — sair de posição, com a caixa escorregando de lado', () => {
    const historico = sequencia(box, [
      { dx: 36, escala: 0.96 },
      { dx: 38, escala: 0.95 },
      { dx: 40, escala: 0.94 },
    ])
    const seguinte = sequencia(historico[historico.length - 1], [{ dx: 42, escala: 0.93 }])[0]
    expect(estimateStability(seguinte, historico, FRAME)).toBe(false)
  })

  it('a média móvel não esconde movimento que já dura a janela inteira', () => {
    // Todos os pares acima do limite: reprova sem depender de um quadro extremo.
    const historico = sequencia(box, [{ escala: 1.18 }, { escala: 1.18 }, { escala: 1.18 }])
    const seguinte = sequencia(historico[historico.length - 1], [{ escala: 1.18 }])[0]
    expect(estimateStability(seguinte, historico, FRAME)).toBe(false)
  })
})

describe('evaluateQuality — combinação dos 7 critérios (§06.1, §08.10)', () => {
  it('aprova quando todos os critérios são atendidos', () => {
    const quality = evaluateQuality({
      box: boxCenteredIn(FRAME, 0.2),
      landmarks: frontalLandmarks(),
      frame: FRAME,
      faceImage: checkerboardImage(20, 20),
      recentBoxes: [],
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
      recentBoxes: [],
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
      recentBoxes: [],
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
