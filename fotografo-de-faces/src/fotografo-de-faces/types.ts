/**
 * Contrato de tipos do FotografoDeFaces — F1.
 *
 * Cobre apenas o necessário para a máquina de estados isolada (câmera, detecção
 * facial real, Face Lock e UI ficam para fases posteriores — ver
 * docs/spec-f1-maquina-de-estados.md).
 */

/** Os 8 estados da máquina (§06.1). */
export type FotografoDeFacesState =
  | 'AGUARDANDO'
  | 'DETECTANDO'
  | 'AVALIANDO'
  | 'PRONTO'
  | 'CRONOMETRANDO'
  | 'CAPTURANDO'
  | 'FOTOGRAFIA_PRONTA'
  | 'ERRO'

/** Modos de operação citados em §07.2 ("autorretrato/assistido" vs "quiosque"). */
export type FotografoDeFacesMode = 'autorretrato' | 'assistido' | 'quiosque'

/**
 * Só o suficiente para representar "há fotografia" vs "não há" (§06.2). O
 * conteúdo/tratamento do Blob é assunto de fases posteriores (§12–§13, §17).
 */
export type FotografiaValue = Blob | null

/**
 * Critérios de qualidade citados em §06.1 (AVALIANDO). Na F1 o reducer apenas
 * recebe esse objeto pronto — o cálculo real dos critérios é da F4.
 */
export interface QualityCriteria {
  enquadramento: boolean
  distancia: boolean
  pose: boolean
  nitidez: boolean
  iluminacao: boolean
  estabilidade: boolean
  posicionamento: boolean
}

export interface Quality {
  criteria: QualityCriteria
  /** Resultado agregado: true quando todos os critérios necessários são atendidos. */
  aprovada: boolean
}

/**
 * Candidata sendo avaliada. Na F1, a seleção da candidata (inclusive Face Lock
 * no quiosque) é tratada como informação já resolvida externamente — o
 * reducer só recebe e guarda, nunca calcula (§07.2, §07.3).
 */
export interface Candidate {
  id: string
  /** Informação de Face Lock recebida de fora; não computada nesta fase. */
  locked?: boolean
}

export interface TimerState {
  totalSeconds: number
  remainingSeconds: number
}

/**
 * Razões de falha de acesso à câmera mapeadas a partir das exceções do
 * `getUserMedia()` (§05.11 — F2). Não são estados novos da máquina: a F2
 * manteve os 8 estados da F1 e usa isto só para diferenciar o motivo de um
 * ERRO já existente.
 */
export type CameraAccessErrorReason =
  | 'permissao-negada'
  | 'dispositivo-ausente'
  | 'hardware-indisponivel'

/** Razão de qualquer ERRO da máquina — inclui falhas de câmera e de captura. */
export type FotografoDeFacesErrorReason = CameraAccessErrorReason | 'falha-de-captura'

/** Formato de retorno de getState(), conforme §16.5. */
export interface FotografoDeFacesSnapshot {
  state: FotografoDeFacesState
  message: string
  value: FotografiaValue
  quality: Quality | null
  timer: TimerState | null
  candidate: Candidate | null
  mode: FotografoDeFacesMode
}

/**
 * Eventos que o reducer aceita. Cobrem: sinal de candidata detectada/perdida,
 * sinal de qualidade aprovada/reprovada, resultado de captura, mudança
 * externa de `value` e os comandos `capture()`/`restart()` — mais os eventos
 * de infraestrutura (início de detecção, avanço do cronômetro, atualização de
 * `autoCaptureAfter` e falha de acesso à câmera, esta última introduzida na F2).
 */
export type FotografoDeFacesEvent =
  | { type: 'DETECTION_STARTED' }
  | { type: 'CANDIDATE_DETECTED'; candidate: Candidate }
  | { type: 'CANDIDATE_LOST' }
  | { type: 'QUALITY_CHANGED'; quality: Quality }
  | { type: 'TIMER_TICK'; remainingSeconds: number }
  | { type: 'CAPTURE_SUCCEEDED'; value: Blob }
  | { type: 'CAPTURE_FAILED'; message?: string; recoverable?: boolean }
  | { type: 'EXTERNAL_VALUE_CHANGED'; value: FotografiaValue }
  | { type: 'CAPTURE_REQUESTED' }
  | { type: 'RESTART_REQUESTED' }
  | { type: 'SET_AUTO_CAPTURE_AFTER'; autoCaptureAfter: number | null }
  | { type: 'CAMERA_ACCESS_FAILED'; reason: CameraAccessErrorReason; message?: string }
