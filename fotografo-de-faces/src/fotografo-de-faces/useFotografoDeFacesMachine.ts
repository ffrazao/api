/**
 * Hook público que expõe a máquina de estados via useReducer — F1.
 *
 * Ainda não está ligado a um componente visual nem a um `ref` imperativo de
 * verdade (isso é da fase de UI/integração); aqui só existe o essencial para
 * consumir o reducer puro de machine.ts a partir de React.
 */
import { useCallback, useEffect, useReducer } from 'react'
import {
  createInitialMachineContext,
  fotografoDeFacesReducer,
  toSnapshot,
} from './machine'
import type { CreateMachineContextOptions } from './machine'
import type { FotografiaValue, FotografoDeFacesEvent, FotografoDeFacesSnapshot } from './types'

export type UseFotografoDeFacesMachineOptions = CreateMachineContextOptions

export interface UseFotografoDeFacesMachine {
  snapshot: FotografoDeFacesSnapshot
  dispatch: (event: FotografoDeFacesEvent) => void
  capture: () => void
  restart: () => void
  getState: () => FotografoDeFacesSnapshot
  getValue: () => FotografiaValue
}

export function useFotografoDeFacesMachine(
  options: UseFotografoDeFacesMachineOptions = {},
): UseFotografoDeFacesMachine {
  const [context, dispatch] = useReducer(
    fotografoDeFacesReducer,
    options,
    createInitialMachineContext,
  )

  // §06.2: reage a mudanças de `value` vindas de fora (prop controlada).
  useEffect(() => {
    if (options.value !== undefined) {
      dispatch({ type: 'EXTERNAL_VALUE_CHANGED', value: options.value })
    }
  }, [options.value])

  useEffect(() => {
    if (options.autoCaptureAfter !== undefined) {
      dispatch({ type: 'SET_AUTO_CAPTURE_AFTER', autoCaptureAfter: options.autoCaptureAfter })
    }
  }, [options.autoCaptureAfter])

  const capture = useCallback(() => dispatch({ type: 'CAPTURE_REQUESTED' }), [])
  const restart = useCallback(() => dispatch({ type: 'RESTART_REQUESTED' }), [])

  const snapshot = toSnapshot(context)
  const getState = useCallback(() => snapshot, [snapshot])
  const getValue = useCallback(() => context.value, [context.value])

  return { snapshot, dispatch, capture, restart, getState, getValue }
}
