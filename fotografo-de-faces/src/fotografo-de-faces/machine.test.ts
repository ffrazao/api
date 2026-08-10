import { describe, expect, it } from 'vitest'
import {
  createInitialMachineContext,
  fotografoDeFacesReducer,
  type MachineContext,
} from './machine'
import type { Candidate, FotografoDeFacesEvent, FotografoDeFacesState, Quality } from './types'

function candidate(id = 'candidata-1'): Candidate {
  return { id }
}

function approvedQuality(): Quality {
  return {
    criteria: {
      enquadramento: true,
      distancia: true,
      pose: true,
      nitidez: true,
      iluminacao: true,
      estabilidade: true,
      posicionamento: true,
    },
    aprovada: true,
  }
}

function reprovedQuality(): Quality {
  return {
    criteria: {
      enquadramento: false,
      distancia: true,
      pose: true,
      nitidez: true,
      iluminacao: true,
      estabilidade: true,
      posicionamento: true,
    },
    aprovada: false,
  }
}

function fakePhoto(): Blob {
  return new Blob(['fake'], { type: 'image/jpeg' })
}

function run(context: MachineContext, events: FotografoDeFacesEvent[]): MachineContext {
  return events.reduce(fotografoDeFacesReducer, context)
}

function contextIn(
  state: FotografoDeFacesState,
  overrides: Partial<MachineContext> = {},
): MachineContext {
  return { ...createInitialMachineContext(), state, ...overrides }
}

describe('FotografoDeFaces — fluxos completos (§06.3)', () => {
  it('§06.3 — fluxo sem captura automática (autoCaptureAfter = null) vai até FOTOGRAFIA_PRONTA', () => {
    const initial = createInitialMachineContext({ autoCaptureAfter: null })
    expect(initial.state).toBe('AGUARDANDO')

    const detectando = run(initial, [{ type: 'DETECTION_STARTED' }])
    expect(detectando.state).toBe('DETECTANDO')

    const avaliando = run(detectando, [{ type: 'CANDIDATE_DETECTED', candidate: candidate() }])
    expect(avaliando.state).toBe('AVALIANDO')
    expect(avaliando.candidate).toEqual(candidate())

    const pronto = run(avaliando, [{ type: 'QUALITY_CHANGED', quality: approvedQuality() }])
    expect(pronto.state).toBe('PRONTO')

    const capturando = run(pronto, [{ type: 'CAPTURE_REQUESTED' }])
    expect(capturando.state).toBe('CAPTURANDO')

    const foto = fakePhoto()
    const fotografiaPronta = run(capturando, [{ type: 'CAPTURE_SUCCEEDED', value: foto }])
    expect(fotografiaPronta.state).toBe('FOTOGRAFIA_PRONTA')
    expect(fotografiaPronta.value).toBe(foto)
    expect(fotografiaPronta.candidate).toBeNull()
  })

  it('§06.3/§07.4/§10 — fluxo com autoCaptureAfter > 0 passa por CRONOMETRANDO e dispara ao fim da contagem', () => {
    const initial = createInitialMachineContext({ autoCaptureAfter: 3 })
    const avaliando = run(initial, [
      { type: 'DETECTION_STARTED' },
      { type: 'CANDIDATE_DETECTED', candidate: candidate() },
    ])

    const cronometrando = run(avaliando, [
      { type: 'QUALITY_CHANGED', quality: approvedQuality() },
    ])
    expect(cronometrando.state).toBe('CRONOMETRANDO')
    expect(cronometrando.timer).toEqual({ totalSeconds: 3, remainingSeconds: 3 })

    const contando = run(cronometrando, [{ type: 'TIMER_TICK', remainingSeconds: 2 }])
    expect(contando.state).toBe('CRONOMETRANDO')
    expect(contando.timer).toEqual({ totalSeconds: 3, remainingSeconds: 2 })

    const capturando = run(contando, [
      { type: 'TIMER_TICK', remainingSeconds: 1 },
      { type: 'TIMER_TICK', remainingSeconds: 0 },
    ])
    expect(capturando.state).toBe('CAPTURANDO')
    expect(capturando.timer).toBeNull()

    const foto = fakePhoto()
    const fotografiaPronta = run(capturando, [{ type: 'CAPTURE_SUCCEEDED', value: foto }])
    expect(fotografiaPronta.state).toBe('FOTOGRAFIA_PRONTA')
    expect(fotografiaPronta.value).toBe(foto)
  })

  it('§07.4 — autoCaptureAfter = 0 vai direto de AVALIANDO para CAPTURANDO, sem passar por PRONTO', () => {
    const initial = createInitialMachineContext({ autoCaptureAfter: 0 })
    const avaliando = run(initial, [
      { type: 'DETECTION_STARTED' },
      { type: 'CANDIDATE_DETECTED', candidate: candidate() },
    ])

    const resultado = run(avaliando, [{ type: 'QUALITY_CHANGED', quality: approvedQuality() }])
    expect(resultado.state).toBe('CAPTURANDO')
  })
})

describe('FotografoDeFaces — perda da candidata (§06.4, §06.5, §07.5)', () => {
  it('§06.4 — perda de candidata em AVALIANDO volta para DETECTANDO', () => {
    const avaliando = contextIn('AVALIANDO', { candidate: candidate() })
    const resultado = fotografoDeFacesReducer(avaliando, { type: 'CANDIDATE_LOST' })
    expect(resultado.state).toBe('DETECTANDO')
    expect(resultado.candidate).toBeNull()
  })

  it('§06.4 — perda de candidata em PRONTO volta para DETECTANDO', () => {
    const pronto = contextIn('PRONTO', { candidate: candidate(), quality: approvedQuality() })
    const resultado = fotografoDeFacesReducer(pronto, { type: 'CANDIDATE_LOST' })
    expect(resultado.state).toBe('DETECTANDO')
    expect(resultado.candidate).toBeNull()
    expect(resultado.quality).toBeNull()
  })

  it('§06.4/§06.5 — reprovação de qualidade em PRONTO também volta para DETECTANDO', () => {
    const pronto = contextIn('PRONTO', { candidate: candidate(), quality: approvedQuality() })
    const resultado = fotografoDeFacesReducer(pronto, {
      type: 'QUALITY_CHANGED',
      quality: reprovedQuality(),
    })
    expect(resultado.state).toBe('DETECTANDO')
  })

  it('§06.4/§06.5/§07.5 — perda de candidata em CRONOMETRANDO cancela o cronômetro e volta para DETECTANDO', () => {
    const cronometrando = contextIn('CRONOMETRANDO', {
      candidate: candidate(),
      quality: approvedQuality(),
      timer: { totalSeconds: 5, remainingSeconds: 2 },
    })
    const resultado = fotografoDeFacesReducer(cronometrando, { type: 'CANDIDATE_LOST' })
    expect(resultado.state).toBe('DETECTANDO')
    expect(resultado.timer).toBeNull()
  })

  it('§06.5/§06.9 — reprovação de qualidade no instante do disparo cancela a captura mesmo com o tick chegando a zero', () => {
    const cronometrando = contextIn('CRONOMETRANDO', {
      candidate: candidate(),
      quality: approvedQuality(),
      timer: { totalSeconds: 3, remainingSeconds: 1 },
    })
    // A condição é perdida antes do tick final chegar — o disparo não deve ocorrer.
    const resultado = run(cronometrando, [
      { type: 'QUALITY_CHANGED', quality: reprovedQuality() },
      { type: 'TIMER_TICK', remainingSeconds: 0 },
    ])
    expect(resultado.state).toBe('DETECTANDO')
  })
})

describe('FotografoDeFaces — captura manual (§06.6, §06.9, §11)', () => {
  const naoProntoStates: FotografoDeFacesState[] = [
    'AGUARDANDO',
    'DETECTANDO',
    'AVALIANDO',
    'CRONOMETRANDO',
    'CAPTURANDO',
    'FOTOGRAFIA_PRONTA',
    'ERRO',
  ]

  it.each(naoProntoStates)(
    '§06.6/§06.9/§11 — capture() em %s não muda de estado nem lança exceção',
    (state) => {
      const context = contextIn(state, { value: state === 'FOTOGRAFIA_PRONTA' ? fakePhoto() : null })
      expect(() => fotografoDeFacesReducer(context, { type: 'CAPTURE_REQUESTED' })).not.toThrow()
      const resultado = fotografoDeFacesReducer(context, { type: 'CAPTURE_REQUESTED' })
      expect(resultado.state).toBe(state)
    },
  )

  it('§06.6/§16 — capture() em PRONTO efetiva a captura (vai para CAPTURANDO)', () => {
    const pronto = contextIn('PRONTO', { candidate: candidate(), quality: approvedQuality() })
    const resultado = fotografoDeFacesReducer(pronto, { type: 'CAPTURE_REQUESTED' })
    expect(resultado.state).toBe('CAPTURANDO')
  })
})

describe('FotografoDeFaces — restart() por estado de origem (§19)', () => {
  it('§19 (AGUARDANDO) — permanece no estado, sem efeito perceptível', () => {
    const aguardando = contextIn('AGUARDANDO')
    const resultado = fotografoDeFacesReducer(aguardando, { type: 'RESTART_REQUESTED' })
    expect(resultado.state).toBe('AGUARDANDO')
  })

  it('§19 (DETECTANDO) — volta para AGUARDANDO', () => {
    const detectando = contextIn('DETECTANDO')
    const resultado = fotografoDeFacesReducer(detectando, { type: 'RESTART_REQUESTED' })
    expect(resultado.state).toBe('AGUARDANDO')
  })

  it('§19 (AVALIANDO) — descarta a candidata atual e volta para AGUARDANDO', () => {
    const avaliando = contextIn('AVALIANDO', { candidate: candidate() })
    const resultado = fotografoDeFacesReducer(avaliando, { type: 'RESTART_REQUESTED' })
    expect(resultado.state).toBe('AGUARDANDO')
    expect(resultado.candidate).toBeNull()
  })

  it('§19 (PRONTO) — abandona a prontidão e volta para AGUARDANDO', () => {
    const pronto = contextIn('PRONTO', { candidate: candidate(), quality: approvedQuality() })
    const resultado = fotografoDeFacesReducer(pronto, { type: 'RESTART_REQUESTED' })
    expect(resultado.state).toBe('AGUARDANDO')
    expect(resultado.candidate).toBeNull()
    expect(resultado.quality).toBeNull()
  })

  it('§19 (CRONOMETRANDO) — cancela o cronômetro imediatamente e volta para AGUARDANDO', () => {
    const cronometrando = contextIn('CRONOMETRANDO', {
      candidate: candidate(),
      quality: approvedQuality(),
      timer: { totalSeconds: 5, remainingSeconds: 4 },
    })
    const resultado = fotografoDeFacesReducer(cronometrando, { type: 'RESTART_REQUESTED' })
    expect(resultado.state).toBe('AGUARDANDO')
    expect(resultado.timer).toBeNull()
  })

  it('§19 (CAPTURANDO) — volta para AGUARDANDO e descarta o resultado tardio da captura em curso', () => {
    const capturando = contextIn('CAPTURANDO', { candidate: candidate(), quality: approvedQuality() })
    const reiniciado = fotografoDeFacesReducer(capturando, { type: 'RESTART_REQUESTED' })
    expect(reiniciado.state).toBe('AGUARDANDO')

    // O resultado da captura que estava em andamento chega depois do restart() —
    // não pode ser considerado uma nova fotografia confirmada (§19 CAPTURANDO).
    const tardio = fotografoDeFacesReducer(reiniciado, {
      type: 'CAPTURE_SUCCEEDED',
      value: fakePhoto(),
    })
    expect(tardio.state).toBe('AGUARDANDO')
    expect(tardio.value).toBeNull()
  })

  it('§19 (FOTOGRAFIA_PRONTA) — volta para AGUARDANDO preservando a fotografia confirmada (§19.18)', () => {
    const foto = fakePhoto()
    const fotografiaPronta = contextIn('FOTOGRAFIA_PRONTA', { value: foto })
    const resultado = fotografoDeFacesReducer(fotografiaPronta, { type: 'RESTART_REQUESTED' })
    expect(resultado.state).toBe('AGUARDANDO')
    expect(resultado.value).toBe(foto)
  })

  it('§19 (ERRO recuperável) — limpa o contexto da falha e volta para AGUARDANDO', () => {
    const erro = contextIn('ERRO', { errorMessage: 'falha temporária', errorRecoverable: true })
    const resultado = fotografoDeFacesReducer(erro, { type: 'RESTART_REQUESTED' })
    expect(resultado.state).toBe('AGUARDANDO')
    expect(resultado.errorMessage).toBeNull()
  })

  it('§19 (ERRO não recuperável) — restart() não mascara uma falha permanente', () => {
    const erro = contextIn('ERRO', { errorMessage: 'falha permanente', errorRecoverable: false })
    const resultado = fotografoDeFacesReducer(erro, { type: 'RESTART_REQUESTED' })
    expect(resultado.state).toBe('ERRO')
    expect(resultado.errorMessage).toBe('falha permanente')
  })

  it('§19.14-15 — restart() nunca altera um `value` já confirmado', () => {
    const foto = fakePhoto()
    const pronto = contextIn('PRONTO', {
      value: foto,
      candidate: candidate(),
      quality: approvedQuality(),
    })
    const resultado = fotografoDeFacesReducer(pronto, { type: 'RESTART_REQUESTED' })
    expect(resultado.value).toBe(foto)
  })
})

describe('FotografoDeFaces — reação a `value` externo (§06.2, §15.1-15.3)', () => {
  it('§06.2 — value externo passando a ser uma fotografia leva a FOTOGRAFIA_PRONTA', () => {
    const aguardando = contextIn('AGUARDANDO')
    const foto = fakePhoto()
    const resultado = fotografoDeFacesReducer(aguardando, {
      type: 'EXTERNAL_VALUE_CHANGED',
      value: foto,
    })
    expect(resultado.state).toBe('FOTOGRAFIA_PRONTA')
    expect(resultado.value).toBe(foto)
  })

  it('§06.2 — value externo voltando a null leva a AGUARDANDO', () => {
    const fotografiaPronta = contextIn('FOTOGRAFIA_PRONTA', { value: fakePhoto() })
    const resultado = fotografoDeFacesReducer(fotografiaPronta, {
      type: 'EXTERNAL_VALUE_CHANGED',
      value: null,
    })
    expect(resultado.state).toBe('AGUARDANDO')
    expect(resultado.value).toBeNull()
  })

  it('§06.2 — reage à mudança externa mesmo em estados intermediários, encerrando o ciclo em curso', () => {
    const avaliando = contextIn('AVALIANDO', { candidate: candidate() })
    const foto = fakePhoto()
    const resultado = fotografoDeFacesReducer(avaliando, {
      type: 'EXTERNAL_VALUE_CHANGED',
      value: foto,
    })
    expect(resultado.state).toBe('FOTOGRAFIA_PRONTA')
    expect(resultado.candidate).toBeNull()
  })
})

describe('FotografoDeFaces — falha de acesso à câmera (§05.11, F2)', () => {
  it('§05.11 crit. 5 — NotAllowedError (permissao-negada) leva a ERRO e não é recuperável via restart()', () => {
    const aguardando = contextIn('AGUARDANDO')
    const emErro = fotografoDeFacesReducer(aguardando, {
      type: 'CAMERA_ACCESS_FAILED',
      reason: 'permissao-negada',
      message: 'Permissão negada.',
    })
    expect(emErro.state).toBe('ERRO')
    expect(emErro.errorReason).toBe('permissao-negada')
    expect(emErro.errorMessage).toBe('Permissão negada.')

    const aposRestart = fotografoDeFacesReducer(emErro, { type: 'RESTART_REQUESTED' })
    expect(aposRestart.state).toBe('ERRO')
  })

  it('§05.11 crit. 6 — NotFoundError (dispositivo-ausente) leva a ERRO e é recuperável via restart()', () => {
    const detectando = contextIn('DETECTANDO')
    const emErro = fotografoDeFacesReducer(detectando, {
      type: 'CAMERA_ACCESS_FAILED',
      reason: 'dispositivo-ausente',
    })
    expect(emErro.state).toBe('ERRO')
    expect(emErro.errorReason).toBe('dispositivo-ausente')

    const aposRestart = fotografoDeFacesReducer(emErro, { type: 'RESTART_REQUESTED' })
    expect(aposRestart.state).toBe('AGUARDANDO')
  })

  it('§05.11 crit. 7 — NotReadableError (hardware-indisponivel) leva a ERRO a partir de AVALIANDO', () => {
    const avaliando = contextIn('AVALIANDO', { candidate: candidate() })
    const emErro = fotografoDeFacesReducer(avaliando, {
      type: 'CAMERA_ACCESS_FAILED',
      reason: 'hardware-indisponivel',
    })
    expect(emErro.state).toBe('ERRO')
    expect(emErro.errorReason).toBe('hardware-indisponivel')
    expect(emErro.candidate).toBeNull()
  })

  it('§18.10/§18.13 — falha de câmera em FOTOGRAFIA_PRONTA não apaga a fotografia confirmada', () => {
    const foto = fakePhoto()
    const fotografiaPronta = contextIn('FOTOGRAFIA_PRONTA', { value: foto })
    const resultado = fotografoDeFacesReducer(fotografiaPronta, {
      type: 'CAMERA_ACCESS_FAILED',
      reason: 'hardware-indisponivel',
    })
    expect(resultado.state).toBe('FOTOGRAFIA_PRONTA')
    expect(resultado.value).toBe(foto)
  })

  it('§05.11 — falha de câmera durante CAPTURANDO não interfere; quem resolve é CAPTURE_SUCCEEDED/CAPTURE_FAILED', () => {
    const capturando = contextIn('CAPTURANDO', { candidate: candidate(), quality: approvedQuality() })
    const resultado = fotografoDeFacesReducer(capturando, {
      type: 'CAMERA_ACCESS_FAILED',
      reason: 'hardware-indisponivel',
    })
    expect(resultado.state).toBe('CAPTURANDO')
  })
})
