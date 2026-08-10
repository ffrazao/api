/**
 * Matemática de contraste WCAG 2.2 — F8 (§1.4.3, §1.4.11).
 *
 * Módulo puro (sem React/styled-components): implementa a fórmula oficial de
 * luminância relativa e razão de contraste do WCAG, para que a paleta usada
 * no componente possa ser VERIFICADA por teste em vez de escolhida no olho.
 *
 * Limite honesto: isto garante contraste entre duas cores sólidas que nós
 * controlamos (texto sobre painel, botão sobre seu próprio fundo). Elementos
 * sobrepostos a vídeo ao vivo (molduras, guia) têm um pano de fundo
 * arbitrário que nenhuma matemática estática consegue garantir — para esses,
 * a mitigação é de design (contorno duplo/sombra), não uma prova formal.
 */

export const MIN_TEXT_CONTRAST = 4.5
export const MIN_NON_TEXT_CONTRAST = 3

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.replace(/(.)/g, '$1$1') : normalized
  const value = Number.parseInt(full, 16)
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 }
}

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/** Luminância relativa (0–1) conforme a fórmula do WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const R = srgbChannelToLinear(r)
  const G = srgbChannelToLinear(g)
  const B = srgbChannelToLinear(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/** Razão de contraste (1–21) entre duas cores sólidas, conforme WCAG 2.x. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA)
  const lB = relativeLuminance(hexB)
  const lighter = Math.max(lA, lB)
  const darker = Math.min(lA, lB)
  return (lighter + 0.05) / (darker + 0.05)
}

/** §1.4.3/§1.4.11 — true se o par de cores atinge a razão mínima exigida. */
export function meetsContrast(hexA: string, hexB: string, minRatio: number): boolean {
  return contrastRatio(hexA, hexB) >= minRatio
}
