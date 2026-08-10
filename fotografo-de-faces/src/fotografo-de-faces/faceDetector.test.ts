import { beforeEach, describe, expect, it, vi } from 'vitest'

// A face-api.js é mockada para contar quantas vezes os pesos são realmente
// carregados. Cada `loadFromUri` baixa 2 arquivos (manifesto + shard), e são
// 2 redes (TinyFaceDetector + FaceLandmark68Net) — ou seja, um ciclo completo
// de carregamento = 2 chamadas de `loadFromUri` = 4 requisições de rede.
vi.mock('face-api.js', () => ({
  nets: {
    tinyFaceDetector: { loadFromUri: vi.fn(() => Promise.resolve()) },
    faceLandmark68Net: { loadFromUri: vi.fn(() => Promise.resolve()) },
  },
  detectAllFaces: vi.fn(),
  TinyFaceDetectorOptions: class {},
}))

/**
 * A memoização do carregamento vive no escopo do MÓDULO (é isso que corrige o
 * bug de rebaixar os pesos a cada montagem). Para isolar os testes entre si,
 * cada um recarrega o módulo do zero em vez de expor um "reset" só para teste
 * na API de produção.
 */
async function setup() {
  vi.resetModules()
  const faceapi = await import('face-api.js')
  const { createFaceApiDetector } = await import('./faceDetector')

  const tiny = vi.mocked(faceapi.nets.tinyFaceDetector.loadFromUri)
  const landmarks = vi.mocked(faceapi.nets.faceLandmark68Net.loadFromUri)

  /** Requisições de rede equivalentes: cada `loadFromUri` busca manifesto + shard. */
  const networkRequestCount = () => (tiny.mock.calls.length + landmarks.mock.calls.length) * 2

  return { createFaceApiDetector, tiny, landmarks, networkRequestCount }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createFaceApiDetector — carregamento dos pesos', () => {
  it('carrega os pesos uma única vez para o mesmo detector, mesmo com chamadas repetidas', async () => {
    const { createFaceApiDetector, networkRequestCount } = await setup()
    const detector = createFaceApiDetector()

    await detector.loadModels('/models')
    await detector.loadModels('/models')
    await detector.loadModels('/models')

    expect(networkRequestCount()).toBe(4)
  })

  it('deduplica chamadas concorrentes ao mesmo caminho de modelos', async () => {
    const { createFaceApiDetector, networkRequestCount } = await setup()
    const detector = createFaceApiDetector()

    await Promise.all([detector.loadModels('/models'), detector.loadModels('/models')])

    expect(networkRequestCount()).toBe(4)
  })

  /**
   * O ponto central do bug relatado: `faceapi.nets.*` são singletons de
   * MÓDULO, mas a memoização vivia no closure de CADA detector. Como o
   * componente cria um detector por montagem, cada montagem rebaixava os
   * mesmos pesos e reinicializava as mesmas redes globais — concorrentemente
   * quando várias instâncias montavam juntas (ex.: a página de Docs do
   * Storybook, que monta todas as histórias ao mesmo tempo).
   */
  it('vários detectores compartilham o mesmo carregamento — os pesos não são rebaixados por instância', async () => {
    const { createFaceApiDetector, networkRequestCount } = await setup()
    const primeiro = createFaceApiDetector()
    const segundo = createFaceApiDetector()
    const terceiro = createFaceApiDetector()

    await Promise.all([primeiro.loadModels('/models'), segundo.loadModels('/models'), terceiro.loadModels('/models')])

    expect(networkRequestCount()).toBe(4)
  })

  it('um detector criado depois do carregamento não dispara novo download', async () => {
    const { createFaceApiDetector, networkRequestCount } = await setup()

    await createFaceApiDetector().loadModels('/models')
    expect(networkRequestCount()).toBe(4)

    await createFaceApiDetector().loadModels('/models')
    expect(networkRequestCount()).toBe(4)
  })

  it('uma falha de carregamento não fica em cache: a tentativa seguinte volta a tentar', async () => {
    const { createFaceApiDetector, tiny, networkRequestCount } = await setup()
    tiny.mockRejectedValueOnce(new Error('rede indisponível'))

    await expect(createFaceApiDetector().loadModels('/models')).rejects.toThrow('rede indisponível')

    await expect(createFaceApiDetector().loadModels('/models')).resolves.toBeUndefined()
    expect(networkRequestCount()).toBe(8)
  })

  it('caminhos de modelos diferentes são carregados separadamente', async () => {
    const { createFaceApiDetector, networkRequestCount } = await setup()

    await createFaceApiDetector().loadModels('/models')
    await createFaceApiDetector().loadModels('/outro-caminho')

    expect(networkRequestCount()).toBe(8)
  })
})
