import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useReviewWindow } from './useReviewWindow'
import type { UseReviewWindowOptions } from './useReviewWindow'

function fakePhoto(label = 'foto'): Blob {
  return new Blob([label], { type: 'image/jpeg' })
}

describe('useReviewWindow — fase inicial (§04.8, §13.4, §13.5)', () => {
  it('§04.8 — nenhuma ação quando reviewFor é null', () => {
    const { result } = renderHook(() =>
      useReviewWindow({ value: fakePhoto(), state: 'FOTOGRAFIA_PRONTA', onChange: vi.fn(), reviewFor: null }),
    )
    expect(result.current.phase).toBe('nenhuma')
  })

  it('§13.4 — mostra Trocar/Limpar ao chegar em FOTOGRAFIA_PRONTA com reviewFor ativo', () => {
    const { result } = renderHook(() =>
      useReviewWindow({ value: fakePhoto(), state: 'FOTOGRAFIA_PRONTA', onChange: vi.fn(), reviewFor: 3000 }),
    )
    expect(result.current.phase).toBe('trocar-ou-limpar')
  })

  it('não mostra ações fora de FOTOGRAFIA_PRONTA quando não há revisão pendente', () => {
    const { result } = renderHook(() =>
      useReviewWindow({ value: null, state: 'AGUARDANDO', onChange: vi.fn(), reviewFor: 3000 }),
    )
    expect(result.current.phase).toBe('nenhuma')
  })

  it('trocar()/limpar() fora da fase trocar-ou-limpar não fazem nada', () => {
    const onChange = vi.fn()
    const { result } = renderHook(() =>
      useReviewWindow({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 }),
    )
    act(() => {
      result.current.trocar()
      result.current.limpar()
    })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('useReviewWindow — Trocar -> captura -> Confirmar (§13.5)', () => {
  it('percorre o ciclo completo até consolidar a nova foto', () => {
    const original = fakePhoto('original')
    const onChange = vi.fn()

    const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
      initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
    })

    expect(result.current.phase).toBe('trocar-ou-limpar')

    act(() => result.current.trocar())
    expect(onChange).toHaveBeenCalledWith(null)

    // A aplicação hospedeira reage ao onChange(null): value cai, a busca
    // recomeça — e ainda não há decisão a tomar (§04.9, §20.7).
    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('nenhuma')

    // Uma nova captura é produzida e propõe o novo valor.
    const nova = fakePhoto('nova')
    rerender({ value: nova, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('confirmar-ou-cancelar')

    act(() => result.current.confirmar())
    rerender({ value: nova, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('trocar-ou-limpar')

    // Confirmar não propõe nenhum valor novo — só o onChange(null) do trocar() ocorreu.
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('useReviewWindow — Trocar -> nova captura -> Cancelar restaura a foto original (§13.7)', () => {
  it('reemite onChange(fotoOriginal) e só zera o rollback quando value refletir a reversão', () => {
    const original = fakePhoto('original')
    const nova = fakePhoto('nova')
    const onChange = vi.fn()

    const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
      initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
    })

    act(() => result.current.trocar())
    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
    rerender({ value: nova, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('confirmar-ou-cancelar')

    act(() => result.current.cancelar())
    expect(onChange).toHaveBeenLastCalledWith(original)

    // Antes de a aplicação ecoar o valor restaurado, a revisão continua pendente.
    rerender({ value: nova, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('confirmar-ou-cancelar')

    // Assim que `value` reflete a foto original, o rollback é zerado.
    rerender({ value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('trocar-ou-limpar')
    expect(result.current.rollbackValue).toBeNull()
  })
})

describe('useReviewWindow — Confirmar/Cancelar só depois da nova captura (§04.9, §04.10, §20.7)', () => {
  it.each([['trocar'], ['limpar']] as const)(
    '%s: nenhuma ação enquanto a nova captura não for consolidada — a regra é a mesma para os dois',
    (acao) => {
      const original = fakePhoto('original')
      const onChange = vi.fn()

      const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
        initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
      })

      act(() => result.current[acao]())
      expect(onChange).toHaveBeenCalledWith(null)

      // Ainda antes do eco da aplicação: `value` é o próprio rollback.
      expect(result.current.phase).toBe('nenhuma')

      // Depois do eco: o ciclo de captura recomeçou, sem decisão pendente.
      rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
      expect(result.current.phase).toBe('nenhuma')

      // Nem no meio do caminho (candidata avaliada, foto ainda não produzida).
      rerender({ value: null, state: 'PRONTO', onChange, reviewFor: 3000 })
      expect(result.current.phase).toBe('nenhuma')

      // Só a captura consolidada abre a decisão.
      rerender({ value: fakePhoto('nova'), state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
      expect(result.current.phase).toBe('confirmar-ou-cancelar')
    },
  )

  it('a operação em andamento não reabre Trocar/Limpar (o rollback não pode ser sobrescrito)', () => {
    const original = fakePhoto('original')
    const onChange = vi.fn()

    const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
      initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
    })

    act(() => result.current.trocar())
    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })

    act(() => result.current.trocar())
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(result.current.rollbackValue).toBe(original)
  })
})

describe('useReviewWindow — rollback exposto em leitura (§16.5, emenda v1.1)', () => {
  it('acompanha o ciclo de vida do value_rollback sem oferecer caminho de escrita', () => {
    const original = fakePhoto('original')
    const nova = fakePhoto('nova')
    const onChange = vi.fn()

    const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
      initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
    })

    expect(result.current.rollbackValue).toBeNull()

    act(() => result.current.trocar())
    expect(result.current.rollbackValue).toBe(original)

    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
    rerender({ value: nova, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
    // §13.10: `value` e `value_rollback` coexistindo é a situação legítima de
    // "alteração em andamento" — é exatamente ela que a aplicação precisa
    // enxergar para montar a comparação "Foto Anterior" × "Nova Captura".
    expect(result.current.rollbackValue).toBe(original)

    act(() => result.current.confirmar())
    expect(result.current.rollbackValue).toBeNull()
  })
})

describe('useReviewWindow — recuperação em ERRO (§18.13, §18.17, §05.1.1 item 4)', () => {
  it('mantém Cancelar ao alcance quando um erro interrompe a troca em andamento', () => {
    const original = fakePhoto('original')
    const onChange = vi.fn()

    const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
      initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
    })

    act(() => result.current.trocar())
    rerender({ value: null, state: 'ERRO', onChange, reviewFor: 3000 })

    expect(result.current.phase).toBe('recuperar')
    act(() => result.current.cancelar())
    expect(onChange).toHaveBeenLastCalledWith(original)
  })

  it('§05.1.1 item 4 — em ERRO com a fotografia reprovada em mãos, Trocar/Limpar são o caminho de saída', () => {
    const { result } = renderHook(() =>
      useReviewWindow({ value: fakePhoto(), state: 'ERRO', onChange: vi.fn(), reviewFor: 3000 }),
    )

    expect(result.current.phase).toBe('trocar-ou-limpar')
  })
})

describe('useReviewWindow — expiração de reviewFor (§04.8, §4.15)', () => {
  it('reviewFor > 0: confirma automaticamente ao expirar, sem novo onChange', () => {
    vi.useFakeTimers()
    try {
      const original = fakePhoto('original')
      const nova = fakePhoto('nova')
      const onChange = vi.fn()

      const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
        initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
      })

      act(() => result.current.trocar())
      rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
      rerender({ value: nova, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
      expect(result.current.phase).toBe('confirmar-ou-cancelar')

      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(result.current.phase).toBe('trocar-ou-limpar')
      expect(onChange).toHaveBeenCalledTimes(1) // só o onChange(null) do trocar()
    } finally {
      vi.useRealTimers()
    }
  })

  it('reviewFor = 0: a janela nunca expira sozinha', () => {
    vi.useFakeTimers()
    try {
      const original = fakePhoto('original')
      const nova = fakePhoto('nova')
      const onChange = vi.fn()

      const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
        initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 0 },
      })

      act(() => result.current.trocar())
      rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 0 })
      rerender({ value: nova, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 0 })

      act(() => {
        vi.advanceTimersByTime(60_000)
      })

      expect(result.current.phase).toBe('confirmar-ou-cancelar')
    } finally {
      vi.useRealTimers()
    }
  })

  it('não conta tempo antes de existir uma decisão a tomar (value nulo após Limpar)', () => {
    vi.useFakeTimers()
    try {
      const original = fakePhoto('original')
      const nova = fakePhoto('nova')
      const onChange = vi.fn()

      const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
        initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
      })

      act(() => result.current.limpar())
      rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      // O relógio da janela não correu enquanto não havia botões: assim que a
      // nova captura chega, o usuário recebe os 3000ms inteiros para decidir.
      rerender({ value: nova, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
      expect(result.current.phase).toBe('confirmar-ou-cancelar')

      act(() => {
        vi.advanceTimersByTime(2999)
      })
      expect(result.current.phase).toBe('confirmar-ou-cancelar')

      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(result.current.phase).toBe('trocar-ou-limpar')
    } finally {
      vi.useRealTimers()
    }
  })
})
