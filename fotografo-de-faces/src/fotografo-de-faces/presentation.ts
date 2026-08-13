/**
 * Regras de apresentação puras — F4/F6 (§07.9, §09.6, §11.2, §14.11, §20.4).
 *
 * Derivam o que mostrar na UI a partir do snapshot da máquina (F1), sem
 * depender de React nem de styled-components — o que as torna testáveis
 * isoladamente, sem precisar renderizar nada.
 */
import type { BoundingBox, FrameSize } from './faceMetrics'
import type { FotografoDeFacesState } from './types'

export type FaceFrameColor = 'amarela' | 'verde' | 'azul' | 'vermelha'

/** Cor real (hex) usada nos estilos para cada moldura — só a camada visual conhece isto. */
export const FACE_FRAME_HEX: Record<FaceFrameColor, string> = {
  amarela: '#f5c518',
  verde: '#2ecc71',
  azul: '#3498db',
  vermelha: '#e74c3c',
}

/**
 * Paleta com contraste WCAG 2.2 AA verificado por teste (a11y.test.ts) —
 * §1.4.3 (texto ≥4.5:1) e §1.4.11 (não-texto ≥3:1), F8. Painéis são cores
 * SÓLIDAS (não semitransparentes) atrás de texto — é a única forma de
 * garantir a razão de contraste independentemente do que estiver passando
 * no vídeo por trás.
 */
export const A11Y_COLORS = {
  /** Fundo sólido atrás de mensagens/cronômetro, para o texto nunca depender do vídeo por trás. */
  panelBackground: '#000000',
  textOnPanel: '#ffffff',
  reviewSecondaryBackground: '#ffffff',
  reviewSecondaryText: '#111111',
  reviewPrimaryBackground: '#2ecc71',
  reviewPrimaryText: '#0b3d20',
  /** Anel de foco em duas cores (contorno + halo) — pelo menos uma sempre contrasta com o fundo. */
  focusOutline: '#000000',
  focusHalo: '#ffffff',
} as const

/**
 * Mapeamento de cor da moldura por estado (§07.9, §14.11):
 * nenhuma face → não exibir; face detectada/candidata em avaliação → amarela;
 * candidata aprovada em PRONTO/CRONOMETRANDO → verde; fotografia produzida →
 * azul; falha → vermelha.
 */
export function getFaceFrameColor(state: FotografoDeFacesState, hasCandidate: boolean): FaceFrameColor | null {
  switch (state) {
    case 'DETECTANDO':
    case 'AVALIANDO':
      return hasCandidate ? 'amarela' : null
    case 'PRONTO':
    case 'CRONOMETRANDO':
      return 'verde'
    case 'FOTOGRAFIA_PRONTA':
      return 'azul'
    case 'ERRO':
      return 'vermelha'
    default:
      return null
  }
}

/** §11.2/§06.9: o botão de captura manual só fica habilitado em PRONTO. */
export function isCaptureButtonEnabled(state: FotografoDeFacesState): boolean {
  return state === 'PRONTO'
}

/**
 * §11: o botão interno de disparo manual só existe quando não há captura
 * automática — e nunca em FOTOGRAFIA_PRONTA (F5), onde o lugar dele na UI é
 * ocupado pelas ações de revisão (Trocar/Limpar/Confirmar/Cancelar) ou,
 * sem revisão habilitada, não há mais nada a capturar até `value` voltar a null.
 */
export function shouldShowCaptureButton(autoCaptureAfter: number | null, state: FotografoDeFacesState): boolean {
  return autoCaptureAfter === null && state !== 'FOTOGRAFIA_PRONTA'
}

/**
 * §07.9/§09.6 (F6, quiosque): toda face visível começa amarela; só a
 * candidata travada pelo Face Lock evolui para verde, e só ao alcançar
 * PRONTO/CRONOMETRANDO — as demais faces do quadro continuam amarelas.
 */
export function getVisibleFaceColor(locked: boolean, state: FotografoDeFacesState): FaceFrameColor {
  if (locked && (state === 'PRONTO' || state === 'CRONOMETRANDO')) return 'verde'
  return 'amarela'
}

/** Tamanho do contêiner em pixels CSS — o que o vídeo realmente ocupa na tela. */
export interface DisplaySize {
  width: number
  height: number
}

/**
 * Converte uma caixa em pixels do vídeo (espaço intrínseco `videoWidth`/
 * `videoHeight`) numa posição em porcentagem do contêiner, atravessando o
 * mapeamento geométrico de `object-fit: cover` (§07.9, §09.6).
 *
 * `cover` escolhe a MAIOR das duas escalas necessárias para cobrir o contêiner,
 * de modo que o vídeo transborde no eixo em que sobra conteúdo; o excedente é
 * cortado meio a meio, porque `object-position` fica no padrão `50% 50%` (ver
 * `Video` em FotografoDeFaces.styles.ts). Portanto:
 *
 *     escala   = max(larguraContêiner / larguraVídeo, alturaContêiner / alturaVídeo)
 *     deslocaX = (larguraContêiner - larguraVídeo × escala) / 2   (≤ 0)
 *     deslocaY = (alturaContêiner  - alturaVídeo  × escala) / 2   (≤ 0)
 *
 * A escala ingênua anterior (dividir a caixa pelo tamanho do vídeo) só acerta
 * quando o contêiner tem exatamente a proporção da câmera; fora disso ela erra
 * tanto o tamanho quanto a posição — num contêiner de 960×270 com câmera 640×480
 * a moldura saía 50px abaixo do rosto e com 112px de altura em vez de 300px
 * (medido no Chrome antes desta correção).
 *
 * A caixa devolvida pode ficar negativa ou passar de 100% — é exatamente o que
 * deve acontecer quando a face está na parte do quadro que o `cover` cortou. O
 * `overflow: hidden` do `VideoClip` corta a moldura no mesmo lugar em que corta
 * o vídeo, então a moldura acompanha o rosto até sair de cena.
 */
export function boxToPercentagePosition(
  box: BoundingBox,
  frame: FrameSize,
  display: DisplaySize,
): { left: string; top: string; width: string; height: string } {
  if (frame.width <= 0 || frame.height <= 0 || display.width <= 0 || display.height <= 0) {
    return { left: '0%', top: '0%', width: '0%', height: '0%' }
  }

  const scale = Math.max(display.width / frame.width, display.height / frame.height)
  const offsetX = (display.width - frame.width * scale) / 2
  const offsetY = (display.height - frame.height * scale) / 2

  return {
    left: `${((box.x * scale + offsetX) / display.width) * 100}%`,
    top: `${((box.y * scale + offsetY) / display.height) * 100}%`,
    width: `${((box.width * scale) / display.width) * 100}%`,
    height: `${((box.height * scale) / display.height) * 100}%`,
  }
}
