/**
 * Mapeamento puro de erros do `getUserMedia()` — F2 (§05.11).
 *
 * Sem React, sem chamar a API de mídia — só traduz uma exceção do navegador
 * para uma razão conhecida do FotografoDeFaces, para que useCameraStream possa
 * despachar `CAMERA_ACCESS_FAILED` para a máquina de estados.
 */
import type { CameraAccessErrorReason } from './types'

export interface CameraAccessError {
  reason: CameraAccessErrorReason
  message: string
  /** Nome original da exceção lançada pelo navegador, para diagnóstico/telemetria. */
  name: string
}

const MESSAGES_BY_REASON: Record<CameraAccessErrorReason, string> = {
  'permissao-negada':
    'Permissão de câmera negada. Habilite o acesso à câmera nas configurações do navegador para continuar.',
  'dispositivo-ausente': 'Nenhuma câmera foi encontrada neste dispositivo.',
  'hardware-indisponivel':
    'Não foi possível acessar a câmera — ela pode estar sendo usada por outro aplicativo.',
}

const REASON_BY_ERROR_NAME: Record<string, CameraAccessErrorReason> = {
  // §05.11 critério 5.
  NotAllowedError: 'permissao-negada',
  PermissionDeniedError: 'permissao-negada',
  // §05.11 critério 6.
  NotFoundError: 'dispositivo-ausente',
  DevicesNotFoundError: 'dispositivo-ausente',
  // §05.11 critério 7.
  NotReadableError: 'hardware-indisponivel',
  TrackStartError: 'hardware-indisponivel',
}

/**
 * Traduz o que `getUserMedia()` rejeitou (tipicamente um `DOMException`) para
 * uma `CameraAccessError` com razão conhecida. Exceções não mapeadas caem em
 * `hardware-indisponivel`, o "balde" genérico mais próximo — nunca deixamos a
 * falha sem razão, já que a máquina de estados precisa de uma para entrar em ERRO.
 */
export function mapGetUserMediaError(cause: unknown): CameraAccessError {
  const name = getErrorName(cause)
  const reason = (name && REASON_BY_ERROR_NAME[name]) || 'hardware-indisponivel'
  return {
    reason,
    message: MESSAGES_BY_REASON[reason],
    name: name ?? 'UnknownError',
  }
}

function getErrorName(cause: unknown): string | undefined {
  if (cause instanceof DOMException) return cause.name
  if (cause && typeof cause === 'object' && 'name' in cause) {
    const { name } = cause as { name: unknown }
    return typeof name === 'string' ? name : undefined
  }
  return undefined
}
