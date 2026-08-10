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

    // A aplicação hospedeira reage ao onChange(null): value cai, a busca recomeça.
    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('confirmar-ou-cancelar')

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

describe('useReviewWindow — Trocar -> Cancelar restaura a foto original (§13.7)', () => {
  it('reemite onChange(fotoOriginal) e só zera o rollback quando value refletir a reversão', () => {
    const original = fakePhoto('original')
    const onChange = vi.fn()

    const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
      initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
    })

    act(() => result.current.trocar())
    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('confirmar-ou-cancelar')

    act(() => result.current.cancelar())
    expect(onChange).toHaveBeenLastCalledWith(original)

    // Antes de a aplicação ecoar o valor restaurado, a revisão continua pendente.
    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('confirmar-ou-cancelar')

    // Assim que `value` reflete a foto original, o rollback é zerado.
    rerender({ value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('trocar-ou-limpar')
  })
})

describe('useReviewWindow — Limpar -> Confirmar consolida o estado limpo (§13.8)', () => {
  it('permite confirmar diretamente sobre value=null, sem precisar de nova captura', () => {
    const original = fakePhoto('original')
    const onChange = vi.fn()

    const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
      initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
    })

    act(() => result.current.limpar())
    expect(onChange).toHaveBeenCalledWith(null)

    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('confirmar-ou-cancelar')

    act(() => result.current.confirmar())
    rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })
    expect(result.current.phase).toBe('nenhuma')
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

  it('não conta tempo enquanto não houver foto exibida (value nulo após Limpar)', () => {
    vi.useFakeTimers()
    try {
      const original = fakePhoto('original')
      const onChange = vi.fn()

      const { result, rerender } = renderHook((props: UseReviewWindowOptions) => useReviewWindow(props), {
        initialProps: { value: original, state: 'FOTOGRAFIA_PRONTA', onChange, reviewFor: 3000 },
      })

      act(() => result.current.limpar())
      rerender({ value: null, state: 'AGUARDANDO', onChange, reviewFor: 3000 })

      act(() => {
        vi.advanceTimersByTime(10_000)
      })

      expect(result.current.phase).toBe('confirmar-ou-cancelar')
    } finally {
      vi.useRealTimers()
    }
  })
})
