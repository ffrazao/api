import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FaceDetector } from './faceDetector'
import { useFaceDetection } from './useFaceDetection'
import type { UseFaceDetectionOptions } from './useFaceDetection'

/**
 * Regressão do bug de remontagem/recarregamento repetido dos modelos:
 * `loadModels()` precisa ser chamado exatamente uma vez por ciclo de
 * montagem/desmontagem do hook — nunca a cada render.
 */

const FRAME = { width: 640, height: 480 }

function fakeVideo(): HTMLVideoElement {
  return { videoWidth: FRAME.width, videoHeight: FRAME.height } as unknown as HTMLVideoElement
}

function createCountingDetector(): { detector: FaceDetector; loadModels: ReturnType<typeof vi.fn> } {
  const loadModels = vi.fn().mockResolvedValue(undefined)
  return { detector: { loadModels, detect: vi.fn().mockResolvedValue([]) }, loadModels }
}

function baseOptions(detector: FaceDetector): UseFaceDetectionOptions {
  return {
    videoElement: fakeVideo(),
    state: 'DETECTANDO',
    value: null,
    dispatch: vi.fn(),
    detector,
    sampleFaceImageData: () => ({ data: new Uint8ClampedArray(0), width: 0, height: 0 }),
    // Agendador manual: nada roda sozinho, então o teste isola o carregamento.
    scheduleFrame: vi.fn(() => 1),
    cancelFrame: vi.fn(),
    now: () => 0,
  }
}

describe('useFaceDetection — ciclo de vida do carregamento de modelos', () => {
  it('chama loadModels() exatamente uma vez por montagem', async () => {
    const { detector, loadModels } = createCountingDetector()

    const { result } = renderHook(() => useFaceDetection(baseOptions(detector)))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(loadModels).toHaveBeenCalledTimes(1)
  })

  it('não recarrega os modelos a cada render (re-renders não disparam novo carregamento)', async () => {
    const { detector, loadModels } = createCountingDetector()
    const options = baseOptions(detector)

    const { result, rerender } = renderHook(() => useFaceDetection(options))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender()
    rerender()
    rerender()

    expect(loadModels).toHaveBeenCalledTimes(1)
  })

  it('não recarrega os modelos quando só o estado da máquina muda', async () => {
    const { detector, loadModels } = createCountingDetector()

    const { result, rerender } = renderHook(
      (props: UseFaceDetectionOptions) => useFaceDetection(props),
      { initialProps: baseOptions(detector) },
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ ...baseOptions(detector), state: 'AVALIANDO' })
    rerender({ ...baseOptions(detector), state: 'PRONTO' })

    expect(loadModels).toHaveBeenCalledTimes(1)
  })

  it('uma nova montagem chama loadModels() de novo — mas a dedupe real vive no detector (ver faceDetector.test.ts)', async () => {
    const { detector, loadModels } = createCountingDetector()

    const primeira = renderHook(() => useFaceDetection(baseOptions(detector)))
    await waitFor(() => expect(primeira.result.current.status).toBe('ready'))
    primeira.unmount()

    const segunda = renderHook(() => useFaceDetection(baseOptions(detector)))
    await waitFor(() => expect(segunda.result.current.status).toBe('ready'))
    segunda.unmount()

    expect(loadModels).toHaveBeenCalledTimes(2)
  })

  it('cancela o quadro agendado ao desmontar', async () => {
    const { detector } = createCountingDetector()
    const options = baseOptions(detector)

    const { result, unmount } = renderHook(() => useFaceDetection(options))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await waitFor(() => expect(options.scheduleFrame).toHaveBeenCalled())

    unmount()

    expect(options.cancelFrame).toHaveBeenCalled()
  })
})
