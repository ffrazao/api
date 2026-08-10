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

export type FaceDetectionInput = HTMLVideoElement | HTMLCanvasElement

export interface FaceDetector {
  /** Carrega os modelos necessários a partir de `modelsUrl`; idempotente. */
  loadModels(modelsUrl: string): Promise<void>
  /** Detecta faces (com landmarks) em um frame. Array vazio = nenhuma face. */
  detect(input: FaceDetectionInput): Promise<DetectedFace[]>
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

/** Adaptador real, usado em produção — carrega TinyFaceDetector + 68 landmarks. */
export function createFaceApiDetector(): FaceDetector {
  return {
    loadModels(modelsUrl: string) {
      return loadFaceApiModels(modelsUrl)
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
