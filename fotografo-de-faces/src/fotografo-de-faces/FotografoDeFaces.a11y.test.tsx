import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FotografoDeFaces } from './FotografoDeFaces'
import type { FotografoDeFacesProps } from './FotografoDeFaces'
import { useFotografoDeFacesMachine } from './useFotografoDeFacesMachine'
import type { UseFotografoDeFacesMachine } from './useFotografoDeFacesMachine'
import type { Candidate, FotografoDeFacesSnapshot } from './types'

// Testa a conformidade WCAG 2.2 AA da camada de apresentação (F8): dado um
// snapshot simulado, os elementos interativos e a região de status têm os
// atributos/tamanhos certos? A máquina (F1) e a câmera/detecção (F2/F3) são
// mockadas pelo mesmo motivo de sempre — já têm suítes próprias, e F8 é
// especificamente sobre a superfície de acessibilidade.
vi.mock('./useFotografoDeFacesMachine', () => ({
  useFotografoDeFacesMachine: vi.fn(),
}))
vi.mock('./useCameraStream', () => ({
  useCameraStream: vi.fn(() => ({ stream: null, status: 'idle', error: null })),
}))
vi.mock('./useFaceDetection', () => ({
  useFaceDetection: vi.fn(() => ({ status: 'idle', visibleFaces: [] })),
}))

function buildSnapshot(overrides: Partial<FotografoDeFacesSnapshot> = {}): FotografoDeFacesSnapshot {
  return {
    state: 'AGUARDANDO',
    message: 'Aguardando um novo ciclo.',
    value: null,
    quality: null,
    timer: null,
    candidate: null,
    mode: 'autorretrato',
    errorCode: null,
    ...overrides,
  }
}

function renderComponent(
  props: Partial<FotografoDeFacesProps> = {},
  snapshotOverrides: Partial<FotografoDeFacesSnapshot> = {},
) {
  const machine: UseFotografoDeFacesMachine = {
    snapshot: buildSnapshot(snapshotOverrides),
    dispatch: vi.fn(),
    capture: vi.fn(),
    restart: vi.fn(),
    getState: vi.fn(() => buildSnapshot(snapshotOverrides)),
    getValue: vi.fn(() => snapshotOverrides.value ?? null),
  }
  vi.mocked(useFotografoDeFacesMachine).mockReturnValue(machine)
  return render(<FotografoDeFaces value={null} onChange={vi.fn()} {...props} />)
}

const candidate: Candidate = { id: 'candidata-1' }

/** Lê um valor de tamanho declarado no CSS (ex.: "44px", "56px") como número. */
function pxValue(value: string): number {
  const match = /([\d.]+)px/.exec(value)
  return match ? Number.parseFloat(match[1]) : 0
}

describe('FotografoDeFaces — região de status para leitores de tela (§4.1.3)', () => {
  it('a mensagem sempre tem role="status" e aria-live="polite", com showMessages ligado', () => {
    renderComponent({ showMessages: true }, { message: 'Aproxime-se um pouco.' })
    const message = screen.getByTestId('message')
    expect(message).toHaveAttribute('role', 'status')
    expect(message).toHaveAttribute('aria-live', 'polite')
    expect(message).toHaveTextContent('Aproxime-se um pouco.')
  })

  it('a mensagem continua no DOM com role="status"/aria-live mesmo com showMessages desligado (padrão)', () => {
    renderComponent({}, { message: 'Pronto para capturar.' })
    const message = screen.getByTestId('message')
    expect(message).toHaveAttribute('role', 'status')
    expect(message).toHaveAttribute('aria-live', 'polite')
    expect(message).toHaveTextContent('Pronto para capturar.')
  })

  it('o texto muda a cada transição crítica de estado (CAPTURANDO -> FOTOGRAFIA_PRONTA)', () => {
    const { rerender } = renderComponent(
      { showMessages: true },
      { state: 'CAPTURANDO', message: 'Capturando a fotografia.' },
    )
    const capturandoText = screen.getByTestId('message').textContent

    const machine: UseFotografoDeFacesMachine = {
      snapshot: buildSnapshot({
        state: 'FOTOGRAFIA_PRONTA',
        value: new Blob(['x']),
        message: 'Fotografia disponível.',
      }),
      dispatch: vi.fn(),
      capture: vi.fn(),
      restart: vi.fn(),
      getState: vi.fn(),
      getValue: vi.fn(),
    }
    vi.mocked(useFotografoDeFacesMachine).mockReturnValue(machine)
    rerender(<FotografoDeFaces value={null} onChange={vi.fn()} showMessages />)

    expect(screen.getByTestId('message').textContent).not.toBe(capturandoText)
  })
})

describe('FotografoDeFaces — operabilidade por teclado (§2.1.1)', () => {
  it('o botão de captura é um <button> nativo com tabIndex={0}', () => {
    renderComponent({ autoCaptureAfter: null }, { state: 'PRONTO', candidate })
    const button = screen.getByTestId('capture-button')
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('tabIndex', '0')
  })

  it('os botões do painel de revisão são <button> nativos com tabIndex={0}', () => {
    renderComponent({ reviewFor: 3000 }, { state: 'FOTOGRAFIA_PRONTA', value: new Blob(['x']) })
    for (const testId of ['trocar-button', 'limpar-button']) {
      const button = screen.getByTestId(testId)
      expect(button.tagName).toBe('BUTTON')
      expect(button).toHaveAttribute('tabIndex', '0')
    }
  })

  it('o alternador de tela cheia é um <button> nativo com tabIndex={0}', () => {
    renderComponent()
    const button = screen.getByTestId('fullscreen-button')
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('tabIndex', '0')
    expect(button).toHaveAttribute('aria-pressed')
  })
})

describe('FotografoDeFaces — tamanho mínimo de alvo interativo (§2.5.8, ≥24×24px)', () => {
  it('o botão de captura tem pelo menos 24×24px', () => {
    renderComponent({ autoCaptureAfter: null }, { state: 'PRONTO', candidate })
    const style = getComputedStyle(screen.getByTestId('capture-button'))
    expect(pxValue(style.width)).toBeGreaterThanOrEqual(24)
    expect(pxValue(style.height)).toBeGreaterThanOrEqual(24)
  })

  it('os botões de revisão têm pelo menos 24×24px (min-width/min-height declarados)', () => {
    renderComponent({ reviewFor: 3000 }, { state: 'FOTOGRAFIA_PRONTA', value: new Blob(['x']) })
    for (const testId of ['trocar-button', 'limpar-button']) {
      const style = getComputedStyle(screen.getByTestId(testId))
      expect(pxValue(style.minWidth)).toBeGreaterThanOrEqual(24)
      expect(pxValue(style.minHeight)).toBeGreaterThanOrEqual(24)
    }
  })

  it('o alternador de tela cheia tem pelo menos 24×24px (min-width/min-height declarados)', () => {
    renderComponent()
    const style = getComputedStyle(screen.getByTestId('fullscreen-button'))
    expect(pxValue(style.minWidth)).toBeGreaterThanOrEqual(24)
    expect(pxValue(style.minHeight)).toBeGreaterThanOrEqual(24)
  })
})
