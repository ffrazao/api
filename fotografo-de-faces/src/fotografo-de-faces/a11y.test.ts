import { describe, expect, it } from 'vitest'
import { contrastRatio, meetsContrast, MIN_NON_TEXT_CONTRAST, MIN_TEXT_CONTRAST, relativeLuminance } from './a11y'
import { A11Y_COLORS } from './presentation'

describe('contrastRatio / relativeLuminance — matemática WCAG (referências conhecidas)', () => {
  it('preto sobre branco é o contraste máximo (21:1)', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
  })

  it('uma cor contra ela mesma é sempre 1:1', () => {
    expect(contrastRatio('#2ecc71', '#2ecc71')).toBeCloseTo(1, 5)
  })

  it('é simétrico — a ordem dos argumentos não importa', () => {
    expect(contrastRatio('#123456', '#fedcba')).toBeCloseTo(contrastRatio('#fedcba', '#123456'), 10)
  })

  it('preto tem luminância 0 e branco tem luminância 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })
})

describe('Paleta do componente — contraste mínimo verificado (§1.4.3, §1.4.11, F8)', () => {
  it('texto sobre o painel escuro (mensagens, cronômetro) atinge 4.5:1', () => {
    expect(meetsContrast(A11Y_COLORS.textOnPanel, A11Y_COLORS.panelBackground, MIN_TEXT_CONTRAST)).toBe(true)
  })

  it('botão secundário de revisão (Trocar/Limpar/Cancelar) atinge 4.5:1', () => {
    expect(
      meetsContrast(A11Y_COLORS.reviewSecondaryText, A11Y_COLORS.reviewSecondaryBackground, MIN_TEXT_CONTRAST),
    ).toBe(true)
  })

  it('botão primário de revisão (Confirmar) atinge 4.5:1', () => {
    expect(
      meetsContrast(A11Y_COLORS.reviewPrimaryText, A11Y_COLORS.reviewPrimaryBackground, MIN_TEXT_CONTRAST),
    ).toBe(true)
  })

  it('o anel de foco (contorno + halo) atinge 3:1 tanto contra claro quanto contra escuro', () => {
    expect(meetsContrast(A11Y_COLORS.focusOutline, '#ffffff', MIN_NON_TEXT_CONTRAST)).toBe(true)
    expect(meetsContrast(A11Y_COLORS.focusHalo, '#000000', MIN_NON_TEXT_CONTRAST)).toBe(true)
  })
})
