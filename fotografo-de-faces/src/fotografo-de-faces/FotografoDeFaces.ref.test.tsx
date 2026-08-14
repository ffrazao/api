import { act, render, screen } from '@testing-library/react'
import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FotografoDeFaces } from './FotografoDeFaces'
import type { FotografoDeFacesHandle, FotografoDeFacesProps } from './FotografoDeFaces'
import { useFaceDetection } from './useFaceDetection'
import type { Candidate, FotografiaValue, FotografoDeFacesEvent, Quality } from './types'

// Este arquivo testa a API imperativa via ref (F7, §16): usa a máquina real
// (F1) por trás de um "host" controlado de verdade (useState), e só mocka a
// câmera (F2) e a detecção (F3) — capturando o `dispatch` que elas
// receberiam para simular sinais de detecção/captura sem hardware real.
// Mesmo padrão de FotografoDeFaces.review.test.tsx (F5).
vi.mock('./useCameraStream', () => ({
  useCameraStream: vi.fn(() => ({ stream: null, status: 'idle', error: null })),
}))
vi.mock('./useFaceDetection', () => ({
  useFaceDetection: vi.fn(() => ({
    status: 'idle',
    visibleFaces: [],
    // Este arquivo testa a API imperativa (F7), não a captura em si (F9) — um
    // valor fixo é só o suficiente para o componente ter algo para recortar.
    candidateBox: { x: 10, y: 10, width: 100, height: 100 },
  })),
}))
// A captura de verdade (F9) não roda em jsdom (sem Canvas 2D real) — nunca
// resolve aqui, então os testes só precisam observar a transição para
// CAPTURANDO, sem competir com o resultado assíncrono real.
vi.mock('./imageProcessor', () => ({
  capturePhotoBlob: vi.fn(() => new Promise(() => {})),
}))

function fakePhoto(label: string): Blob {
  return new Blob([label], { type: 'image/jpeg' })
}

function approvedQuality(): Quality {
  return {
    criteria: {
      enquadramento: true,
      distancia: true,
      pose: true,
      nitidez: true,
      iluminacao: true,
      estabilidade: true,
      posicionamento: true,
    },
    aprovada: true,
  }
}

const candidate: Candidate = { id: 'candidata-1' }

function latestDispatch(): (event: FotografoDeFacesEvent) => void {
  const calls = vi.mocked(useFaceDetection).mock.calls
  const dispatch = calls[calls.length - 1]?.[0]?.dispatch
  if (!dispatch) throw new Error('useFaceDetection ainda não foi chamado')
  return dispatch
}

/** Conduz a máquina de AGUARDANDO até PRONTO via os mesmos sinais que a detecção real dispararia. */
function driveToReady() {
  const dispatch = latestDispatch()
  act(() => {
    dispatch({ type: 'DETECTION_STARTED' })
    dispatch({ type: 'CANDIDATE_DETECTED', candidate })
    dispatch({ type: 'QUALITY_CHANGED', quality: approvedQuality() })
  })
}

/** Host controlado de verdade: dono do `value`, repassa via props como uma aplicação faria (§15.2/§15.3). */
function Host(
  props: Omit<FotografoDeFacesProps, 'value' | 'onChange'> & {
    initialValue: FotografiaValue
    refHandle: React.Ref<FotografoDeFacesHandle>
    onChangeSpy?: (value: FotografiaValue) => void
  },
) {
  const { initialValue, refHandle, onChangeSpy, ...rest } = props
  const [value, setValue] = useState<FotografiaValue>(initialValue)
  return (
    <FotografoDeFaces
      ref={refHandle}
      value={value}
      onChange={(next) => {
        onChangeSpy?.(next)
        setValue(next)
      }}
      {...rest}
    />
  )
}

describe('FotografoDeFaces (ref) — capture() imperativo (§16.2, §16.6, §16.11)', () => {
  it('fora de PRONTO, não faz nada e não lança exceção', () => {
    const ref = createRef<FotografoDeFacesHandle>()
    render(<Host initialValue={null} refHandle={ref} autoCaptureAfter={null} />)

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
    expect(() => act(() => ref.current?.capture())).not.toThrow()
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
  })

  it('em PRONTO, inicia o ciclo de captura (estado avança para CAPTURANDO)', () => {
    const ref = createRef<FotografoDeFacesHandle>()
    render(<Host initialValue={null} refHandle={ref} autoCaptureAfter={null} />)

    driveToReady()
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'PRONTO')

    act(() => ref.current?.capture())

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'CAPTURANDO')
  })
})

describe('FotografoDeFaces (ref) — restart() imperativo (§16.3, §19.18)', () => {
  it('volta para AGUARDANDO preservando value e sem disparar onChange', () => {
    const original = fakePhoto('original')
    const ref = createRef<FotografoDeFacesHandle>()
    const onChangeSpy = vi.fn()
    render(<Host initialValue={original} refHandle={ref} onChangeSpy={onChangeSpy} autoCaptureAfter={null} />)

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'FOTOGRAFIA_PRONTA')

    act(() => ref.current?.restart())

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
    expect(onChangeSpy).not.toHaveBeenCalled()
    expect(ref.current?.getValue()).toBe(original)
  })

  it('abandona um ciclo em andamento (ex.: AVALIANDO) e devolve a AGUARDANDO', () => {
    const ref = createRef<FotografoDeFacesHandle>()
    render(<Host initialValue={null} refHandle={ref} autoCaptureAfter={null} />)

    const dispatch = latestDispatch()
    act(() => {
      dispatch({ type: 'DETECTION_STARTED' })
      dispatch({ type: 'CANDIDATE_DETECTED', candidate })
    })
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AVALIANDO')

    act(() => ref.current?.restart())

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
  })
})

describe('FotografoDeFaces (ref) — consultas de estado (§16.5–§16.9)', () => {
  it('getState()/getValue()/getMessage()/getQuality()/getTimer() refletem o snapshot atual', () => {
    const ref = createRef<FotografoDeFacesHandle>()
    render(<Host initialValue={null} refHandle={ref} autoCaptureAfter={3} reviewFor={null} mode="assistido" />)

    driveToReady()

    const state = ref.current!.getState()
    expect(state.state).toBe('CRONOMETRANDO')
    expect(state.timer).toEqual({ totalSeconds: 3, remainingSeconds: 3, suspended: false })
    expect(state.quality?.aprovada).toBe(true)
    expect(state.candidate).toEqual(candidate)
    expect(state.mode).toBe('assistido')
    expect(state.value).toBeNull()

    expect(ref.current!.getValue()).toBeNull()
    expect(ref.current!.getMessage()).toBe(state.message)
    expect(ref.current!.getQuality()).toEqual(state.quality)
    expect(ref.current!.getTimer()).toEqual(state.timer)
  })

  it('getQuality()/getTimer() retornam null quando não há candidata/cronômetro ativos', () => {
    const ref = createRef<FotografoDeFacesHandle>()
    render(<Host initialValue={null} refHandle={ref} autoCaptureAfter={null} />)

    expect(ref.current!.getQuality()).toBeNull()
    expect(ref.current!.getTimer()).toBeNull()
  })
})

describe('FotografoDeFaces (ref) — setFullscreen (§16.4)', () => {
  it('não lança exceção ao ligar/desligar, mesmo sem suporte real à Fullscreen API no teste', () => {
    const ref = createRef<FotografoDeFacesHandle>()
    render(<Host initialValue={null} refHandle={ref} autoCaptureAfter={null} />)

    expect(() => act(() => ref.current?.setFullscreen(true))).not.toThrow()
    expect(() => act(() => ref.current?.setFullscreen(false))).not.toThrow()
  })
})

describe('FotografoDeFaces (ref) — getRollbackValue()/rollbackValue (§16.5, emenda v1.1)', () => {
  it('acompanha o ciclo de vida do value_rollback durante uma troca', () => {
    const original = fakePhoto('original')
    const nova = fakePhoto('nova')
    const ref = createRef<FotografoDeFacesHandle>()

    render(<Host initialValue={original} refHandle={ref} autoCaptureAfter={null} reviewFor={3000} />)

    // Sem alteração em andamento não há rollback (§13.10).
    expect(ref.current?.getRollbackValue()).toBeNull()
    expect(ref.current?.getState().rollbackValue).toBeNull()

    act(() => {
      screen.getByTestId('trocar-button').click()
    })

    // §13.10: `value = null` + `value_rollback = Foto A` — alteração em
    // andamento, ainda sem nova fotografia atribuída.
    expect(ref.current?.getValue()).toBeNull()
    expect(ref.current?.getRollbackValue()).toBe(original)

    driveToReady()
    act(() => {
      ref.current?.capture()
      latestDispatch()({ type: 'CAPTURE_SUCCEEDED', value: nova })
    })

    // §13.10: `Blob` + `Blob` — é esta combinação que permite ao hospedeiro
    // montar "Foto Anterior" × "Nova Captura".
    expect(ref.current?.getValue()).toBe(nova)
    expect(ref.current?.getRollbackValue()).toBe(original)
    expect(ref.current?.getState().rollbackValue).toBe(original)

    act(() => {
      screen.getByTestId('confirmar-button').click()
    })
    expect(ref.current?.getRollbackValue()).toBeNull()
  })

  it('a leitura não abre caminho de escrita: mexer no snapshot não altera o rollback', () => {
    const original = fakePhoto('original')
    const ref = createRef<FotografoDeFacesHandle>()

    render(<Host initialValue={original} refHandle={ref} autoCaptureAfter={null} reviewFor={3000} />)
    act(() => {
      screen.getByTestId('trocar-button').click()
    })

    const snapshot = ref.current!.getState()
    snapshot.rollbackValue = fakePhoto('intrusa')

    // §20.7: o snapshot é uma cópia — o ciclo de vida do rollback segue
    // exclusivamente sob controle interno do componente.
    expect(ref.current?.getRollbackValue()).toBe(original)
    expect(ref.current?.getState().rollbackValue).toBe(original)
  })
})

describe('FotografoDeFaces (ref) — superfície mínima (§16.10, §16.11)', () => {
  it('não expõe nenhum método para forçar estado/captura por fora da máquina', () => {
    const ref = createRef<FotografoDeFacesHandle>()
    render(<Host initialValue={null} refHandle={ref} autoCaptureAfter={null} />)

    const methods = Object.keys(ref.current ?? {})
    expect(methods.sort()).toEqual(
      [
        'capture',
        'getMessage',
        'getQuality',
        // §16.5 (emenda v1.1): leitura do rollback — nenhum par de escrita
        // acompanha (não existe setRollbackValue()).
        'getRollbackValue',
        'getState',
        'getTimer',
        'getValue',
        'restart',
        'setFullscreen',
      ].sort(),
    )
  })
})
