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

/**
 * Converte uma caixa em pixels do vídeo (espaço intrínseco `videoWidth`/
 * `videoHeight`) numa posição em porcentagem do contêiner. É uma aproximação
 * por escala uniforme — o vídeo é exibido com `object-fit: cover`, que pode
 * cortar as bordas conforme a proporção do contêiner hospedeiro; posicionar
 * pixel-perfeito exigiria conhecer essa proporção em tempo de renderização.
 * Suficiente para posicionar aproximadamente as molduras do quiosque; uma
 * calibração mais fina fica para quando houver um contêiner real para testar.
 */
export function boxToPercentagePosition(
  box: BoundingBox,
  frame: FrameSize,
): { left: string; top: string; width: string; height: string } {
  if (frame.width <= 0 || frame.height <= 0) {
    return { left: '0%', top: '0%', width: '0%', height: '0%' }
  }
  return {
    left: `${(box.x / frame.width) * 100}%`,
    top: `${(box.y / frame.height) * 100}%`,
    width: `${(box.width / frame.width) * 100}%`,
    height: `${(box.height / frame.height) * 100}%`,
  }
}
