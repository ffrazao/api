/**
 * Superfície pública do pacote `@ffrazao/fotografo-de-faces` — F11.
 *
 * Só o que a aplicação hospedeira precisa para consumir o componente sai
 * daqui. Tudo o que é motor interno (máquina de estados, ciclo de vida da
 * câmera, detecção facial, métricas de qualidade, recorte/produção do Blob,
 * janela de revisão) fica encapsulado: expor esses módulos permitiria à
 * aplicação contornar as regras da máquina de estados, exatamente o que
 * §16.11 proíbe.
 *
 * Note que `FotografoDeFacesEvent` também NÃO é exportado de propósito —
 * despachar eventos direto na máquina seria outro caminho para burlar as
 * transições (§06.9, §16.11).
 */

// O componente (§01) e seus contratos de propriedades/ref (§16, §20.4).
export { FotografoDeFaces } from './fotografo-de-faces/FotografoDeFaces'
export type { FotografoDeFacesProps, FotografoDeFacesHandle } from './fotografo-de-faces/FotografoDeFaces'

// Tipos de estado operacional, valor, qualidade e erros (§06, §16.5).
export type {
  FotografoDeFacesState,
  FotografoDeFacesMode,
  FotografoDeFacesSnapshot,
  // §16.5 (emenda v1.1) — o que getState() devolve de fato: o snapshot da
  // máquina mais `rollbackValue` em leitura estrita.
  FotografoDeFacesPublicSnapshot,
  FotografiaValue,
  Quality,
  QualityCriteria,
  Candidate,
  TimerState,
  CameraAccessErrorReason,
  FotografoDeFacesErrorReason,
} from './fotografo-de-faces/types'
