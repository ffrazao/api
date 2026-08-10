import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FotografoDeFaces } from './FotografoDeFaces'
import type { FotografoDeFacesProps } from './FotografoDeFaces'
import { useCameraStream } from './useCameraStream'
import { useFaceDetection } from './useFaceDetection'
import { useFotografoDeFacesMachine } from './useFotografoDeFacesMachine'
import type { UseFotografoDeFacesMachine } from './useFotografoDeFacesMachine'
import type { Candidate, FotografoDeFacesSnapshot, FotografoDeFacesState } from './types'

// Este arquivo testa a camada de APRESENTAÇÃO (F4): dado um snapshot simulado
// da máquina (F1), o componente renderiza a moldura/guia/botão/mensagem
// certos? A máquina em si já tem sua própria suíte exaustiva em
// machine.test.ts — por isso ela é mockada aqui, junto com a câmera (F2) e a
// detecção (F3), que exigiriam navegador/hardware reais.
vi.mock('./useFotografoDeFacesMachine', () => ({
  useFotografoDeFacesMachine: vi.fn(),
}))
vi.mock('./useCameraStream', () => ({
  useCameraStream: vi.fn(() => ({ stream: null, status: 'idle', error: null })),
}))
vi.mock('./useFaceDetection', () => ({
  useFaceDetection: vi.fn(() => ({ status: 'idle', visibleFaces: [], candidateBox: null })),
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
    ...overrides,
  }
}

function renderComponent(
  props: Partial<FotografoDeFacesProps> = {},
  snapshotOverrides: Partial<FotografoDeFacesSnapshot> = {},
) {
  const capture = vi.fn()
  const restart = vi.fn()
  const dispatch = vi.fn()
  const machine: UseFotografoDeFacesMachine = {
    snapshot: buildSnapshot(snapshotOverrides),
    dispatch,
    capture,
    restart,
    getState: vi.fn(() => buildSnapshot(snapshotOverrides)),
    getValue: vi.fn(() => snapshotOverrides.value ?? null),
  }
  vi.mocked(useFotografoDeFacesMachine).mockReturnValue(machine)

  const onChange = vi.fn()
  const utils = render(<FotografoDeFaces value={null} onChange={onChange} {...props} />)
  return { ...utils, capture, restart, dispatch, onChange }
}

const candidate: Candidate = { id: 'candidata-1' }

describe('FotografoDeFaces — molduras coloridas (§07.9, §14.11)', () => {
  const cases: Array<[FotografoDeFacesState, Candidate | null, string]> = [
    ['AVALIANDO', candidate, 'amarela'],
    ['PRONTO', candidate, 'verde'],
    ['CRONOMETRANDO', candidate, 'verde'],
    ['FOTOGRAFIA_PRONTA', null, 'azul'],
    ['ERRO', null, 'vermelha'],
  ]

  it.each(cases)('estado %s -> moldura %s', (state, candidateOverride, color) => {
    renderComponent({ showFaceFrame: true }, { state, candidate: candidateOverride })
    const frame = screen.getByTestId('face-frame')
    expect(frame).toHaveAttribute('data-color', color)
  })

  it('não renderiza moldura em AGUARDANDO (nenhuma face) mesmo com showFaceFrame', () => {
    renderComponent({ showFaceFrame: true }, { state: 'AGUARDANDO' })
    expect(screen.queryByTestId('face-frame')).not.toBeInTheDocument()
  })

  it('não renderiza moldura quando showFaceFrame é false, mesmo em PRONTO', () => {
    renderComponent({ showFaceFrame: false }, { state: 'PRONTO', candidate })
    expect(screen.queryByTestId('face-frame')).not.toBeInTheDocument()
  })
})

describe('FotografoDeFaces — guia de enquadramento (§02.1 item 4, §20.4)', () => {
  it('exibe a guia oval quando showFramingGuide é true', () => {
    renderComponent({ showFramingGuide: true })
    expect(screen.getByTestId('framing-guide')).toBeInTheDocument()
  })

  it('oculta a guia oval quando showFramingGuide é false (padrão)', () => {
    renderComponent({})
    expect(screen.queryByTestId('framing-guide')).not.toBeInTheDocument()
  })
})

describe('FotografoDeFaces — botão de captura manual (§11.2, §06.9)', () => {
  const naoProntoStatesComBotao: FotografoDeFacesState[] = [
    'AGUARDANDO',
    'DETECTANDO',
    'AVALIANDO',
    'CRONOMETRANDO',
    'CAPTURANDO',
    'ERRO',
  ]

  it.each(naoProntoStatesComBotao)('fica desabilitado fora de PRONTO (%s)', (state) => {
    renderComponent({ autoCaptureAfter: null }, { state })
    expect(screen.getByTestId('capture-button')).toBeDisabled()
  })

  it('fica habilitado ao atingir PRONTO', () => {
    renderComponent({ autoCaptureAfter: null }, { state: 'PRONTO', candidate })
    expect(screen.getByTestId('capture-button')).toBeEnabled()
  })

  it('não aparece quando autoCaptureAfter está definido (captura automática)', () => {
    renderComponent({ autoCaptureAfter: 3 }, { state: 'PRONTO', candidate })
    expect(screen.queryByTestId('capture-button')).not.toBeInTheDocument()
  })

  it('não aparece em FOTOGRAFIA_PRONTA — o lugar dele é das ações de revisão (F5)', () => {
    renderComponent({ autoCaptureAfter: null }, { state: 'FOTOGRAFIA_PRONTA' })
    expect(screen.queryByTestId('capture-button')).not.toBeInTheDocument()
  })

  it('chama capture() do hook ao ser clicado', () => {
    const { capture } = renderComponent({ autoCaptureAfter: null }, { state: 'PRONTO', candidate })
    fireEvent.click(screen.getByTestId('capture-button'))
    expect(capture).toHaveBeenCalledTimes(1)
  })
})

describe('FotografoDeFaces — mensagens de orientação (§14.1)', () => {
  it('exibe a mensagem da máquina quando showMessages é true', () => {
    renderComponent({ showMessages: true }, { message: 'Pronto para capturar.' })
    expect(screen.getByTestId('message')).toHaveTextContent('Pronto para capturar.')
  })

  it('oculta visualmente a mensagem quando showMessages é false (padrão) — mas mantém no DOM para leitores de tela (F8, §4.1.3)', () => {
    renderComponent({}, { message: 'Pronto para capturar.' })
    const message = screen.getByTestId('message')
    // Continua presente/anunciável (role="status", aria-live) — só a aparência visual muda.
    expect(message).toHaveTextContent('Pronto para capturar.')
    expect(message).toHaveAttribute('role', 'status')
    expect(message).toHaveAttribute('aria-live', 'polite')
  })
})

describe('FotografoDeFaces — cronômetro regressivo (§07.5, §10.3, §14.6)', () => {
  it('exibe o tempo restante em CRONOMETRANDO', () => {
    renderComponent(
      {},
      { state: 'CRONOMETRANDO', candidate, timer: { totalSeconds: 3, remainingSeconds: 2 } },
    )
    expect(screen.getByTestId('countdown')).toHaveTextContent('2')
  })

  it('não exibe cronômetro fora de CRONOMETRANDO', () => {
    renderComponent({}, { state: 'PRONTO', candidate })
    expect(screen.queryByTestId('countdown')).not.toBeInTheDocument()
  })
})

describe('FotografoDeFaces — integração com câmera e detecção (F2/F3)', () => {
  it('repassa o elemento de vídeo e o estado atual para os hooks de câmera e detecção', () => {
    renderComponent({}, { state: 'DETECTANDO' })

    expect(useCameraStream).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'DETECTANDO', value: null }),
    )
    expect(useFaceDetection).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'DETECTANDO', value: null }),
    )
  })

  it('repassa o modo escolhido para o motor de detecção (F6)', () => {
    renderComponent({ mode: 'quiosque' }, { state: 'DETECTANDO', mode: 'quiosque' })

    expect(useFaceDetection).toHaveBeenCalledWith(expect.objectContaining({ mode: 'quiosque' }))
  })
})

describe('FotografoDeFaces — molduras do quiosque, uma por face visível (§07.9, §09.6, F6)', () => {
  it('todas as faces começam amarelas; só a travada evolui para verde ao alcançar PRONTO', () => {
    vi.mocked(useFaceDetection).mockReturnValue({
      status: 'ready',
      visibleFaces: [
        { id: 'a', box: { x: 10, y: 10, width: 100, height: 100 }, locked: false },
        { id: 'b', box: { x: 200, y: 50, width: 120, height: 120 }, locked: true },
      ],
      candidateBox: null,
    })

    renderComponent({ mode: 'quiosque', showFaceFrame: true }, { state: 'PRONTO', mode: 'quiosque', candidate })

    const frames = screen.getAllByTestId('face-frame')
    expect(frames).toHaveLength(2)
    expect(frames[0]).toHaveAttribute('data-color', 'amarela')
    expect(frames[1]).toHaveAttribute('data-color', 'verde')
  })

  it('a face travada continua amarela enquanto o estado não chega a PRONTO/CRONOMETRANDO', () => {
    vi.mocked(useFaceDetection).mockReturnValue({
      status: 'ready',
      visibleFaces: [{ id: 'a', box: { x: 10, y: 10, width: 100, height: 100 }, locked: true }],
      candidateBox: null,
    })

    renderComponent({ mode: 'quiosque', showFaceFrame: true }, { state: 'AVALIANDO', mode: 'quiosque', candidate })

    expect(screen.getByTestId('face-frame')).toHaveAttribute('data-color', 'amarela')
  })

  it('não renderiza nenhuma moldura de quiosque quando showFaceFrame é false', () => {
    vi.mocked(useFaceDetection).mockReturnValue({
      status: 'ready',
      visibleFaces: [{ id: 'a', box: { x: 10, y: 10, width: 100, height: 100 }, locked: true }],
      candidateBox: null,
    })

    renderComponent({ mode: 'quiosque', showFaceFrame: false }, { state: 'PRONTO', mode: 'quiosque', candidate })

    expect(screen.queryByTestId('face-frame')).not.toBeInTheDocument()
  })

  it('fora do quiosque, usa a moldura única de sempre mesmo que visibleFaces venha preenchido', () => {
    vi.mocked(useFaceDetection).mockReturnValue({
      status: 'ready',
      visibleFaces: [{ id: 'a', box: { x: 10, y: 10, width: 100, height: 100 }, locked: true }],
      candidateBox: null,
    })

    renderComponent({ mode: 'autorretrato', showFaceFrame: true }, { state: 'PRONTO', candidate })

    expect(screen.getAllByTestId('face-frame')).toHaveLength(1)
  })
})
