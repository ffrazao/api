import { describe, expect, it } from 'vitest'
import { getFaceFrameColor, isCaptureButtonEnabled, shouldShowCaptureButton } from './presentation'
import type { FotografoDeFacesState } from './types'

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
