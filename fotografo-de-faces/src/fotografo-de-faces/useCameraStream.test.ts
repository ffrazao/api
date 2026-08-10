import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCameraStream } from './useCameraStream'
import type { UseCameraStreamOptions } from './useCameraStream'

function createFakeStream(trackCount = 2) {
  const tracks = Array.from({ length: trackCount }, () => ({
    stop: vi.fn(),
    kind: 'video',
  })) as unknown as MediaStreamTrack[]
  const stream = { getTracks: () => tracks } as unknown as MediaStream
  return { stream, tracks }
}

function browserError(name: string): DOMException {
  return new DOMException(`simulated ${name}`, name)
}

describe('useCameraStream — aquisição e limpeza (§05.11 crit. 1/11/12)', () => {
  it('adquire o stream com sucesso, sinaliza DETECTION_STARTED e encerra todas as tracks ao desmontar', async () => {
    const { stream: fakeStream, tracks } = createFakeStream(2)
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream)
    const dispatch = vi.fn()

    const { result, unmount } = renderHook(() =>
      useCameraStream({
        state: 'AGUARDANDO',
        value: null,
        dispatch,
        mediaDevices: { getUserMedia },
      }),
    )

    await waitFor(() => expect(result.current.status).toBe('active'))

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(result.current.stream).toBe(fakeStream)
    expect(dispatch).toHaveBeenCalledWith({ type: 'DETECTION_STARTED' })

    unmount()

    for (const track of tracks) {
      expect(track.stop).toHaveBeenCalledTimes(1)
    }
  })

  it('não adquire o stream quando já há uma fotografia confirmada (§05.2 — value !== null)', () => {
    const getUserMedia = vi.fn().mockResolvedValue(createFakeStream(1).stream)
    const dispatch = vi.fn()

    renderHook(() =>
      useCameraStream({
        state: 'FOTOGRAFIA_PRONTA',
        value: new Blob(['foto']),
        dispatch,
        mediaDevices: { getUserMedia },
      }),
    )

    expect(getUserMedia).not.toHaveBeenCalled()
  })
})

describe('useCameraStream — não repetição de solicitação (§05.11 crit. 2/3)', () => {
  it('reencontrar AGUARDANDO com o stream já concedido não chama getUserMedia() de novo', async () => {
    const { stream: fakeStream } = createFakeStream(1)
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream)
    const dispatch = vi.fn()
    const initialProps: UseCameraStreamOptions = {
      state: 'AGUARDANDO',
      value: null,
      dispatch,
      mediaDevices: { getUserMedia },
    }

    const { result, rerender } = renderHook(
      (props: UseCameraStreamOptions) => useCameraStream(props),
      { initialProps },
    )

    await waitFor(() => expect(result.current.status).toBe('active'))
    expect(getUserMedia).toHaveBeenCalledTimes(1)

    // avança para DETECTANDO, depois a candidata é perdida e o ciclo volta
    // para AGUARDANDO (§06.4) — nenhuma dessas transições deve reabrir o prompt.
    rerender({ state: 'DETECTANDO', value: null, dispatch, mediaDevices: { getUserMedia } })
    rerender({ state: 'AGUARDANDO', value: null, dispatch, mediaDevices: { getUserMedia } })

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({ type: 'DETECTION_STARTED' })
  })
})

describe('useCameraStream — exclusividade (§05.11 crit. 4)', () => {
  it('não inicia uma segunda chamada a getUserMedia() enquanto a primeira ainda está pendente', async () => {
    let resolvePending: (stream: MediaStream) => void = () => {}
    const pending = new Promise<MediaStream>((resolve) => {
      resolvePending = resolve
    })
    const getUserMedia = vi.fn().mockReturnValue(pending)
    const initialProps: UseCameraStreamOptions = {
      state: 'AGUARDANDO',
      value: null,
      dispatch: vi.fn(),
      mediaDevices: { getUserMedia },
    }

    const { rerender } = renderHook(
      (props: UseCameraStreamOptions) => useCameraStream(props),
      { initialProps },
    )

    expect(getUserMedia).toHaveBeenCalledTimes(1)

    // Uma nova referência de dispatch força o efeito a rodar de novo enquanto
    // a chamada original ainda está pendente — não deve iniciar uma segunda.
    rerender({ state: 'AGUARDANDO', value: null, dispatch: vi.fn(), mediaDevices: { getUserMedia } })

    expect(getUserMedia).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePending(createFakeStream(1).stream)
      await pending
    })
  })
})

describe('useCameraStream — mapeamento de erros do navegador (§05.11 crit. 5/6/7)', () => {
  it('NotAllowedError → status "error" e razão "permissao-negada"', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(browserError('NotAllowedError'))
    const dispatch = vi.fn()

    const { result } = renderHook(() =>
      useCameraStream({ state: 'AGUARDANDO', value: null, dispatch, mediaDevices: { getUserMedia } }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.error?.reason).toBe('permissao-negada')
    expect(result.current.error?.message).toBeTruthy()
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CAMERA_ACCESS_FAILED', reason: 'permissao-negada' }),
    )
  })

  it('NotFoundError → status "error" e razão "dispositivo-ausente"', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(browserError('NotFoundError'))
    const dispatch = vi.fn()

    const { result } = renderHook(() =>
      useCameraStream({ state: 'AGUARDANDO', value: null, dispatch, mediaDevices: { getUserMedia } }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.error?.reason).toBe('dispositivo-ausente')
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CAMERA_ACCESS_FAILED', reason: 'dispositivo-ausente' }),
    )
  })

  it('NotReadableError → status "error" e razão "hardware-indisponivel"', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(browserError('NotReadableError'))
    const dispatch = vi.fn()

    const { result } = renderHook(() =>
      useCameraStream({ state: 'AGUARDANDO', value: null, dispatch, mediaDevices: { getUserMedia } }),
    )

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.error?.reason).toBe('hardware-indisponivel')
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CAMERA_ACCESS_FAILED', reason: 'hardware-indisponivel' }),
    )
  })
})
