/**
 * Máquina de estados do FotografoDeFaces — F1, estendida na F2 para aceitar
 * falhas de acesso à câmera.
 *
 * Reducer puro, sem React e sem dependência direta de câmera/detecção real
 * (a F2 apenas despacha eventos aqui de fora), para que possa ser testado
 * diretamente com dados simulados. Ver docs/spec-f1-maquina-de-estados.md
 * para as regras da F1.
 */
import type {
  Candidate,
  CameraAccessErrorReason,
  FotografiaValue,
  FotografoDeFacesErrorReason,
  FotografoDeFacesEvent,
  FotografoDeFacesMode,
  FotografoDeFacesSnapshot,
  FotografoDeFacesState,
  Quality,
  TimerState,
} from './types'

/** Contexto interno do reducer — mais detalhado que o snapshot público de getState(). */
export interface MachineContext {
  state: FotografoDeFacesState
  value: FotografiaValue
  mode: FotografoDeFacesMode
  autoCaptureAfter: number | null
  candidate: Candidate | null
  quality: Quality | null
  timer: TimerState | null
  errorMessage: string | null
  /** §19 ERRO: se false, restart() não deve mascarar uma falha permanente. */
  errorRecoverable: boolean
  /** Motivo do ERRO atual (F2) — não faz parte do snapshot público de getState() (§16.5). */
  errorReason: FotografoDeFacesErrorReason | null
}

export interface CreateMachineContextOptions {
  value?: FotografiaValue
  mode?: FotografoDeFacesMode
  autoCaptureAfter?: number | null
}

export function createInitialMachineContext(
  options: CreateMachineContextOptions = {},
): MachineContext {
  const value = options.value ?? null
  return {
    // §06.2: value = fotografia → FOTOGRAFIA_PRONTA; value = null → AGUARDANDO.
    state: value ? 'FOTOGRAFIA_PRONTA' : 'AGUARDANDO',
    value,
    mode: options.mode ?? 'autorretrato',
    autoCaptureAfter: options.autoCaptureAfter ?? null,
    candidate: null,
    quality: null,
    timer: null,
    errorMessage: null,
    errorRecoverable: true,
    errorReason: null,
  }
}

const STATE_MESSAGES: Record<FotografoDeFacesState, string> = {
  AGUARDANDO: 'Aguardando um novo ciclo.',
  DETECTANDO: 'Procurando um rosto.',
  AVALIANDO: 'Avaliando a candidata detectada.',
  PRONTO: 'Pronto para capturar.',
  CRONOMETRANDO: 'Capturando em instantes.',
  CAPTURANDO: 'Capturando a fotografia.',
  FOTOGRAFIA_PRONTA: 'Fotografia disponível.',
  ERRO: 'Ocorreu um erro ao capturar a fotografia.',
}

export function toSnapshot(context: MachineContext): FotografoDeFacesSnapshot {
  return {
    state: context.state,
    message:
      context.state === 'ERRO'
        ? (context.errorMessage ?? STATE_MESSAGES.ERRO)
        : STATE_MESSAGES[context.state],
    value: context.value,
    quality: context.quality,
    timer: context.timer,
    candidate: context.candidate,
    mode: context.mode,
    // §18.12/§05.1.1: fora de ERRO não existe código a comunicar — o motivo do
    // erro ANTERIOR não pode vazar para um estado saudável.
    errorCode: context.state === 'ERRO' ? context.errorReason : null,
  }
}

/**
 * §10.8.1: janela de tolerância do cronômetro, em milissegundos.
 *
 * ~3-4 quadros a 12fps. Amortece a REPROVAÇÃO DE QUALIDADE (qualquer um dos 7
 * critérios), que é coisa diferente da média móvel de `estabilidade` em
 * faceMetrics.ts: aquela suaviza o ruído do detector dentro de um único
 * critério geométrico; esta impede que um quadro escuro, tremido ou de cabeça
 * momentaneamente virada derrube uma contagem inteira.
 *
 * Não vale para perda TOTAL da face (CANDIDATE_LOST), que continua cancelando
 * na hora (§10.8.1 item 2, §10.8).
 */
export const QUALITY_GRACE_PERIOD_MS = 300

const CLEARED_CYCLE_FIELDS = {
  candidate: null,
  quality: null,
  timer: null,
} as const

function backToDetectando(context: MachineContext): MachineContext {
  // §06.4: perda da candidata em AVALIANDO/PRONTO/CRONOMETRANDO sempre volta
  // por AGUARDANDO e reinicia a busca — aqui modelado como um único salto
  // observável para DETECTANDO, já que não há estado transitório perceptível.
  return { ...context, state: 'DETECTANDO', ...CLEARED_CYCLE_FIELDS }
}

function enterProntoOrAutoCapture(context: MachineContext): MachineContext {
  const { autoCaptureAfter } = context
  if (autoCaptureAfter === 0) {
    // §07.4: autoCaptureAfter = 0 → vai direto a CAPTURANDO, sem passar por PRONTO.
    return { ...context, state: 'CAPTURANDO', timer: null }
  }
  if (autoCaptureAfter !== null && autoCaptureAfter > 0) {
    return {
      ...context,
      state: 'CRONOMETRANDO',
      timer: { totalSeconds: autoCaptureAfter, remainingSeconds: autoCaptureAfter, suspended: false },
    }
  }
  return { ...context, state: 'PRONTO', timer: null }
}

function applyExternalValue(context: MachineContext, value: FotografiaValue): MachineContext {
  // §06.2: a máquina reage a mudanças de `value` vindas de fora, em qualquer estado.
  if (value) {
    return {
      ...context,
      state: 'FOTOGRAFIA_PRONTA',
      value,
      ...CLEARED_CYCLE_FIELDS,
      errorMessage: null,
      errorRecoverable: true,
      errorReason: null,
    }
  }
  return {
    ...context,
    state: 'AGUARDANDO',
    value: null,
    ...CLEARED_CYCLE_FIELDS,
    errorMessage: null,
    errorRecoverable: true,
    errorReason: null,
  }
}

function applyRestart(context: MachineContext): MachineContext {
  if (context.state === 'ERRO' && !context.errorRecoverable) {
    // §19 ERRO: restart() não deve mascarar uma falha permanente.
    return context
  }
  // §19.18: restart() sempre devolve o componente a AGUARDANDO preservando o
  // `value` (a última fotografia confirmada) — nunca dispara onChange (§19.14-15).
  return {
    ...context,
    state: 'AGUARDANDO',
    ...CLEARED_CYCLE_FIELDS,
    errorMessage: null,
    errorRecoverable: true,
    errorReason: null,
  }
}

const CAMERA_ERROR_RECOVERABLE: Record<CameraAccessErrorReason, boolean> = {
  // Permissão negada normalmente não muda sozinha — restart() não deve
  // mascarar essa falha permanente (§19 ERRO).
  'permissao-negada': false,
  // Dispositivo ausente ou ocupado pode se resolver sozinho (ex.: usuário
  // conecta a câmera ou fecha o outro app) — vale a pena deixar restart() tentar de novo.
  'dispositivo-ausente': true,
  'hardware-indisponivel': true,
}

/**
 * Estados em que uma falha de acesso à câmera é relevante. Fica de fora:
 * FOTOGRAFIA_PRONTA (§18.10/§18.13 — não afeta uma fotografia já confirmada),
 * CAPTURANDO (resolve pelo seu próprio CAPTURE_SUCCEEDED/CAPTURE_FAILED) e
 * ERRO (já está em erro).
 */
const STATES_THAT_ACCEPT_CAMERA_ERROR = new Set<FotografoDeFacesState>([
  'AGUARDANDO',
  'DETECTANDO',
  'AVALIANDO',
  'PRONTO',
  'CRONOMETRANDO',
])

function applyCameraAccessFailed(
  context: MachineContext,
  event: Extract<FotografoDeFacesEvent, { type: 'CAMERA_ACCESS_FAILED' }>,
): MachineContext {
  if (!STATES_THAT_ACCEPT_CAMERA_ERROR.has(context.state)) {
    return context
  }
  return {
    ...context,
    state: 'ERRO',
    ...CLEARED_CYCLE_FIELDS,
    errorMessage: event.message ?? 'Não foi possível acessar a câmera.',
    errorReason: event.reason,
    errorRecoverable: CAMERA_ERROR_RECOVERABLE[event.reason],
  }
}

/**
 * §05.1.1: o Blob que a aplicação forneceu na montagem não tem exatamente uma
 * face identificável.
 *
 * Só vale enquanto o componente ainda estiver exibindo AQUELE Blob em
 * FOTOGRAFIA_PRONTA: se o usuário já trocou/limpou a fotografia enquanto a
 * passagem passiva rodava, o resultado chega obsoleto e é descartado — nunca
 * pode empurrar para ERRO um ciclo que já seguiu em frente (§18.12: "impedir
 * transições inconsistentes da máquina de estados").
 *
 * O `value` é preservado: uma fotografia não some por causa de um erro
 * (§18.13/§18.17). O erro é marcado como NÃO recuperável porque o Blob não vai
 * melhorar em uma nova tentativa — a saída prevista é o próprio usuário
 * Trocar/Limpar (§05.1.1 item 4), não restart().
 */
function applyInitialValueRejected(
  context: MachineContext,
  event: Extract<FotografoDeFacesEvent, { type: 'INITIAL_VALUE_REJECTED' }>,
): MachineContext {
  if (context.state !== 'FOTOGRAFIA_PRONTA' || context.value !== event.value) {
    return context
  }
  return {
    ...context,
    state: 'ERRO',
    ...CLEARED_CYCLE_FIELDS,
    errorMessage: event.message ?? 'A fotografia fornecida não contém um rosto identificável.',
    errorReason: 'INVALID_INITIAL_VALUE',
    errorRecoverable: false,
  }
}

function reduceAguardando(
  context: MachineContext,
  event: FotografoDeFacesEvent,
): MachineContext {
  if (event.type === 'DETECTION_STARTED') {
    return { ...context, state: 'DETECTANDO' }
  }
  return context
}

function reduceDetectando(
  context: MachineContext,
  event: FotografoDeFacesEvent,
): MachineContext {
  if (event.type === 'CANDIDATE_DETECTED') {
    // §07.2: a resolução de qual face vira candidata (inclusive Face Lock no
    // quiosque) já chega pronta de fora nesta fase.
    return { ...context, state: 'AVALIANDO', candidate: event.candidate, quality: null }
  }
  return context
}

function reduceAvaliando(
  context: MachineContext,
  event: FotografoDeFacesEvent,
): MachineContext {
  if (event.type === 'CANDIDATE_LOST') {
    return backToDetectando(context)
  }
  if (event.type === 'QUALITY_CHANGED') {
    if (event.quality.aprovada) {
      return enterProntoOrAutoCapture({ ...context, quality: event.quality })
    }
    // Ainda não atingiu aprovação — permanece avaliando (não é "perda").
    return { ...context, quality: event.quality }
  }
  return context
}

function reducePronto(context: MachineContext, event: FotografoDeFacesEvent): MachineContext {
  if (event.type === 'CANDIDATE_LOST') {
    return backToDetectando(context)
  }
  if (event.type === 'QUALITY_CHANGED') {
    if (!event.quality.aprovada) {
      // A candidata deixou de atender às condições necessárias (§06.4/§06.5).
      return backToDetectando(context)
    }
    return { ...context, quality: event.quality }
  }
  return context
}

function reduceCronometrando(
  context: MachineContext,
  event: FotografoDeFacesEvent,
): MachineContext {
  if (event.type === 'CANDIDATE_LOST') {
    // §10.8.1 item 2: perda TOTAL da face não passa pela janela de tolerância —
    // cancela na hora, sem amortecimento.
    return backToDetectando(context)
  }
  if (event.type === 'QUALITY_CHANGED') {
    if (!event.quality.aprovada) {
      // §10.8.1 item 1: a primeira reprovação apenas SUSPENDE a contagem; as
      // seguintes não reiniciam a janela (senão, a 12fps, ela nunca expiraria —
      // cada quadro reprovado adiaria o cancelamento indefinidamente). Quem
      // fecha a janela é GRACE_PERIOD_EXPIRED.
      if (context.timer?.suspended) return { ...context, quality: event.quality }
      return {
        ...context,
        quality: event.quality,
        timer: context.timer ? { ...context.timer, suspended: true } : null,
      }
    }
    // §10.8.1 item 1: critérios reestabelecidos dentro da janela — a contagem
    // é retomada de onde parou, sem reiniciar do total.
    return {
      ...context,
      quality: event.quality,
      timer: context.timer?.suspended ? { ...context.timer, suspended: false } : context.timer,
    }
  }
  if (event.type === 'GRACE_PERIOD_EXPIRED') {
    // A reprovação persistiu além da janela: cancela o disparo, libera o Face
    // Lock e reinicia a busca (§10.8, §10.8.1 item 1).
    return context.timer?.suspended ? backToDetectando(context) : context
  }
  if (event.type === 'TIMER_TICK') {
    // Contagem congelada durante a janela de tolerância: um tick que chegue
    // aqui não pode consumir tempo nem, muito menos, disparar a captura.
    if (context.timer?.suspended) return context

    const remainingSeconds = Math.max(0, event.remainingSeconds)
    if (remainingSeconds <= 0) {
      // §10.8.1 item 3 (validação final): decide pelo ÚLTIMO resultado de
      // qualidade já calculado pelo loop contínuo — nunca dispara uma análise
      // nova aqui, que seria assíncrona e não teria como responder a tempo. Se
      // esse último resultado reprovou, a captura é cancelada (§06.9, §10.13).
      if (context.quality && !context.quality.aprovada) return backToDetectando(context)
      return { ...context, state: 'CAPTURANDO', timer: null }
    }
    return {
      ...context,
      timer: {
        totalSeconds: context.timer?.totalSeconds ?? remainingSeconds,
        remainingSeconds,
        suspended: false,
      },
    }
  }
  return context
}

function reduceCapturando(
  context: MachineContext,
  event: FotografoDeFacesEvent,
): MachineContext {
  if (event.type === 'CAPTURE_SUCCEEDED') {
    return {
      ...context,
      state: 'FOTOGRAFIA_PRONTA',
      value: event.value,
      ...CLEARED_CYCLE_FIELDS,
      errorMessage: null,
      errorRecoverable: true,
      errorReason: null,
    }
  }
  if (event.type === 'CAPTURE_FAILED') {
    return {
      ...context,
      state: 'ERRO',
      ...CLEARED_CYCLE_FIELDS,
      errorMessage: event.message ?? 'Não foi possível concluir a captura da fotografia.',
      errorRecoverable: event.recoverable ?? true,
      errorReason: 'falha-de-captura',
    }
  }
  return context
}

export function fotografoDeFacesReducer(
  context: MachineContext,
  event: FotografoDeFacesEvent,
): MachineContext {
  // Eventos tratados de forma global, independentemente do estado atual.
  switch (event.type) {
    case 'EXTERNAL_VALUE_CHANGED':
      return applyExternalValue(context, event.value)
    case 'SET_AUTO_CAPTURE_AFTER':
      return { ...context, autoCaptureAfter: event.autoCaptureAfter }
    case 'RESTART_REQUESTED':
      return applyRestart(context)
    case 'CAMERA_ACCESS_FAILED':
      return applyCameraAccessFailed(context, event)
    case 'INITIAL_VALUE_REJECTED':
      return applyInitialValueRejected(context, event)
    case 'CAPTURE_REQUESTED':
      // §06.6/§06.9/§11: não existe captura válida fora de PRONTO — fora
      // dele, capture() não faz nada (nunca lança exceção).
      return context.state === 'PRONTO' ? { ...context, state: 'CAPTURANDO', timer: null } : context
    default:
      break
  }

  switch (context.state) {
    case 'AGUARDANDO':
      return reduceAguardando(context, event)
    case 'DETECTANDO':
      return reduceDetectando(context, event)
    case 'AVALIANDO':
      return reduceAvaliando(context, event)
    case 'PRONTO':
      return reducePronto(context, event)
    case 'CRONOMETRANDO':
      return reduceCronometrando(context, event)
    case 'CAPTURANDO':
      // Resultados de captura só são aplicados enquanto o estado seguir
      // CAPTURANDO — se um restart() já tiver saído desse estado, o
      // resultado tardio (CAPTURE_SUCCEEDED/FAILED) é descartado (§19).
      return reduceCapturando(context, event)
    case 'FOTOGRAFIA_PRONTA':
    case 'ERRO':
    default:
      return context
  }
}
