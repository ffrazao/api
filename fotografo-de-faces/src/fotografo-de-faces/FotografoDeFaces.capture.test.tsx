import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FotografoDeFaces } from './FotografoDeFaces'
import type { FotografoDeFacesProps } from './FotografoDeFaces'
import { capturePhotoBlob } from './imageProcessor'
import { useFaceDetection } from './useFaceDetection'
import type { Candidate, FotografiaValue, FotografoDeFacesEvent, Quality } from './types'

// Este arquivo testa a integração real da captura (F9): máquina real (F1) +
// câmera/detecção mockadas (F2/F3, com dispatch capturado) + `imageProcessor`
// mockado — já que jsdom não tem Canvas 2D de verdade, controlamos aqui o
// resultado de `capturePhotoBlob` para simular sucesso e falha de hardware.
vi.mock('./useCameraStream', () => ({
  useCameraStream: vi.fn(() => ({ stream: null, status: 'idle', error: null })),
}))
vi.mock('./useFaceDetection', () => ({
  useFaceDetection: vi.fn(() => ({
    status: 'idle',
    visibleFaces: [],
    candidateBox: { x: 40, y: 40, width: 200, height: 200 },
  })),
}))
vi.mock('./imageProcessor', () => ({
  capturePhotoBlob: vi.fn(),
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

describe('FotografoDeFaces — disparo bem-sucedido (§12, §17)', () => {
  it('retorna o Blob JPEG produzido via onChange, com o componente em FOTOGRAFIA_PRONTA', async () => {
    const novaFoto = fakePhoto('capturada')
    vi.mocked(capturePhotoBlob).mockResolvedValueOnce(novaFoto)
    const onChangeSpy = vi.fn()

    render(<Host initialValue={null} onChangeSpy={onChangeSpy} autoCaptureAfter={null} />)

    driveToReady()
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'PRONTO')

    fireEvent.click(screen.getByTestId('capture-button'))
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'CAPTURANDO')

    await waitFor(() =>
      expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'FOTOGRAFIA_PRONTA'),
    )

    // Esperar pelo próprio espião (e não só pelo estado no DOM): o onChange
    // sai de um efeito que roda depois do commit, então assertar direto aqui
    // criava uma corrida — o teste falhava de forma intermitente sob carga.
    await waitFor(() => expect(onChangeSpy).toHaveBeenCalledWith(novaFoto))
    const blobArg = onChangeSpy.mock.calls[onChangeSpy.mock.calls.length - 1][0] as Blob
    expect(blobArg.type).toBe('image/jpeg')
    expect(blobArg.size).toBeGreaterThan(0)

    // §12.1: recorta a partir do <video> ao vivo e da caixa da candidata travada.
    expect(capturePhotoBlob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ x: 40, y: 40, width: 200, height: 200 }),
    )
  })
})

describe('FotografoDeFaces — falha simulada de canvas (§18.6, §18.7, §18.11, §18.13, §18.14, §18.17)', () => {
  it('descarta o resultado, entra em ERRO e nunca dispara onChange(null) nem onChange(Blob)', async () => {
    vi.mocked(capturePhotoBlob).mockRejectedValueOnce(new Error('Estouro de memória no canvas'))
    const onChangeSpy = vi.fn()

    render(<Host initialValue={null} onChangeSpy={onChangeSpy} autoCaptureAfter={null} />)

    driveToReady()
    fireEvent.click(screen.getByTestId('capture-button'))
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'CAPTURANDO')

    await waitFor(() => expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'ERRO'))

    expect(onChangeSpy).not.toHaveBeenCalled()
  })

  it('protege rigorosamente a última fotografia confirmada — Cancelar continua disponível e restaura o original mesmo após a falha', async () => {
    const original = fakePhoto('original')
    vi.mocked(capturePhotoBlob).mockRejectedValueOnce(new Error('falha de hardware'))
    const onChangeSpy = vi.fn()

    render(
      <Host initialValue={original} onChangeSpy={onChangeSpy} autoCaptureAfter={null} reviewFor={3000} />,
    )

    // Trocar guarda o original em value_rollback (privado) e propõe null.
    fireEvent.click(screen.getByTestId('trocar-button'))
    expect(onChangeSpy).toHaveBeenCalledTimes(1)
    expect(onChangeSpy).toHaveBeenLastCalledWith(null)

    driveToReady()
    fireEvent.click(screen.getByTestId('capture-button'))

    await waitFor(() => expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'ERRO'))

    // A falha não deve ter proposto nenhum valor novo — nem null de novo, nem Blob.
    expect(onChangeSpy).toHaveBeenCalledTimes(1)

    // A janela de revisão sobrevive à falha: Cancelar continua disponível...
    expect(screen.getByTestId('cancelar-button')).toBeInTheDocument()

    // ...e ainda restaura a fotografia original perfeitamente intacta.
    fireEvent.click(screen.getByTestId('cancelar-button'))
    expect(onChangeSpy).toHaveBeenLastCalledWith(original)
  })

  it('permanece recuperável: restart() após a falha volta a AGUARDANDO', async () => {
    vi.mocked(capturePhotoBlob).mockRejectedValueOnce(new Error('falha pontual'))

    render(<Host initialValue={null} autoCaptureAfter={null} />)

    driveToReady()
    fireEvent.click(screen.getByTestId('capture-button'))
    await waitFor(() => expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'ERRO'))

    // CAPTURE_FAILED é despachado com recoverable (padrão true) — restart() deve funcionar.
    const dispatch = latestDispatch()
    act(() => dispatch({ type: 'RESTART_REQUESTED' }))
    expect(screen.getByTestId('fotografo-de-faces')).toHaveAttribute('data-state', 'AGUARDANDO')
  })
})
