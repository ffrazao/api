/**
 * Janela de revisão (Trocar/Limpar/Confirmar/Cancelar) — F5
 * (§04.7–§04.13, §13.4–§13.10, §20.7, §4.15).
 *
 * Fica deliberadamente fora de machine.ts: a F1 excluiu explicitamente esse
 * comportamento do reducer puro (§7.7), e `value_rollback` é uma referência
 * privada ao componente (§20.7) — nunca deve aparecer no snapshot público da
 * máquina nem em `onChange`. Este hook só conhece `value`/`state` (via
 * snapshot) e o `onChange` do contrato controlado (§15.2/§15.3); ele nunca
 * decide o estado da máquina por conta própria.
 */
import { useCallback, useEffect, useState } from 'react'
import type { FotografiaValue, FotografoDeFacesState } from './types'

export type ReviewPhase = 'nenhuma' | 'trocar-ou-limpar' | 'confirmar-ou-cancelar'

export interface UseReviewWindowOptions {
  value: FotografiaValue
  state: FotografoDeFacesState
  onChange: (value: FotografiaValue) => void
  /** null = revisão desligada; 0 = janela aberta até decisão do usuário; >0 = expira em ms (§04.8). */
  reviewFor?: number | null
}

export interface UseReviewWindowResult {
  phase: ReviewPhase
  trocar: () => void
  limpar: () => void
  confirmar: () => void
  cancelar: () => void
}

export function useReviewWindow(options: UseReviewWindowOptions): UseReviewWindowResult {
  const { value, state, onChange, reviewFor = null } = options

  // `value_rollback` (§04.7): privado a este hook, nunca repassado ao onChange
  // além do já previsto em cancelar(). null = nenhuma revisão pendente.
  const [rollback, setRollback] = useState<FotografiaValue>(null)
  // Distingue "acabei de guardar o rollback" (value ainda igual a ele, por
  // definição) de "cancelar() já propôs a reversão e estou esperando a
  // aplicação ecoar" — sem isso, os dois momentos são indistinguíveis só
  // comparando value === rollback.
  const [awaitingCancelEcho, setAwaitingCancelEcho] = useState(false)
  const isReviewing = rollback !== null

  const phase: ReviewPhase =
    reviewFor === null
      ? 'nenhuma'
      : isReviewing
        ? 'confirmar-ou-cancelar'
        : state === 'FOTOGRAFIA_PRONTA'
          ? 'trocar-ou-limpar'
          : 'nenhuma'

  const startReview = useCallback(() => {
    // §04.9/§04.10: guarda o valor atual antes de propor null, e só propõe —
    // não assume que a troca já aconteceu (§15.2).
    setRollback(value)
    onChange(null)
  }, [value, onChange])

  const trocar = useCallback(() => {
    if (phase === 'trocar-ou-limpar') startReview()
  }, [phase, startReview])

  const limpar = useCallback(() => {
    if (phase === 'trocar-ou-limpar') startReview()
  }, [phase, startReview])

  const confirmar = useCallback(() => {
    // §04.11: consolida o valor já exibido — não há novo onChange a disparar.
    if (rollback === null) return
    setRollback(null)
    setAwaitingCancelEcho(false)
  }, [rollback])

  const cancelar = useCallback(() => {
    // §04.12: propõe a reversão; value_rollback só é zerado quando `value`
    // (controlado pela aplicação) de fato refletir esse valor — ver efeito abaixo.
    if (rollback === null) return
    setAwaitingCancelEcho(true)
    onChange(rollback)
  }, [rollback, onChange])

  useEffect(() => {
    if (awaitingCancelEcho && value === rollback) {
      setRollback(null)
      setAwaitingCancelEcho(false)
    }
  }, [awaitingCancelEcho, value, rollback])

  // §04.8/§4.15: com reviewFor > 0, a janela expira e prevalece a confirmação
  // automaticamente — mas só conta o tempo havendo de fato uma foto exibida.
  useEffect(() => {
    if (phase !== 'confirmar-ou-cancelar') return
    if (!reviewFor) return
    if (value === null) return
    const timeoutId = setTimeout(() => setRollback(null), reviewFor)
    return () => clearTimeout(timeoutId)
  }, [phase, reviewFor, value])

  return { phase, trocar, limpar, confirmar, cancelar }
}
