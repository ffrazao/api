/**
 * Ciclo de vida da câmera — F2 (§05.2, §05.11).
 *
 * Acopla `navigator.mediaDevices.getUserMedia()` aos estados da máquina do
 * FotografoDeFaces (F1): solicita mídia apenas quando `value = null` e a
 * máquina está buscando candidatos, nunca repete a solicitação de permissão
 * uma vez concedida, bloqueia chamadas concorrentes e encerra todas as
 * tracks no desmontar, seja qual for o estado.
 */
import { useEffect, useRef, useState } from 'react'
import { mapGetUserMediaError } from './camera'
import type { CameraAccessError } from './camera'
import type { FotografiaValue, FotografoDeFacesEvent, FotografoDeFacesState } from './types'

/** Só o suficiente de `MediaDevices` para permitir injeção em testes. */
export interface MediaDevicesLike {
  getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream>
}

export type CameraStreamStatus = 'idle' | 'requesting' | 'active' | 'error'

export interface UseCameraStreamOptions {
  /** Estado atual da máquina do FotografoDeFaces — decide quando iniciar a busca por mídia (§05.2). */
  state: FotografoDeFacesState
  /** `value` atual — a câmera só é solicitada quando não há fotografia confirmada (§05.2). */
  value: FotografiaValue
  /** Despacha de volta para a máquina: início de detecção e falhas de acesso à câmera. */
  dispatch: (event: FotografoDeFacesEvent) => void
  constraints?: MediaStreamConstraints
  /** Injeção para testes; por padrão usa `navigator.mediaDevices`. */
  mediaDevices?: MediaDevicesLike
}

export interface UseCameraStreamResult {
  stream: MediaStream | null
  status: CameraStreamStatus
  error: CameraAccessError | null
}

const DEFAULT_CONSTRAINTS: MediaStreamConstraints = { video: true }

/** Estados em que a máquina está "buscando candidatos" (§05.2, §06.1). */
const SEARCHING_STATES = new Set<FotografoDeFacesState>(['AGUARDANDO', 'DETECTANDO'])

export function useCameraStream(options: UseCameraStreamOptions): UseCameraStreamResult {
  const { state, value, dispatch, constraints } = options
  const mediaDevices =
    options.mediaDevices ?? (typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStreamStatus>('idle')
  const [error, setError] = useState<CameraAccessError | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const requestInFlightRef = useRef(false)
  // Precisa sobreviver a um cleanup+reexecução sincronos do próprio React
  // (StrictMode) sem se confundir com um desmonte de verdade — por isso não
  // usamos uma flag "cancelled" por execução do efeito, e sim esta, mantida
  // por toda a vida do hook e só zerada no cleanup final (§05.11 crit. 11/12).
  const isMountedRef = useRef(false)

  const shouldAcquire = value === null && SEARCHING_STATES.has(state)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // §05.11 crit. 11/12: ao desmontar de verdade, encerra todas as tracks
      // sob nossa responsabilidade, independentemente do estado operacional.
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!shouldAcquire) return

    if (streamRef.current) {
      // §05.11 crit. 2/3: já existe um stream concedido antes — nunca pedimos
      // getUserMedia() de novo só porque voltamos a AGUARDANDO/DETECTANDO.
      if (state === 'AGUARDANDO') {
        dispatch({ type: 'DETECTION_STARTED' })
      }
      return
    }

    if (requestInFlightRef.current) return // §05.11 crit. 4: exclusividade.

    if (!mediaDevices) {
      const mapped = mapGetUserMediaError({ name: 'NotFoundError' })
      setStatus('error')
      setError(mapped)
      dispatch({ type: 'CAMERA_ACCESS_FAILED', reason: mapped.reason, message: mapped.message })
      return
    }

    requestInFlightRef.current = true
    setStatus('requesting')

    mediaDevices
      .getUserMedia(constraints ?? DEFAULT_CONSTRAINTS)
      .then((mediaStream) => {
        if (!isMountedRef.current) {
          // Resolveu depois do desmonte de verdade — encerra na hora, sem
          // tocar em estado do React (§05.11 crit. 11/12).
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = mediaStream
        setStream(mediaStream)
        setStatus('active')
        setError(null)
        if (state === 'AGUARDANDO') {
          dispatch({ type: 'DETECTION_STARTED' })
        }
      })
      .catch((cause: unknown) => {
        if (!isMountedRef.current) return
        const mapped = mapGetUserMediaError(cause)
        setStatus('error')
        setError(mapped)
        dispatch({ type: 'CAMERA_ACCESS_FAILED', reason: mapped.reason, message: mapped.message })
      })
      .finally(() => {
        requestInFlightRef.current = false
      })
  }, [shouldAcquire, state, dispatch, mediaDevices, constraints])

  return { stream, status, error }
}
