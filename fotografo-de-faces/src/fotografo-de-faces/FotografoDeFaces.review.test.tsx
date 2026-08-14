import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FotografoDeFaces } from './FotografoDeFaces'
import type { FotografoDeFacesProps } from './FotografoDeFaces'
import { useFaceDetection } from './useFaceDetection'
import type { Candidate, FotografiaValue, FotografoDeFacesEvent, Quality } from './types'

// Este arquivo testa o CONTRATO CONTROLADO e o fluxo de revisão de ponta a
// ponta (F5): usa a máquina real (F1) por trás de um "host" que implementa
// value/onChange como uma aplicação de verdade faria (useState), e só mocka
// a câmera (F2) e a detecção (F3) — que exigiriam hardware real —,
// capturando o `dispatch` que elas receberiam para simular sinais de
// detecção/captura sem precisar de um pipeline de câmera de verdade.
vi.mock('./useCameraStream', () => ({
  useCameraStream: vi.fn(() => ({ stream: null, status: 'idle', error: null })),
}))
vi.mock('./useFaceDetection', () => ({
  useFaceDetection: vi.fn(() => ({
    status: 'idle',
    visibleFaces: [],
    // Este arquivo testa o fluxo de revisão (F5), não a captura em si (F9) —
    // um valor fixo é só o suficiente para o componente ter algo para
    // recortar; o resultado real da captura é simulado via CAPTURE_SUCCEEDED
    // despachado manualmente em produceNewCapture() abaixo.
    candidateBox: { x: 10, y: 10, width: 100, height: 100 },
  })),
}))
// A captura de verdade (F9) não roda em jsdom (sem Canvas 2D real) — nunca
// resolve aqui, para nunca competir com o CAPTURE_SUCCEEDED manual dos testes.
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

/** Host controlado de verdade: dono do `value`, repassa via props como uma aplicação faria (§15.2/§15.3). */
function Host(
  props: Omit<FotografoDeFacesProps, 'value' | 'onChange'> & {
    initialValue: FotografiaValue
    onChangeSpy?: (value: FotografiaValue) => void
  },
) {
  const { initialValue, onChangeSpy, ...rest } = props
  const [value, setValue] = useState<FotografiaValue>(initialValue)
  return (
    <FotografoDeFaces
      value={value}
      onChange={(next) => {
        onChangeSpy?.(next)
        setValue(next)
      }}
      {...rest}
    />
  )
}

/** Conduz a máquina de AGUARDANDO até PRONTO e efetiva uma nova captura manual. */
function produceNewCapture(novaFoto: Blob) {
  const dispatch = latestDispatch()
  act(() => {
    dispatch({ type: 'DETECTION_STARTED' })
    dispatch({ type: 'CANDIDATE_DETECTED', candidate })
    dispatch({ type: 'QUALITY_CHANGED', quality: approvedQuality() })
  })
  fireEvent.click(screen.getByTestId('capture-button'))
  act(() => {
    dispatch({ type: 'CAPTURE_SUCCEEDED', value: novaFoto })
  })
}

// Reprodução da Divergência #1 do "Registro de Divergências Conhecidas"
// (docs/especificacao-formal.md): §04.9, §04.10 e §20.7 mostram, nos três
// diagramas, [Confirmar]/[Cancelar] SEMPRE depois de "nova captura" — nunca no
// instante do clique em Trocar/Limpar. A diferença entre as duas ações "está
// apenas na intenção inicial" (§04.10), então a regra vale igual para as duas.
describe('FotografoDeFaces — Confirmar/Cancelar só depois de uma nova captura (§04.9, §04.10, §20.7)', () => {
  it('Trocar não revela Confirmar/Cancelar antes da nova captura', () => {
    render(<Host initialValue={fakePhoto('original')} autoCaptureAfter={null} reviewFor={3000} />)

    fireEvent.click(screen.getByTestId('trocar-button'))

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
    expect(screen.queryByTestId('confirmar-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cancelar-button')).not.toBeInTheDocument()
  })

  it('Limpar não revela Confirmar/Cancelar antes da nova captura (mesma regra de Trocar)', () => {
    render(<Host initialValue={fakePhoto('original')} autoCaptureAfter={null} reviewFor={3000} />)

    fireEvent.click(screen.getByTestId('limpar-button'))

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
    expect(screen.queryByTestId('confirmar-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cancelar-button')).not.toBeInTheDocument()
  })

  it.each([['trocar-button'], ['limpar-button']])(
    '%s: os botões aparecem assim que a nova captura é consolidada',
    (acao) => {
      render(<Host initialValue={fakePhoto('original')} autoCaptureAfter={null} reviewFor={3000} />)

      fireEvent.click(screen.getByTestId(acao))
      expect(screen.queryByTestId('confirmar-button')).not.toBeInTheDocument()

      produceNewCapture(fakePhoto('nova'))

      expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'FOTOGRAFIA_PRONTA')
      expect(screen.getByTestId('confirmar-button')).toBeInTheDocument()
      expect(screen.getByTestId('cancelar-button')).toBeInTheDocument()
    },
  )

  it('durante a operação em andamento, Trocar/Limpar não reaparecem para sobrescrever o rollback', () => {
    render(<Host initialValue={fakePhoto('original')} autoCaptureAfter={null} reviewFor={3000} />)

    fireEvent.click(screen.getByTestId('trocar-button'))

    expect(screen.queryByTestId('trocar-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('limpar-button')).not.toBeInTheDocument()
  })
})

describe('FotografoDeFaces — inicialização com value preenchido (§5.1, §13.4)', () => {
  it('carrega direto em FOTOGRAFIA_PRONTA e mostra Trocar/Limpar, sem Confirmar/Cancelar', () => {
    const original = fakePhoto('original')
    render(<Host initialValue={original} autoCaptureAfter={null} reviewFor={3000} />)

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'FOTOGRAFIA_PRONTA')
    expect(screen.getByTestId('trocar-button')).toBeInTheDocument()
    expect(screen.getByTestId('limpar-button')).toBeInTheDocument()
    expect(screen.queryByTestId('confirmar-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cancelar-button')).not.toBeInTheDocument()
  })

  it('não mostra nenhuma ação de revisão quando reviewFor é null', () => {
    const original = fakePhoto('original')
    render(<Host initialValue={original} autoCaptureAfter={null} reviewFor={null} />)

    expect(screen.queryByTestId('review-actions')).not.toBeInTheDocument()
  })
})

describe('FotografoDeFaces — Trocar -> onChange(null) -> captura -> onChange(novaFoto) -> Confirmar (§13.5)', () => {
  it('percorre o ciclo completo e consolida a nova foto', () => {
    const original = fakePhoto('original')
    render(<Host initialValue={original} autoCaptureAfter={null} reviewFor={3000} />)

    fireEvent.click(screen.getByTestId('trocar-button'))

    // onChange(null) já levou o componente de volta a buscar uma nova candidata.
    // Nenhuma decisão é oferecida ainda: não há o que confirmar antes da nova
    // captura (§04.9, §20.7).
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
    expect(screen.queryByTestId('review-actions')).not.toBeInTheDocument()

    const novaFoto = fakePhoto('nova')
    produceNewCapture(novaFoto)

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'FOTOGRAFIA_PRONTA')
    expect(screen.getByTestId('confirmar-button')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('confirmar-button'))

    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'FOTOGRAFIA_PRONTA')
    expect(screen.getByTestId('trocar-button')).toBeInTheDocument()
    expect(screen.queryByTestId('confirmar-button')).not.toBeInTheDocument()
  })
})

describe('FotografoDeFaces — onChange nunca é reemitido em eco redundante (§15.2, §15.3)', () => {
  it('cada mudança de valor dispara onChange exatamente uma vez, mesmo após o eco da aplicação', () => {
    const original = fakePhoto('original')
    const onChangeSpy = vi.fn()
    render(<Host initialValue={original} onChangeSpy={onChangeSpy} autoCaptureAfter={null} reviewFor={3000} />)

    fireEvent.click(screen.getByTestId('trocar-button'))
    expect(onChangeSpy).toHaveBeenCalledTimes(1)
    expect(onChangeSpy).toHaveBeenLastCalledWith(null)

    const novaFoto = fakePhoto('nova')
    produceNewCapture(novaFoto)
    expect(onChangeSpy).toHaveBeenCalledTimes(2)
    expect(onChangeSpy).toHaveBeenLastCalledWith(novaFoto)

    fireEvent.click(screen.getByTestId('confirmar-button'))
    // confirmar() não propõe nenhum valor novo — o total continua em 2.
    expect(onChangeSpy).toHaveBeenCalledTimes(2)
  })
})

describe('FotografoDeFaces — Trocar -> nova captura -> Cancelar (§13.7)', () => {
  it('reemite onChange(fotoOriginal) e volta a exibi-la', () => {
    const original = fakePhoto('original')
    const onChangeSpy = vi.fn()
    render(<Host initialValue={original} onChangeSpy={onChangeSpy} autoCaptureAfter={null} reviewFor={3000} />)

    fireEvent.click(screen.getByTestId('trocar-button'))
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')

    // Cancelar só entra em cena depois que existe uma nova captura para
    // descartar (§04.9, §20.7).
    produceNewCapture(fakePhoto('nova'))
    fireEvent.click(screen.getByTestId('cancelar-button'))

    expect(onChangeSpy).toHaveBeenLastCalledWith(original)
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'FOTOGRAFIA_PRONTA')
    expect(screen.getByTestId('trocar-button')).toBeInTheDocument()
    expect(screen.queryByTestId('confirmar-button')).not.toBeInTheDocument()
  })
})

describe('FotografoDeFaces — Limpar -> onChange(null) (§13.8, §04.10)', () => {
  it('a limpeza já é efetivada no clique; a decisão só volta com uma nova captura', () => {
    const original = fakePhoto('original')
    const onChangeSpy = vi.fn()
    render(<Host initialValue={original} onChangeSpy={onChangeSpy} autoCaptureAfter={null} reviewFor={3000} />)

    fireEvent.click(screen.getByTestId('limpar-button'))

    // O componente já opera sem fotografia — a limpeza não fica "pendente" de
    // Confirmar; o que fica pendente é apenas o rollback interno.
    expect(onChangeSpy).toHaveBeenLastCalledWith(null)
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
    expect(screen.queryByTestId('review-actions')).not.toBeInTheDocument()

    // Mesma regra de Trocar: os botões aparecem quando houver o que decidir.
    produceNewCapture(fakePhoto('nova'))
    expect(screen.getByTestId('confirmar-button')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('confirmar-button'))
    expect(screen.getByTestId('trocar-button')).toBeInTheDocument()
  })
})

describe('FotografoDeFaces — expiração de reviewFor > 0 (§4.15)', () => {
  it('confirma automaticamente quando o tempo expira enquanto Confirmar/Cancelar estão ativos', () => {
    vi.useFakeTimers()
    try {
      const original = fakePhoto('original')
      render(<Host initialValue={original} autoCaptureAfter={null} reviewFor={1000} />)

      fireEvent.click(screen.getByTestId('trocar-button'))
      produceNewCapture(fakePhoto('nova'))
      expect(screen.getByTestId('confirmar-button')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(screen.queryByTestId('confirmar-button')).not.toBeInTheDocument()
      expect(screen.getByTestId('trocar-button')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('reviewFor = 0 não expira sozinho', () => {
    vi.useFakeTimers()
    try {
      const original = fakePhoto('original')
      render(<Host initialValue={original} autoCaptureAfter={null} reviewFor={0} />)

      fireEvent.click(screen.getByTestId('trocar-button'))
      produceNewCapture(fakePhoto('nova'))

      act(() => {
        vi.advanceTimersByTime(60_000)
      })

      expect(screen.getByTestId('confirmar-button')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
