import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FotografoDeFaces } from './FotografoDeFaces'
import type { FotografoDeFacesProps } from './FotografoDeFaces'
import { useFaceDetection } from './useFaceDetection'
import type { Candidate, FotografiaValue, FotografoDeFacesEvent, Quality } from './types'

/**
 * Janela de tolerância do cronômetro — §10.8.1 (emenda v1.1), de ponta a ponta.
 *
 * machine.test.ts já cobre a decisão pura do reducer; o que se testa aqui é a
 * parte que só existe integrada: o efeito de 300ms que fecha a janela e o
 * congelamento real da contagem regressiva, que é derivada de um PRAZO em tempo
 * real (ver FotografoDeFaces.tsx) — congelar de mentira, deixando o prazo
 * correr por baixo, faria a captura disparar adiantada quando a qualidade
 * voltasse, e nenhum teste de reducer pegaria isso.
 */
vi.mock('./useCameraStream', () => ({
  useCameraStream: vi.fn(() => ({ stream: null, status: 'idle', error: null })),
}))
vi.mock('./useFaceDetection', () => ({
  useFaceDetection: vi.fn(() => ({
    status: 'idle',
    visibleFaces: [],
    candidateBox: { x: 40, y: 40, width: 200, height: 200 },
  })),
}))
// A captura de verdade não roda em jsdom (sem Canvas 2D real) — nunca resolve,
// então CAPTURANDO fica observável sem competir com nada.
vi.mock('./imageProcessor', () => ({
  capturePhotoBlob: vi.fn(() => new Promise(() => {})),
}))

function quality(aprovada: boolean): Quality {
  return {
    criteria: {
      enquadramento: true,
      distancia: true,
      pose: true,
      nitidez: true,
      // Um único critério momentaneamente reprovado é exatamente o caso que a
      // janela de tolerância existe para amortecer (§10.8.1 item 1).
      iluminacao: aprovada,
      estabilidade: true,
      posicionamento: true,
    },
    aprovada,
  }
}

const candidate: Candidate = { id: 'candidata-1' }

function latestDispatch(): (event: FotografoDeFacesEvent) => void {
  const calls = vi.mocked(useFaceDetection).mock.calls
  const dispatch = calls[calls.length - 1]?.[0]?.dispatch
  if (!dispatch) throw new Error('useFaceDetection ainda não foi chamado')
  return dispatch
}

function Host(props: Omit<FotografoDeFacesProps, 'value' | 'onChange'>) {
  const [value, setValue] = useState<FotografiaValue>(null)
  return <FotografoDeFaces value={value} onChange={setValue} {...props} />
}

/** Leva a máquina até CRONOMETRANDO com uma contagem de 3 segundos. */
function driveToCountdown() {
  const dispatch = latestDispatch()
  act(() => {
    dispatch({ type: 'DETECTION_STARTED' })
    dispatch({ type: 'CANDIDATE_DETECTED', candidate })
    dispatch({ type: 'QUALITY_CHANGED', quality: quality(true) })
  })
}

function sinalizarQualidade(aprovada: boolean) {
  const dispatch = latestDispatch()
  act(() => dispatch({ type: 'QUALITY_CHANGED', quality: quality(aprovada) }))
}

function avancar(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function estado(): string | null {
  return screen.getByTestId('fotografo-de-faces').getAttribute('data-state')
}

function contagem(): string | null {
  return screen.queryByTestId('countdown')?.textContent ?? null
}

describe('FotografoDeFaces — janela de tolerância do cronômetro (§10.8.1)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('uma falha de um único quadro não reinicia nem cancela a contagem', () => {
    render(<Host autoCaptureAfter={3} />)
    driveToCountdown()

    expect(estado()).toBe('CRONOMETRANDO')
    expect(contagem()).toBe('3')

    avancar(1000)
    expect(contagem()).toBe('2')

    // Um quadro ruim isolado: a contagem congela em 2 em vez de morrer.
    sinalizarQualidade(false)
    expect(estado()).toBe('CRONOMETRANDO')
    expect(contagem()).toBe('2')

    // Dentro dos 300ms a qualidade volta — e a contagem segue de onde parou.
    avancar(200)
    sinalizarQualidade(true)
    expect(estado()).toBe('CRONOMETRANDO')
    expect(contagem()).toBe('2')
  })

  it('a contagem não avança durante a suspensão — o prazo é devolvido por inteiro', () => {
    render(<Host autoCaptureAfter={3} />)
    driveToCountdown()

    avancar(1000)
    expect(contagem()).toBe('2')

    sinalizarQualidade(false)
    avancar(250)
    sinalizarQualidade(true)

    // Faltavam 2s quando congelou. Passados 1999ms de contagem retomada, ainda
    // não pode ter disparado: se os 250ms congelados tivessem sido descontados
    // do prazo, a captura teria ocorrido antes daqui.
    avancar(1999)
    expect(estado()).toBe('CRONOMETRANDO')

    avancar(1)
    expect(estado()).toBe('CAPTURANDO')
  })

  it('reprovação que persiste além de 300ms cancela o disparo e reinicia a busca', () => {
    render(<Host autoCaptureAfter={3} />)
    driveToCountdown()

    sinalizarQualidade(false)
    avancar(299)
    expect(estado()).toBe('CRONOMETRANDO')

    avancar(1)
    expect(estado()).toBe('DETECTANDO')
    expect(contagem()).toBeNull()
  })

  it('quadros reprovados sucessivos não adiam o cancelamento (a janela não se renova)', () => {
    render(<Host autoCaptureAfter={3} />)
    driveToCountdown()

    // A detecção real despacha ~12 quadros por segundo; todos reprovados.
    sinalizarQualidade(false)
    for (let i = 0; i < 3; i++) {
      avancar(83)
      sinalizarQualidade(false)
    }

    expect(estado()).toBe('CRONOMETRANDO')
    avancar(51) // completa os 300ms desde a PRIMEIRA reprovação.
    expect(estado()).toBe('DETECTANDO')
  })

  it('item 2 — perda total da face cancela na hora, sem esperar a janela', () => {
    render(<Host autoCaptureAfter={3} />)
    driveToCountdown()

    act(() => latestDispatch()({ type: 'CANDIDATE_LOST' }))

    expect(estado()).toBe('DETECTANDO')
    expect(contagem()).toBeNull()
  })

  it('item 3 — a contagem suspensa nunca chega a disparar a captura', () => {
    render(<Host autoCaptureAfter={1} />)
    driveToCountdown()

    sinalizarQualidade(false)
    // Tempo mais que suficiente para o cronômetro de 1s ter expirado, se ele
    // ainda estivesse correndo por baixo do congelamento.
    avancar(299)

    expect(estado()).toBe('CRONOMETRANDO')
    avancar(1)
    expect(estado()).toBe('DETECTANDO')
  })
})
