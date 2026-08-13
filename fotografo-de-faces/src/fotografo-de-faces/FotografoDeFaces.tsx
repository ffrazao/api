/**
 * Componente visual FotografoDeFaces — F4/F5/F7.
 *
 * Integra a máquina de estados (F1), o ciclo de vida da câmera (F2) e o
 * motor de detecção (F3) num único componente controlado, e renderiza a
 * guia de enquadramento, a moldura colorida, o cronômetro regressivo, o
 * botão de captura manual, as ações de revisão (F5) e as mensagens de
 * orientação via styled-components. A F7 expõe tudo isso também via `ref`
 * imperativo (§16), sempre em cima das mesmas funções que já governam o
 * componente por dentro — nunca um caminho paralelo que possa burlar a
 * máquina de estados (§16.11).
 *
 * §20.10: nunca aceita width/height/cameraWidth/cameraHeight — o tamanho
 * vem sempre do contêiner da aplicação hospedeira (ver FotografoDeFaces.styles.ts).
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ForwardedRef, RefObject } from 'react'
import * as S from './FotografoDeFaces.styles'
import type { DisplaySize } from './presentation'
import {
  FACE_FRAME_HEX,
  boxToPercentagePosition,
  getFaceFrameColor,
  getVisibleFaceColor,
  isCaptureButtonEnabled,
  shouldShowCaptureButton,
} from './presentation'
import { useCameraStream } from './useCameraStream'
import { useFaceDetection } from './useFaceDetection'
import { useFotografoDeFacesMachine } from './useFotografoDeFacesMachine'
import { useReviewWindow } from './useReviewWindow'
import { capturePhotoBlob } from './imageProcessor'
import type { FotografiaValue, FotografoDeFacesMode, FotografoDeFacesSnapshot, Quality, TimerState } from './types'

export interface FotografoDeFacesProps {
  value: FotografiaValue
  onChange: (value: FotografiaValue) => void
  mode?: FotografoDeFacesMode
  autoCaptureAfter?: number | null
  /** §02.1 item 4, §20.4 — guia oval de enquadramento sobreposta ao preview. */
  showFramingGuide?: boolean
  /** §20.4, §07.9 — moldura colorida sobre a face detectada. */
  showFaceFrame?: boolean
  /** §14.1 — mensagens de orientação da máquina de estados/motor de detecção. */
  showMessages?: boolean
  /** URL de onde a face-api.js deve carregar os modelos (padrão: `/models`). */
  modelsUrl?: string
  /** §04.8 — janela de revisão: null desliga, 0 fica aberta indefinidamente, >0 expira em ms. */
  reviewFor?: number | null
}

/**
 * Contrato imperativo via `ref` (§16.1). Pequeno e previsível de propósito
 * (§16.10/§16.11): só solicita ações e consulta o que a máquina já decidiu —
 * não existe `forceReady()`/`forceCapture()` nem forma de escrever direto no
 * estado interno.
 */
export interface FotografoDeFacesHandle {
  /** §16.2 — só é efetivada em PRONTO; fora disso, não faz nada (sem lançar exceção). */
  capture: () => void
  /** §16.3/§19.18 — volta a AGUARDANDO preservando `value`; nunca dispara onChange. */
  restart: () => void
  /** §16.4 — liga/desliga a apresentação em tela cheia via API nativa do navegador. */
  setFullscreen: (active: boolean) => void
  /** §16.5 — retrato consolidado do estado atual. */
  getState: () => FotografoDeFacesSnapshot
  /** §16.6 — exatamente o `value` atual (nunca um conceito de "confirmado"). */
  getValue: () => FotografiaValue
  /** §16.7 — mensagem de orientação atual. */
  getMessage: () => string
  /** §16.8 — indicadores de qualidade vigentes, só leitura. */
  getQuality: () => Quality | null
  /** §16.9 — estado do cronômetro quando houver um ativo. */
  getTimer: () => TimerState | null
}

/**
 * Tamanho atual do elemento em pixels CSS, acompanhando redimensionamentos.
 *
 * É o dado que faltava para posicionar as molduras corretamente: sob
 * `object-fit: cover` a caixa da face só pode ser mapeada para a tela sabendo a
 * proporção do contêiner, e §20.10 diz que ela é decidida pela aplicação
 * hospedeira — pode mudar a qualquer momento (janela redimensionada, tela cheia,
 * layout responsivo), sem passar por prop nenhuma.
 *
 * O `ResizeObserver` é opcional de propósito: onde ele não existir (jsdom nos
 * testes, navegadores antigos) o tamanho é medido uma vez na montagem e o
 * componente segue funcionando — só não reage a redimensionamento.
 */
function useDisplaySize(elementRef: RefObject<HTMLElement | null>): DisplaySize {
  const [size, setSize] = useState<DisplaySize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const medir = () => {
      const { width, height } = element.getBoundingClientRect()
      // Só troca o objeto quando o tamanho muda de fato — senão cada quadro do
      // observador viraria um render novo do componente inteiro.
      setSize((atual) => (atual.width === width && atual.height === height ? atual : { width, height }))
    }

    medir()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(medir)
    observer.observe(element)
    return () => observer.disconnect()
  }, [elementRef])

  return size
}

function FotografoDeFacesImpl(props: FotografoDeFacesProps, ref: ForwardedRef<FotografoDeFacesHandle>) {
  const {
    value,
    onChange,
    mode = 'autorretrato',
    autoCaptureAfter = null,
    showFramingGuide = false,
    showFaceFrame = false,
    showMessages = false,
    modelsUrl,
    reviewFor = null,
  } = props

  const rootRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { snapshot, dispatch, capture, restart, getState, getValue } = useFotografoDeFacesMachine({
    value,
    mode,
    autoCaptureAfter,
  })
  const { stream } = useCameraStream({ state: snapshot.state, value: snapshot.value, dispatch })
  const { visibleFaces, candidateBox } = useFaceDetection({
    videoElement: videoRef.current,
    state: snapshot.state,
    value: snapshot.value,
    dispatch,
    mode,
    modelsUrl,
  })

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  // §15: onChange comunica uma nova proposta de valor — nunca substitui
  // sozinho a fonte de verdade, que continua sendo o `value` que a aplicação
  // devolver. `onChangeRef` guarda sempre a versão mais recente de `onChange`
  // sem forçar os efeitos abaixo a rodar de novo só por causa da identidade
  // da função ter mudado (comum quando o host passa uma arrow function
  // inline) — eles precisam reagir só a mudanças reais de valor. Se
  // `reportValue` fosse recriado a cada `onChange` diferente, o efeito abaixo
  // reavaliaria a comparação bem no meio da janela em que snapshot.value (F1)
  // ainda está desatualizado (ele só alcança um novo `value` externo um ciclo
  // de render depois) — e um falso positivo ali dispara um onChange espúrio
  // que realimenta um loop infinito.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const previousValueRef = useRef(value)

  const reportValue = useCallback((next: FotografiaValue) => {
    previousValueRef.current = next
    onChangeRef.current(next)
  }, [])

  // Captura interna concluída (snapshot.value mudou por conta própria, não
  // por uma proposta que já fizemos) -> avisa a aplicação hospedeira.
  useEffect(() => {
    if (snapshot.value !== previousValueRef.current) {
      reportValue(snapshot.value)
    }
  }, [snapshot.value, reportValue])

  // F5 — Trocar/Limpar/Confirmar/Cancelar e o rollback privado (§04.7-§04.13, §13.4-§13.10).
  const reviewWindow = useReviewWindow({
    value: snapshot.value,
    state: snapshot.state,
    onChange: reportValue,
    reviewFor,
  })

  // Cronômetro regressivo (§04.3, §07.5, §10.3, §14.6).
  //
  // A contagem é derivada de um PRAZO em tempo real, nunca de um acumulado de
  // ticks. A diferença aparece quando a thread principal trava: a inferência da
  // face-api.js roda nela, e um quadro caro (a primeira inferência, que compila
  // os shaders, custa segundos) prende junto todos os `setTimeout`. Decrementando
  // de 1 em 1, cada travada esticava a contagem — um cronômetro de 3s levava
  // 17s reais, e a interface ficava parada num número por vários segundos sem
  // nunca capturar. Contra o prazo, uma travada só faz a contagem pular direto
  // para o valor certo (inclusive para 0, disparando a captura na hora).
  const countdownDeadlineRef = useRef<number | null>(null)
  useEffect(() => {
    if (snapshot.state !== 'CRONOMETRANDO' || !snapshot.timer) {
      // Sair de CRONOMETRANDO encerra o prazo: a próxima contagem (§06.5 —
      // condição perdida e recuperada) começa inteira, do zero.
      countdownDeadlineRef.current = null
      return
    }

    const { remainingSeconds } = snapshot.timer
    const deadline = countdownDeadlineRef.current ?? Date.now() + remainingSeconds * 1000
    countdownDeadlineRef.current = deadline

    // Próxima virada de segundo medida contra o prazo — nunca "daqui a 1s".
    const proximaViradaEm = deadline - (remainingSeconds - 1) * 1000 - Date.now()
    const timeoutId = setTimeout(
      () => {
        dispatch({ type: 'TIMER_TICK', remainingSeconds: Math.ceil((deadline - Date.now()) / 1000) })
      },
      Math.max(0, proximaViradaEm),
    )
    return () => clearTimeout(timeoutId)
  }, [snapshot.state, snapshot.timer, dispatch])

  // F9 (§12, §17, §18.6-§18.17) — efetiva a captura ao entrar em CAPTURANDO:
  // recorta com margem de contexto a partir do <video> ao vivo (nunca de uma
  // amostra de baixa resolução usada só para análise contínua), normaliza o
  // espelhamento (nunca espelha — ver imageProcessor.ts) e produz o Blob
  // JPEG final. Falhas de hardware/memória nunca tocam em `value`: apenas
  // despacham CAPTURE_FAILED, e o reducer da F1 (já fechado/testado) cuida de
  // manter a última fotografia confirmada intacta e de nunca reemitir
  // onChange nesse caminho.
  useEffect(() => {
    if (snapshot.state !== 'CAPTURANDO') return
    const video = videoRef.current

    if (!video || !candidateBox) {
      dispatch({
        type: 'CAPTURE_FAILED',
        message: 'Não foi possível localizar a candidata no instante da captura.',
        recoverable: true,
      })
      return
    }

    capturePhotoBlob(video, candidateBox)
      .then((blob) => {
        dispatch({ type: 'CAPTURE_SUCCEEDED', value: blob })
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Falha ao processar a fotografia capturada.'
        dispatch({ type: 'CAPTURE_FAILED', message, recoverable: true })
      })
    // Se este efeito rodar mais de uma vez para o mesmo disparo (ex.: modo de
    // desenvolvimento do React), o segundo resultado que chegar é
    // simplesmente ignorado pelo reducer — ele só aplica CAPTURE_SUCCEEDED/
    // CAPTURE_FAILED enquanto o estado ainda for CAPTURANDO (ver
    // machine.ts/reduceCapturando), então não é preciso nenhuma guarda extra aqui.
  }, [snapshot.state, candidateBox, dispatch])

  // §16.4 — tela cheia via API nativa do navegador; nunca lança para o
  // consumidor (nem em ambientes/navegadores sem suporte, como jsdom em teste).
  const setFullscreen = useCallback((active: boolean) => {
    const node = rootRef.current
    if (!node) return
    try {
      if (active) {
        if (document.fullscreenElement !== node && typeof node.requestFullscreen === 'function') {
          node.requestFullscreen()?.catch(() => {})
        }
      } else if (document.fullscreenElement === node && typeof document.exitFullscreen === 'function') {
        document.exitFullscreen()?.catch(() => {})
      }
    } catch {
      // Navegador sem suporte real à Fullscreen API — ignora silenciosamente.
    }
  }, [])

  // Reflete o estado real de tela cheia (pode mudar por fora — ex.: tecla Esc
  // do próprio navegador — não só pelo nosso botão) para o rótulo/ícone do
  // botão de alternância abaixo ficarem sempre corretos.
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === rootRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // §16.1: a API imperativa só encaminha para as mesmas funções que já
  // governam o componente por dentro — nunca um caminho paralelo (§16.11).
  useImperativeHandle(
    ref,
    (): FotografoDeFacesHandle => ({
      capture,
      restart,
      setFullscreen,
      getState,
      getValue,
      getMessage: () => getState().message,
      getQuality: () => getState().quality,
      getTimer: () => getState().timer,
    }),
    [capture, restart, setFullscreen, getState, getValue],
  )

  const frameColor = getFaceFrameColor(snapshot.state, snapshot.candidate !== null)
  // §09.1/§09.6 (F6): no quiosque, com faces visíveis, cada uma ganha sua
  // própria moldura posicionada; fora disso (outros modos, ou quiosque sem
  // ninguém em cena — ex.: FOTOGRAFIA_PRONTA/ERRO) usa a moldura única de sempre.
  const showMultiFaceFrames = mode === 'quiosque' && visibleFaces.length > 0
  const videoFrameSize = { width: videoRef.current?.videoWidth ?? 0, height: videoRef.current?.videoHeight ?? 0 }
  // O <video> é o elemento que carrega o `object-fit: cover`, então é o tamanho
  // dele — não o do Root — que define o mapeamento das molduras (§07.9, §09.6).
  const displaySize = useDisplaySize(videoRef)
  const showButton = shouldShowCaptureButton(autoCaptureAfter, snapshot.state)
  const buttonEnabled = isCaptureButtonEnabled(snapshot.state)

  return (
    <S.Root ref={rootRef} data-testid="fotografo-de-faces" data-state={snapshot.state}>
      <S.VideoClip>
        <S.Video
          ref={videoRef}
          data-testid="video"
          $mirrored={mode === 'autorretrato'}
          autoPlay
          muted
          playsInline
        />

        <S.OverlayLayer>
          {showFramingGuide && <S.FramingGuideOval data-testid="framing-guide" />}

          {showFaceFrame &&
            (showMultiFaceFrames ? (
              visibleFaces.map((face) => {
                const color = getVisibleFaceColor(face.locked, snapshot.state)
                return (
                  <S.FaceFrameBox
                    key={face.id}
                    data-testid="face-frame"
                    data-color={color}
                    data-locked={face.locked}
                    $color={FACE_FRAME_HEX[color]}
                    style={boxToPercentagePosition(face.box, videoFrameSize, displaySize)}
                  />
                )
              })
            ) : (
              frameColor && (
                <S.FaceFrameOval
                  data-testid="face-frame"
                  data-color={frameColor}
                  $color={FACE_FRAME_HEX[frameColor]}
                />
              )
            ))}

          {snapshot.state === 'CRONOMETRANDO' && snapshot.timer && (
            <S.Countdown data-testid="countdown">{snapshot.timer.remainingSeconds}</S.Countdown>
          )}
        </S.OverlayLayer>
      </S.VideoClip>

      {/* §16.4/§2.1.1/§2.5.8 — alternador de tela cheia, sempre disponível e operável por teclado. */}
      <S.FullscreenButton
        type="button"
        tabIndex={0}
        data-testid="fullscreen-button"
        aria-pressed={isFullscreen}
        aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
        onClick={() => setFullscreen(!isFullscreen)}
      >
        {isFullscreen ? '⤡' : '⤢'}
      </S.FullscreenButton>

      <S.BottomBar>
        {/* §4.1.3 — região de status sempre presente no DOM (para o leitor de tela
            anunciar mudanças mesmo que o texto visível esteja desligado por showMessages);
            só a aparência visual muda com $visuallyHidden. */}
        <S.MessageBar data-testid="message" role="status" aria-live="polite" $visuallyHidden={!showMessages}>
          {snapshot.message}
        </S.MessageBar>

        {showButton && (
          <S.CaptureButton
            type="button"
            tabIndex={0}
            data-testid="capture-button"
            aria-label="Capturar fotografia"
            disabled={!buttonEnabled}
            onClick={capture}
          />
        )}

        {reviewWindow.phase === 'trocar-ou-limpar' && (
          <S.ReviewActions data-testid="review-actions">
            <S.ReviewButton type="button" tabIndex={0} data-testid="trocar-button" onClick={reviewWindow.trocar}>
              Trocar
            </S.ReviewButton>
            <S.ReviewButton type="button" tabIndex={0} data-testid="limpar-button" onClick={reviewWindow.limpar}>
              Limpar
            </S.ReviewButton>
          </S.ReviewActions>
        )}

        {reviewWindow.phase === 'confirmar-ou-cancelar' && (
          <S.ReviewActions data-testid="review-actions">
            <S.ReviewButton type="button" tabIndex={0} data-testid="cancelar-button" onClick={reviewWindow.cancelar}>
              Cancelar
            </S.ReviewButton>
            <S.ReviewButton
              type="button"
              tabIndex={0}
              $variant="primary"
              data-testid="confirmar-button"
              onClick={reviewWindow.confirmar}
            >
              Confirmar
            </S.ReviewButton>
          </S.ReviewActions>
        )}
      </S.BottomBar>
    </S.Root>
  )
}

export const FotografoDeFaces = forwardRef(FotografoDeFacesImpl)
