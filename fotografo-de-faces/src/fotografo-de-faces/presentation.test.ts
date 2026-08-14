import { describe, expect, it } from 'vitest'
import {
  boxToPercentagePosition,
  getFaceFrameColor,
  getVisibleFaceColor,
  isCaptureButtonEnabled,
  shouldShowCaptureButton,
  shouldShowFramingGuide,
} from './presentation'
import type { FotografoDeFacesMode, FotografoDeFacesState } from './types'

describe('getFaceFrameColor (§07.9, §14.11)', () => {
  it('não exibe moldura em AGUARDANDO (nenhuma face)', () => {
    expect(getFaceFrameColor('AGUARDANDO', false)).toBeNull()
  })

  it('não exibe moldura em DETECTANDO/AVALIANDO sem candidata', () => {
    expect(getFaceFrameColor('DETECTANDO', false)).toBeNull()
    expect(getFaceFrameColor('AVALIANDO', false)).toBeNull()
  })

  it('amarela quando há candidata em DETECTANDO ou AVALIANDO', () => {
    expect(getFaceFrameColor('DETECTANDO', true)).toBe('amarela')
    expect(getFaceFrameColor('AVALIANDO', true)).toBe('amarela')
  })

  it('verde em PRONTO e CRONOMETRANDO', () => {
    expect(getFaceFrameColor('PRONTO', true)).toBe('verde')
    expect(getFaceFrameColor('CRONOMETRANDO', true)).toBe('verde')
  })

  it('azul em FOTOGRAFIA_PRONTA, independentemente de haver candidata', () => {
    expect(getFaceFrameColor('FOTOGRAFIA_PRONTA', false)).toBe('azul')
  })

  it('vermelha em ERRO, independentemente de haver candidata', () => {
    expect(getFaceFrameColor('ERRO', false)).toBe('vermelha')
  })

  it('não exibe moldura em CAPTURANDO', () => {
    expect(getFaceFrameColor('CAPTURANDO', true)).toBeNull()
  })
})

describe('isCaptureButtonEnabled (§11.2, §06.9)', () => {
  const naoProntoStates: FotografoDeFacesState[] = [
    'AGUARDANDO',
    'DETECTANDO',
    'AVALIANDO',
    'CRONOMETRANDO',
    'CAPTURANDO',
    'FOTOGRAFIA_PRONTA',
    'ERRO',
  ]

  it.each(naoProntoStates)('fica desabilitado fora de PRONTO (%s)', (state) => {
    expect(isCaptureButtonEnabled(state)).toBe(false)
  })

  it('fica habilitado em PRONTO', () => {
    expect(isCaptureButtonEnabled('PRONTO')).toBe(true)
  })
})

describe('shouldShowCaptureButton (§11, F5)', () => {
  it('aparece quando autoCaptureAfter é null (modo manual) fora de FOTOGRAFIA_PRONTA', () => {
    expect(shouldShowCaptureButton(null, 'PRONTO')).toBe(true)
    expect(shouldShowCaptureButton(null, 'AGUARDANDO')).toBe(true)
  })

  it('não aparece quando autoCaptureAfter está definido (captura automática)', () => {
    expect(shouldShowCaptureButton(0, 'PRONTO')).toBe(false)
    expect(shouldShowCaptureButton(3, 'PRONTO')).toBe(false)
  })

  it('não aparece em FOTOGRAFIA_PRONTA, mesmo em modo manual — lugar das ações de revisão', () => {
    expect(shouldShowCaptureButton(null, 'FOTOGRAFIA_PRONTA')).toBe(false)
  })
})

/**
 * §07.9/§09.6 — posicionamento da moldura sobre a face com `object-fit: cover`.
 *
 * Os valores esperados aqui NÃO foram deduzidos no papel: foram medidos no
 * Chrome, com o mesmo CSS de FotografoDeFaces.styles.ts (`width/height: 100%`,
 * `object-fit: cover`, sobreposição em `position: absolute; inset: 0`) e uma
 * fonte de vídeo sintética de 640×480 que pinta um retângulo cheio exatamente
 * sobre CAIXA. A posição real desse retângulo na tela foi lida dos pixels de uma
 * captura de tela (com a moldura escondida, para a borda não comer pixels do
 * marcador) — ou seja, quem define a verdade é o compositor do navegador, não a
 * fórmula sob teste.
 *
 * Medições (contêiner → onde o retângulo aparece de fato, em px da tela):
 *   640×480 → x=180 y=90  w=200 h=200 (o quadro inteiro cabe; nada é cortado)
 *   960×270 → x=270 y=0   w=300 h=210 (recorte vertical: a caixa começa acima
 *                                      do topo, em y=-90, e mede 300 de altura)
 *   300×600 → x=0   y=113 w=225 h=249 (recorte horizontal: a caixa começa à
 *                                      esquerda da borda, em x=-25, e mede 250)
 *
 * Por isso os casos abaixo comparam a caixa completa (não recortada) que a
 * função deve produzir: o contêiner é que corta o excedente, via `overflow:
 * hidden` do VideoClip.
 */
describe('boxToPercentagePosition (§07.9, §09.6 — mapeamento de object-fit: cover)', () => {
  const VIDEO = { width: 640, height: 480 }
  const CAIXA = { x: 180, y: 90, width: 200, height: 200 }

  /** Devolve a caixa em pixels da tela que o estilo em porcentagem produz no contêiner. */
  function emPixels(
    estilo: { left: string; top: string; width: string; height: string },
    display: { width: number; height: number },
  ) {
    const fracao = (valor: string) => Number.parseFloat(valor) / 100
    return {
      x: fracao(estilo.left) * display.width,
      y: fracao(estilo.top) * display.height,
      width: fracao(estilo.width) * display.width,
      height: fracao(estilo.height) * display.height,
    }
  }

  it('contêiner na mesma proporção do vídeo: escala uniforme, sem deslocamento', () => {
    const display = { width: 640, height: 480 }
    const px = emPixels(boxToPercentagePosition(CAIXA, VIDEO, display), display)

    expect(px.x).toBeCloseTo(180, 3)
    expect(px.y).toBeCloseTo(90, 3)
    expect(px.width).toBeCloseTo(200, 3)
    expect(px.height).toBeCloseTo(200, 3)
  })

  it('contêiner com a mesma proporção mas outro tamanho: só escala', () => {
    const display = { width: 320, height: 240 }
    const px = emPixels(boxToPercentagePosition(CAIXA, VIDEO, display), display)

    expect(px.x).toBeCloseTo(90, 3)
    expect(px.y).toBeCloseTo(45, 3)
    expect(px.width).toBeCloseTo(100, 3)
    expect(px.height).toBeCloseTo(100, 3)
  })

  it('contêiner mais largo que o vídeo: corta em cima e embaixo, nunca nas laterais', () => {
    const display = { width: 960, height: 270 }
    const px = emPixels(boxToPercentagePosition(CAIXA, VIDEO, display), display)

    // escala = max(960/640, 270/480) = 1.5; altura renderizada 720 num contêiner
    // de 270 ⇒ sobra 450 cortada meio a meio, deslocando 225 para cima.
    expect(px.x).toBeCloseTo(270, 3)
    expect(px.y).toBeCloseTo(-90, 3)
    expect(px.width).toBeCloseTo(300, 3)
    expect(px.height).toBeCloseTo(300, 3)

    // A parte visível bate com o que a captura de tela mostrou: y=0 até 210.
    expect(Math.max(px.y, 0)).toBeCloseTo(0, 3)
    expect(px.y + px.height).toBeCloseTo(210, 3)
  })

  it('contêiner mais estreito que o vídeo: corta nas laterais, nunca em cima/embaixo', () => {
    const display = { width: 300, height: 600 }
    const px = emPixels(boxToPercentagePosition(CAIXA, VIDEO, display), display)

    // escala = max(300/640, 600/480) = 1.25; largura renderizada 800 num
    // contêiner de 300 ⇒ sobram 500 cortados meio a meio, deslocando 250 à esquerda.
    expect(px.x).toBeCloseTo(-25, 3)
    expect(px.y).toBeCloseTo(112.5, 3)
    expect(px.width).toBeCloseTo(250, 3)
    expect(px.height).toBeCloseTo(250, 3)

    // Parte visível conforme a captura de tela: de x=0 até 225.
    expect(px.x + px.width).toBeCloseTo(225, 3)
  })

  it('mantém o centro da caixa sobre o centro da face em qualquer proporção', () => {
    // O centro da CAIXA está em (280, 190) no espaço do vídeo. Sob cover, ele
    // tem de cair sempre no mesmo ponto que o vídeo desenha — o que equivale a
    // aplicar a mesma escala e o mesmo deslocamento do eixo cortado.
    const centro = (display: { width: number; height: number }) => {
      const px = emPixels(boxToPercentagePosition(CAIXA, VIDEO, display), display)
      return { x: px.x + px.width / 2, y: px.y + px.height / 2 }
    }

    const igual = centro({ width: 640, height: 480 })
    expect(igual.x).toBeCloseTo(280, 6)
    expect(igual.y).toBeCloseTo(190, 6)

    // 960×270: escala 1.5, deslocamento vertical -225 ⇒ (420, 60).
    const largo = centro({ width: 960, height: 270 })
    expect(largo.x).toBeCloseTo(420, 6)
    expect(largo.y).toBeCloseTo(60, 6)

    // 300×600: escala 1.25, deslocamento horizontal -250 ⇒ (100, 237.5).
    const estreito = centro({ width: 300, height: 600 })
    expect(estreito.x).toBeCloseTo(100, 6)
    expect(estreito.y).toBeCloseTo(237.5, 6)
  })

  it('sem tamanho de vídeo ou de contêiner conhecido, não desenha moldura nenhuma', () => {
    const vazio = { left: '0%', top: '0%', width: '0%', height: '0%' }

    expect(boxToPercentagePosition(CAIXA, { width: 0, height: 0 }, { width: 640, height: 480 })).toEqual(vazio)
    expect(boxToPercentagePosition(CAIXA, VIDEO, { width: 0, height: 0 })).toEqual(vazio)
  })
})

describe('shouldShowFramingGuide (§07.9.1 item 1, emenda v1.1)', () => {
  const outrosModos: FotografoDeFacesMode[] = ['autorretrato', 'assistido']

  it.each(outrosModos)('%s — respeita a propriedade do hospedeiro', (mode) => {
    expect(shouldShowFramingGuide(true, mode)).toBe(true)
    expect(shouldShowFramingGuide(false, mode)).toBe(false)
  })

  it('quiosque — força a guia oval a oculta mesmo com showFramingGuide=true', () => {
    expect(shouldShowFramingGuide(true, 'quiosque')).toBe(false)
    expect(shouldShowFramingGuide(false, 'quiosque')).toBe(false)
  })
})

describe('getVisibleFaceColor (§07.9.1 itens 2 e 3, emenda v1.1)', () => {
  const estados: FotografoDeFacesState[] = [
    'AGUARDANDO',
    'DETECTANDO',
    'AVALIANDO',
    'PRONTO',
    'CRONOMETRANDO',
    'CAPTURANDO',
    'FOTOGRAFIA_PRONTA',
    'ERRO',
  ]

  it.each(estados)('%s — face não travada fica sempre amarela (detecção passiva, §09.1)', (state) => {
    expect(getVisibleFaceColor(false, state)).toBe('amarela')
  })

  it('a candidata travada preserva o mapeamento de cores do §07.9', () => {
    expect(getVisibleFaceColor(true, 'AVALIANDO')).toBe('amarela')
    expect(getVisibleFaceColor(true, 'PRONTO')).toBe('verde')
    expect(getVisibleFaceColor(true, 'CRONOMETRANDO')).toBe('verde')
    expect(getVisibleFaceColor(true, 'FOTOGRAFIA_PRONTA')).toBe('azul')
    expect(getVisibleFaceColor(true, 'ERRO')).toBe('vermelha')
  })
})
