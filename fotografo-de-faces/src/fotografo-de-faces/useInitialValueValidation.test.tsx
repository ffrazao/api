import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FotografoDeFaces } from './FotografoDeFaces'
import type { FotografoDeFacesHandle, FotografoDeFacesProps } from './FotografoDeFaces'
import { useFaceDetection } from './useFaceDetection'
import { useInitialValueValidation } from './useInitialValueValidation'
import type { DetectedFace, FaceDetector } from './faceDetector'
import type { FotografiaValue, FotografoDeFacesEvent } from './types'

/**
 * Validação passiva do valor inicial — §05.1.1 (emenda v1.1).
 *
 * A face-api.js real não roda em jsdom (sem WebGL, sem canvas de verdade e sem
 * os pesos dos modelos), e um `<img>` de jsdom nunca dispara `load` para uma
 * URL `blob:` — por isso o detector e a decodificação são injetados no hook. O
 * que se verifica é a POLÍTICA (uma única passagem, critério de exatamente uma
 * face, fotografia preservada), nunca a inferência em si.
 */
vi.mock('./useCameraStream', () => ({
  useCameraStream: vi.fn(() => ({ stream: null, status: 'idle', error: null })),
}))
vi.mock('./useFaceDetection', () => ({
  useFaceDetection: vi.fn(() => ({ status: 'idle', visibleFaces: [], candidateBox: null })),
}))
// O componente monta o hook de verdade; nos testes de INTEGRAÇÃO abaixo o
// interesse é a reação da máquina ao veredito, então a passagem passiva é
// neutralizada e o evento é despachado à mão.
vi.mock('./useInitialValueValidation', () => ({ useInitialValueValidation: vi.fn() }))

const { useInitialValueValidation: hookReal } =
  await vi.importActual<typeof import('./useInitialValueValidation')>('./useInitialValueValidation')

function fakePhoto(label = 'inicial'): Blob {
  return new Blob([label], { type: 'image/jpeg' })
}

function face(x: number): DetectedFace {
  return { box: { x, y: 0, width: 100, height: 100 }, landmarks: [] }
}

function detectorQueDevolve(faces: DetectedFace[], overrides: Partial<FaceDetector> = {}): FaceDetector {
  return {
    loadModels: vi.fn(async () => {}),
    detect: vi.fn(async () => faces),
    ...overrides,
  }
}

/** Decodificação instantânea, sem `<img>` nem URL de objeto — jsdom não completa nenhum dos dois. */
function decodeFalso() {
  const release = vi.fn()
  const decodeImage = vi.fn(async () => ({ input: document.createElement('canvas'), release }))
  return { decodeImage, release }
}

describe('useInitialValueValidation — passagem única sobre o Blob fornecido (§05.1.1)', () => {
  it('exatamente uma face: aprova em silêncio, sem despachar nada', async () => {
    const dispatch = vi.fn()
    const detector = detectorQueDevolve([face(10)])
    const { decodeImage } = decodeFalso()

    renderHook(() => hookReal({ value: fakePhoto(), dispatch, detector, decodeImage }))

    await waitFor(() => expect(detector.detect).toHaveBeenCalledTimes(1))
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('nenhuma face: despacha INITIAL_VALUE_REJECTED com o próprio Blob avaliado', async () => {
    const dispatch = vi.fn()
    const foto = fakePhoto()
    const { decodeImage } = decodeFalso()

    renderHook(() => hookReal({ value: foto, dispatch, detector: detectorQueDevolve([]), decodeImage }))

    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1))
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'INITIAL_VALUE_REJECTED', value: foto }))
  })

  it('mais de uma face também reprova — não há como saber de quem é a fotografia', async () => {
    const dispatch = vi.fn()
    const { decodeImage } = decodeFalso()

    renderHook(() =>
      hookReal({ value: fakePhoto(), dispatch, detector: detectorQueDevolve([face(10), face(300)]), decodeImage }),
    )

    await waitFor(() => expect(dispatch).toHaveBeenCalledTimes(1))
    expect(dispatch.mock.calls[0][0].type).toBe('INITIAL_VALUE_REJECTED')
  })

  it('value nulo: nenhuma validação é sequer iniciada', () => {
    const dispatch = vi.fn()
    const detector = detectorQueDevolve([])
    const { decodeImage } = decodeFalso()

    renderHook(() => hookReal({ value: null, dispatch, detector, decodeImage }))

    expect(detector.loadModels).not.toHaveBeenCalled()
    expect(decodeImage).not.toHaveBeenCalled()
  })

  it('valida só o valor da montagem — um `value` novo não dispara outra passagem', async () => {
    const dispatch = vi.fn()
    const detector = detectorQueDevolve([face(10)])
    const { decodeImage } = decodeFalso()

    const { rerender } = renderHook(
      (props: { value: FotografiaValue }) => hookReal({ ...props, dispatch, detector, decodeImage }),
      { initialProps: { value: fakePhoto('inicial') } },
    )

    await waitFor(() => expect(detector.detect).toHaveBeenCalledTimes(1))

    rerender({ value: fakePhoto('outra') })
    await waitFor(() => expect(detector.detect).toHaveBeenCalledTimes(1))
  })

  it('libera a URL de objeto da imagem decodificada mesmo quando aprova', async () => {
    const { decodeImage, release } = decodeFalso()

    renderHook(() =>
      hookReal({ value: fakePhoto(), dispatch: vi.fn(), detector: detectorQueDevolve([face(10)]), decodeImage }),
    )

    await waitFor(() => expect(release).toHaveBeenCalled())
  })

  it('falha de infraestrutura não é reprovação: nada é despachado (§18.13)', async () => {
    const dispatch = vi.fn()
    const detector = detectorQueDevolve([], {
      loadModels: vi.fn(async () => {
        throw new Error('modelos indisponíveis')
      }),
    })
    const { decodeImage } = decodeFalso()
    const avisos = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      renderHook(() => hookReal({ value: fakePhoto(), dispatch, detector, decodeImage }))

      await waitFor(() => expect(detector.loadModels).toHaveBeenCalled())
      expect(dispatch).not.toHaveBeenCalled()
      // §18.12: o problema é anunciado em desenvolvimento em vez de sumir.
      expect(avisos).toHaveBeenCalled()
    } finally {
      avisos.mockRestore()
    }
  })
})

function Host(
  props: Omit<FotografoDeFacesProps, 'value' | 'onChange'> & {
    initialValue: FotografiaValue
    onChangeSpy?: (value: FotografiaValue) => void
    refHandle?: React.Ref<FotografoDeFacesHandle>
  },
) {
  const { initialValue, onChangeSpy, refHandle, ...rest } = props
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

function estado(): string | null {
  return screen.getByTestId('fotografo-de-faces').getAttribute('data-state')
}

function latestDispatch(): (event: FotografoDeFacesEvent) => void {
  const calls = vi.mocked(useFaceDetection).mock.calls
  const dispatch = calls[calls.length - 1]?.[0]?.dispatch
  if (!dispatch) throw new Error('useFaceDetection ainda não foi chamado')
  return dispatch
}

describe('FotografoDeFaces — reação ao valor inicial reprovado (§05.1.1, §18.12, §18.13)', () => {
  it('entra em ERRO expondo INVALID_INITIAL_VALUE por getState(), sem perder a fotografia', () => {
    const foto = fakePhoto()
    const ref = createRef<FotografoDeFacesHandle>()
    const onChangeSpy = vi.fn()

    render(<Host initialValue={foto} refHandle={ref} onChangeSpy={onChangeSpy} autoCaptureAfter={null} />)
    expect(estado()).toBe('FOTOGRAFIA_PRONTA')

    act(() => latestDispatch()({ type: 'INITIAL_VALUE_REJECTED', value: foto }))

    expect(estado()).toBe('ERRO')
    expect(ref.current?.getState().errorCode).toBe('INVALID_INITIAL_VALUE')
    // §18.13/§18.14: a fotografia continua em mãos e nenhum valor novo é proposto.
    expect(ref.current?.getValue()).toBe(foto)
    expect(onChangeSpy).not.toHaveBeenCalled()
  })

  it('item 4 — com reviewFor ligado, Trocar/Limpar continuam disponíveis para sair do erro', () => {
    const foto = fakePhoto()
    render(<Host initialValue={foto} autoCaptureAfter={null} reviewFor={3000} />)

    act(() => latestDispatch()({ type: 'INITIAL_VALUE_REJECTED', value: foto }))

    expect(estado()).toBe('ERRO')
    expect(screen.getByTestId('trocar-button')).toBeInTheDocument()
    expect(screen.getByTestId('limpar-button')).toBeInTheDocument()
  })

  it('o hook é montado com o `value` e o `modelsUrl` que o componente recebeu', () => {
    render(<Host initialValue={fakePhoto()} autoCaptureAfter={null} modelsUrl="/modelos-de-teste" />)

    expect(vi.mocked(useInitialValueValidation)).toHaveBeenCalledWith(
      expect.objectContaining({ modelsUrl: '/modelos-de-teste' }),
    )
  })
})
