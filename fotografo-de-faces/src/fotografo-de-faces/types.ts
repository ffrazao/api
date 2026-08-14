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
  /**
   * §10.8.1 (emenda v1.1): contagem congelada dentro da janela de tolerância —
   * a qualidade reprovou, mas ainda não passou tempo suficiente para cancelar
   * o disparo. Enquanto for `true`, `remainingSeconds` não avança.
   */
  suspended: boolean
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

/**
 * Razão de qualquer ERRO da máquina — inclui falhas de câmera, de captura e a
 * reprovação do valor inicial. `INVALID_INITIAL_VALUE` é grafado exatamente
 * assim porque §05.1.1 o define como um CÓDIGO de erro público, exposto pelo
 * `errorCode` de getState() — não é um rótulo interno como os demais.
 */
export type FotografoDeFacesErrorReason =
  | CameraAccessErrorReason
  | 'falha-de-captura'
  | 'INVALID_INITIAL_VALUE'

/**
 * Retrato do que a MÁQUINA (machine.ts) sabe — base do retorno de getState()
 * (§16.5). O `value_rollback` não aparece aqui de propósito: ele é do
 * componente, não do reducer (§20.7); quem o acrescenta é
 * `FotografoDeFacesPublicSnapshot`.
 */
export interface FotografoDeFacesSnapshot {
  state: FotografoDeFacesState
  message: string
  value: FotografiaValue
  quality: Quality | null
  timer: TimerState | null
  candidate: Candidate | null
  mode: FotografoDeFacesMode
  /**
   * §05.1.1/§18.12: código do ERRO atual, para a aplicação distinguir os
   * motivos sem precisar interpretar a mensagem em português. `null` fora de
   * ERRO.
   */
  errorCode: FotografoDeFacesErrorReason | null
}

/**
 * §16.5 (emenda v1.1) — o que getState() devolve pelo `useRef`: tudo o que a
 * máquina sabe, mais o `value_rollback` em leitura estrita.
 */
export interface FotografoDeFacesPublicSnapshot extends FotografoDeFacesSnapshot {
  /**
   * Fotografia anterior preservada durante uma operação de revisão, ou `null`
   * quando não há alteração em andamento (§04.7, §13.10). Somente leitura: não
   * existe prop, evento ou método que escreva neste valor (§20.7).
   */
  rollbackValue: FotografiaValue
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
  /**
   * §10.8.1: a janela de tolerância de 300ms expirou com a qualidade ainda
   * reprovada — só então o disparo é cancelado. Quem conta o tempo é o
   * componente (mesmo arranjo de TIMER_TICK), para o reducer seguir puro.
   */
  | { type: 'GRACE_PERIOD_EXPIRED' }
  /**
   * §05.1.1: a passagem passiva de detecção sobre o Blob fornecido na montagem
   * não encontrou exatamente uma face. Carrega o próprio Blob avaliado para o
   * reducer poder ignorar um resultado que chegue tarde demais, quando o
   * usuário já trocou de fotografia.
   */
  | { type: 'INITIAL_VALUE_REJECTED'; value: Blob; message?: string }
