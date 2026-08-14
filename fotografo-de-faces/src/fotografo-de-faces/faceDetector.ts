/**
 * Adaptador do motor de detecção — F3.
 *
 * Isola a `face-api.js` (Opção A) atrás de uma interface pequena (`FaceDetector`),
 * para que useFaceDetection.ts (e os testes) possam trabalhar com qualquer
 * implementação — inclusive uma falsa, alimentada com landmarks simulados,
 * já que não há como rodar inferência real da face-api.js num ambiente de
 * teste jsdom (sem WebGL/canvas real nem os arquivos de peso do modelo).
 */
import * as faceapi from 'face-api.js'
import type { BoundingBox, Point2D } from './faceMetrics'

export interface DetectedFace {
  box: BoundingBox
  /** Os 68 pontos de landmark, na ordem padrão da face-api.js. */
  landmarks: Point2D[]
}

/**
 * `HTMLImageElement` entrou na F12: a validação passiva do valor inicial
 * (§05.1.1) analisa um frame ESTÁTICO decodificado de um Blob, não o `<video>`
 * ao vivo. A face-api.js aceita os três igualmente.
 */
export type FaceDetectionInput = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement

export interface FaceDetector {
  /** Carrega os modelos necessários a partir de `modelsUrl`; idempotente. */
  loadModels(modelsUrl: string): Promise<void>
  /** Detecta faces (com landmarks) em um frame. Array vazio = nenhuma face. */
  detect(input: FaceDetectionInput): Promise<DetectedFace[]>
  /**
   * Aquecimento opcional do motor (§01 — não bloqueio): paga adiantado o custo
   * que só a PRIMEIRA inferência tem. Idempotente e sem efeito observável —
   * nunca alimenta a máquina de estados. Implementações de teste podem omitir.
   */
  warmUp?(): Promise<void>
}

/**
 * Carregamentos em andamento/concluídos, por caminho de modelos.
 *
 * Precisa viver no MÓDULO, e não no closure de cada detector: `faceapi.nets.*`
 * são singletons de módulo da própria face-api.js, então memoizar por
 * instância fazia cada montagem do componente rebaixar os mesmos pesos e
 * reinicializar as mesmas redes globais. Com várias instâncias montadas ao
 * mesmo tempo (a página de Docs do Storybook monta todas as histórias juntas),
 * os carregamentos ainda corriam em paralelo sobre o mesmo objeto de rede.
 */
const modelLoadsByUrl = new Map<string, Promise<void>>()

function loadFaceApiModels(modelsUrl: string): Promise<void> {
  const emAndamento = modelLoadsByUrl.get(modelsUrl)
  if (emAndamento) return emAndamento

  const carregamento = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelsUrl),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelsUrl),
  ]).then(() => undefined)

  // Uma falha NÃO fica em cache: sem isso, uma queda momentânea de rede
  // deixaria o componente permanentemente incapaz de carregar os modelos,
  // contrariando o tratamento recuperável de falhas das fases anteriores.
  const memoizado = carregamento.catch((cause) => {
    modelLoadsByUrl.delete(modelsUrl)
    throw cause
  })

  modelLoadsByUrl.set(modelsUrl, memoizado)
  return memoizado
}

/**
 * Aquecimento em andamento/concluído. Vive no MÓDULO pelo mesmo motivo do cache
 * de modelos acima: o que está sendo aquecido são as redes singleton da própria
 * face-api.js, então aquecer uma vez serve para qualquer instância do componente.
 */
let aquecimento: Promise<void> | null = null

/**
 * Compila os shaders WebGL antes de a detecção "de verdade" valer.
 *
 * A primeira inferência de cada carga de página custa uma ordem de grandeza a
 * mais que as seguintes (compilação de shaders + alocação de texturas), e esse
 * custo é pago na THREAD PRINCIPAL — era ele que congelava a interface bem no
 * início do ciclo, quando o usuário já está sendo orientado a se posicionar.
 * Aqui esse custo é pago cedo, sobre um canvas descartável: nenhuma face sai
 * daqui, nada é despachado, nada aparece na tela.
 */
function warmUpFaceApi(): Promise<void> {
  aquecimento ??= (async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 240
    const ctx = canvas.getContext('2d')
    if (ctx) {
      // Cinza liso: nunca produz detecção — só faz os shaders existirem.
      ctx.fillStyle = '#808080'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    await faceapi.detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
    // O passo acima não aquece a rede de landmarks: sem face detectada, ela não
    // chega a rodar. Sem isto, a primeira face real ainda pagaria essa compilação.
    await faceapi.nets.faceLandmark68Net.detectLandmarks(canvas)
  })().catch(() => {
    // Aquecimento é melhor-esforço: falhar aqui não pode atrapalhar a detecção
    // real, que roda pelo seu próprio caminho e tem o próprio tratamento de erro.
  })
  return aquecimento
}

/** Adaptador real, usado em produção — carrega TinyFaceDetector + 68 landmarks. */
export function createFaceApiDetector(): FaceDetector {
  return {
    loadModels(modelsUrl: string) {
      return loadFaceApiModels(modelsUrl)
    },

    warmUp() {
      return warmUpFaceApi()
    },

    async detect(input: FaceDetectionInput): Promise<DetectedFace[]> {
      const results = await faceapi.detectAllFaces(input, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
      return results.map((result) => ({
        box: {
          x: result.detection.box.x,
          y: result.detection.box.y,
          width: result.detection.box.width,
          height: result.detection.box.height,
        },
        landmarks: result.landmarks.positions.map((point) => ({ x: point.x, y: point.y })),
      }))
    },
  }
}
