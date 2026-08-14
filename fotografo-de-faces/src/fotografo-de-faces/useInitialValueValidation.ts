/**
 * Validação biométrica passiva do valor inicial — F12 (§05.1.1, §02.2 item 11).
 *
 * Quando a aplicação monta o componente já com uma fotografia (`value = Blob`),
 * essa imagem nunca passou pelo motor de detecção deste componente: ela pode
 * vir de um banco de dados antigo, de um upload manual ou de um recorte errado.
 * §05.1.1 manda avaliá-la uma única vez, em SEGUNDO PLANO — a fotografia é
 * exibida normalmente enquanto isso — e, se não houver exatamente uma face
 * identificável, levar o componente a ERRO com o código `INVALID_INITIAL_VALUE`.
 *
 * Três decisões de projeto que valem registro:
 *
 * 1. **Uma única passagem, só sobre o valor da montagem.** Fotografias
 *    produzidas pelo próprio componente já nasceram de uma candidata aprovada;
 *    revalidá-las seria trabalho redundante e abriria caminho para um ciclo de
 *    erro sobre a própria captura. Por isso o Blob avaliado é congelado num ref
 *    no primeiro render.
 * 2. **Falha de infraestrutura não é reprovação.** Se os modelos não carregam
 *    ou a imagem não decodifica, não sabemos nada sobre o rosto — reprovar aí
 *    apagaria a diferença entre "não tem rosto" e "não deu para olhar", e
 *    empurraria para ERRO uma fotografia possivelmente válida (§18.13). O caso
 *    é anunciado em desenvolvimento e o componente segue como está.
 * 3. **O reducer decide, não este hook.** Aqui só se despacha
 *    `INITIAL_VALUE_REJECTED`; a transição (e o descarte de um resultado que
 *    chegue tarde demais) é responsabilidade da máquina (§06).
 */
import { useEffect, useRef } from 'react'
import { createFaceApiDetector } from './faceDetector'
import type { FaceDetectionInput, FaceDetector } from './faceDetector'
import type { FotografiaValue, FotografoDeFacesEvent } from './types'

export interface UseInitialValueValidationOptions {
  /** `value` no momento da montagem; só ele é validado (§05.1.1). */
  value: FotografiaValue
  dispatch: (event: FotografoDeFacesEvent) => void
  /** URL de onde carregar os modelos da face-api.js. Padrão: `/models`. */
  modelsUrl?: string
  /** Injeção para testes; por padrão usa a face-api.js real. */
  detector?: FaceDetector
  /** Decodifica o Blob num elemento que o motor saiba analisar; injetável para testes. */
  decodeImage?: (blob: Blob) => Promise<{ input: FaceDetectionInput; release: () => void }>
}

const DEFAULT_MODELS_URL = '/models'

/**
 * Observabilidade da validação passiva — NÃO altera comportamento.
 *
 * Sem isto, uma falha de modelo/decodificação simplesmente não produziria
 * nenhum efeito visível, e a validação pareceria ter "aprovado" a imagem.
 */
function avisarFalhaDeValidacao(cause: unknown): void {
  if (!import.meta.env.DEV) return
  console.warn(
    '[FotografoDeFaces] não foi possível validar a fotografia inicial (§05.1.1). ' +
      'A imagem continua sendo exibida como está — isto NÃO é uma reprovação.',
    cause,
  )
}

/**
 * Decodifica o Blob num `<img>` fora da árvore do React. É o formato que a
 * face-api.js aceita para um frame estático — o `<video>` do preview não serve
 * aqui, porque a fotografia inicial não veio da câmera.
 *
 * O `release()` revoga a URL de objeto: sem isso, cada montagem com valor
 * inicial vazaria o Blob inteiro na memória do navegador enquanto a página
 * estivesse aberta.
 */
function decodeBlobToImage(blob: Blob): Promise<{ input: FaceDetectionInput; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const release = () => URL.revokeObjectURL(url)
    const image = new Image()
    image.onload = () => resolve({ input: image, release })
    image.onerror = () => {
      release()
      reject(new Error('não foi possível decodificar a fotografia fornecida'))
    }
    image.src = url
  })
}

export function useInitialValueValidation(options: UseInitialValueValidationOptions): void {
  const { dispatch, modelsUrl = DEFAULT_MODELS_URL } = options
  const decodeImage = options.decodeImage ?? decodeBlobToImage

  // Congela o valor da montagem: mudanças posteriores de `value` (captura nova,
  // Trocar, Limpar) não disparam uma segunda validação.
  const initialValueRef = useRef<FotografiaValue>(options.value)

  const injectedDetector = options.detector
  const defaultDetectorRef = useRef<FaceDetector | null>(null)
  if (!injectedDetector && !defaultDetectorRef.current) {
    // O carregamento de modelos da face-api.js é memoizado por URL no módulo
    // (ver faceDetector.ts), então esta instância compartilha o mesmo download
    // com o loop de detecção contínuo — não há custo dobrado de rede.
    defaultDetectorRef.current = createFaceApiDetector()
  }
  const detector = injectedDetector ?? defaultDetectorRef.current!

  useEffect(() => {
    const blob = initialValueRef.current
    if (!blob) return

    let cancelado = false
    let liberar: (() => void) | null = null

    void (async () => {
      try {
        await detector.loadModels(modelsUrl)
        if (cancelado) return

        const { input, release } = await decodeImage(blob)
        liberar = release
        if (cancelado) return

        const faces = await detector.detect(input)
        if (cancelado) return

        // §05.1.1 item 2: exatamente uma face. Zero reprova (não há quem
        // fotografar) e mais de uma também (não há como saber de quem é a
        // fotografia — o mesmo critério que §05.2 aplica ao vivo).
        if (faces.length !== 1) {
          dispatch({
            type: 'INITIAL_VALUE_REJECTED',
            value: blob,
            message:
              faces.length === 0
                ? 'A fotografia fornecida não contém um rosto identificável.'
                : 'A fotografia fornecida contém mais de um rosto.',
          })
        }
      } catch (cause) {
        avisarFalhaDeValidacao(cause)
      } finally {
        liberar?.()
      }
    })()

    return () => {
      cancelado = true
      liberar?.()
    }
  }, [detector, modelsUrl, decodeImage, dispatch])
}
