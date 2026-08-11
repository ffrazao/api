import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FotografoDeFaces } from './FotografoDeFaces'
import metaSandbox from './FotografoDeFaces.stories'
import type { FotografoDeFacesHandle, FotografoDeFacesProps } from './FotografoDeFaces'
import type {
  Candidate,
  FotografiaValue,
  FotografoDeFacesMode,
  FotografoDeFacesState,
  Quality,
  TimerState,
} from './types'

/**
 * Painel de depuração ao vivo — SOMENTE observabilidade.
 *
 * Nada aqui altera critério de validação, threshold ou lógica de detecção:
 * o painel só lê, a cada 200ms, o que a API imperativa da F7 (§16) já expõe
 * publicamente — `getState()` e `getQuality()`. Nenhum dado é inventado.
 *
 * Nota importante sobre o que dá para ver: `getQuality()` devolve os 7
 * critérios como BOOLEANOS (mais o agregado `aprovada`). Os valores numéricos
 * brutos (variância do Laplaciano, luminância média, yaw/pitch/roll) são
 * calculados dentro de faceMetrics.ts e reduzidos a booleano antes de chegar
 * ao snapshot — expô-los exigiria mexer no motor, que esta tarefa proíbe.
 */

const INTERVALO_POLL_MS = 200

type SandboxProps = Omit<FotografoDeFacesProps, 'value' | 'onChange'>

interface Leitura {
  em: number
  state: FotografoDeFacesState
  message: string
  mode: FotografoDeFacesMode
  value: { type: string; size: number } | null
  quality: Quality | null
  /** Lido por `getQuality()`, separado de `getState().quality`, para exercitar os dois métodos. */
  qualityDireto: Quality | null
  candidate: Candidate | null
  timer: TimerState | null
}

function lerDoComponente(handle: FotografoDeFacesHandle): Leitura {
  const snapshot = handle.getState()
  return {
    em: Date.now(),
    state: snapshot.state,
    message: snapshot.message,
    mode: snapshot.mode,
    value: snapshot.value ? { type: snapshot.value.type, size: snapshot.value.size } : null,
    quality: snapshot.quality,
    qualityDireto: handle.getQuality(),
    candidate: snapshot.candidate,
    timer: snapshot.timer,
  }
}

/** Só o conteúdo observável — o carimbo de tempo fica de fora para detectar congelamento. */
function assinatura(leitura: Leitura): string {
  const { em: _em, ...conteudo } = leitura
  void _em
  return JSON.stringify(conteudo)
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
      <span style={{ color: '#666' }}>{rotulo}</span>
      <span style={{ fontWeight: 600, textAlign: 'right' }}>{valor}</span>
    </div>
  )
}

function Criterio({ rotulo, ok }: { rotulo: string; ok: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
      <span style={{ color: '#666' }}>{rotulo}</span>
      <span style={{ fontWeight: 700, color: ok ? '#0b7a3b' : '#a11' }}>{ok ? 'OK' : 'FALHA'}</span>
    </div>
  )
}

/**
 * O polling vive AQUI, e não no wrapper, de propósito: assim o re-render de
 * 5×/s fica contido neste componente irmão e nunca re-renderiza o
 * `FotografoDeFaces`. Um painel de diagnóstico que perturbasse o componente
 * observado poderia mascarar justamente o bug que se quer enxergar.
 */
function PainelDeDepuracao({ alvo }: { alvo: React.RefObject<FotografoDeFacesHandle | null> }) {
  const [leitura, setLeitura] = useState<Leitura | null>(null)
  const [mudancas, setMudancas] = useState(0)
  const [ultimaMudancaEm, setUltimaMudancaEm] = useState<number | null>(null)
  const [agora, setAgora] = useState(() => Date.now())
  const assinaturaAnterior = useRef<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setAgora(Date.now())

      const handle = alvo.current
      if (!handle) return

      const nova = lerDoComponente(handle)
      setLeitura(nova)

      const assinaturaNova = assinatura(nova)
      if (assinaturaAnterior.current !== assinaturaNova) {
        assinaturaAnterior.current = assinaturaNova
        setMudancas((total) => total + 1)
        setUltimaMudancaEm(nova.em)
      }
    }, INTERVALO_POLL_MS)

    return () => clearInterval(id)
  }, [alvo])

  const congeladoHaMs = ultimaMudancaEm === null ? null : agora - ultimaMudancaEm
  const criterios = leitura?.quality?.criteria

  return (
    <aside
      style={{
        width: 300,
        padding: 12,
        borderRadius: 8,
        border: '1px solid #ddd',
        background: '#fafafa',
        color: '#111',
        font: '12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <strong style={{ fontSize: 13 }}>Depuração ao vivo (poll {INTERVALO_POLL_MS}ms)</strong>

      {/* Detector de congelamento: é isto que distingue "threshold não atingido"
          (o conteúdo continua mudando) de "loop morreu" (nada muda mais). */}
      <section style={{ background: '#fff', padding: 8, borderRadius: 6, border: '1px solid #eee' }}>
        <Linha rotulo="mudanças observadas" valor={String(mudancas)} />
        <Linha
          rotulo="última mudança há"
          valor={congeladoHaMs === null ? '—' : `${(congeladoHaMs / 1000).toFixed(1)}s`}
        />
        <div style={{ marginTop: 6, color: congeladoHaMs !== null && congeladoHaMs > 3000 ? '#a11' : '#0b7a3b' }}>
          {congeladoHaMs !== null && congeladoHaMs > 3000
            ? 'CONGELADO (>3s sem mudança) — o ciclo pode ter morrido'
            : 'variando — o ciclo está vivo'}
        </div>
      </section>

      {leitura === null ? (
        <span style={{ color: '#666' }}>aguardando a primeira leitura…</span>
      ) : (
        <>
          <section>
            <Linha rotulo="state" valor={leitura.state} />
            <Linha rotulo="mode" valor={leitura.mode} />
            <Linha rotulo="value" valor={leitura.value ? `${leitura.value.type} ${leitura.value.size}B` : 'null'} />
          </section>

          <section>
            <div style={{ color: '#666' }}>message</div>
            <div style={{ fontWeight: 600 }}>{leitura.message}</div>
          </section>

          <section>
            <div style={{ color: '#666', marginBottom: 4 }}>
              quality {leitura.quality ? `(aprovada: ${leitura.quality.aprovada ? 'SIM' : 'NÃO'})` : ''}
            </div>
            {criterios ? (
              <>
                <Criterio rotulo="enquadramento" ok={criterios.enquadramento} />
                <Criterio rotulo="posicionamento" ok={criterios.posicionamento} />
                <Criterio rotulo="distancia" ok={criterios.distancia} />
                <Criterio rotulo="pose" ok={criterios.pose} />
                <Criterio rotulo="nitidez" ok={criterios.nitidez} />
                <Criterio rotulo="iluminacao" ok={criterios.iluminacao} />
                <Criterio rotulo="estabilidade" ok={criterios.estabilidade} />
              </>
            ) : (
              <span style={{ color: '#666' }}>null (nenhuma candidata sendo avaliada)</span>
            )}
            <div style={{ marginTop: 4, color: '#666' }}>
              getQuality(): {leitura.qualityDireto ? 'mesmo objeto do snapshot' : 'null'}
            </div>
          </section>

          <section>
            <div style={{ color: '#666', marginBottom: 4 }}>candidate</div>
            {leitura.candidate ? (
              <>
                <Linha rotulo="id" valor={leitura.candidate.id} />
                <Linha rotulo="locked" valor={String(leitura.candidate.locked ?? false)} />
              </>
            ) : (
              <span style={{ color: '#666' }}>null</span>
            )}
          </section>

          <section>
            <div style={{ color: '#666', marginBottom: 4 }}>timer</div>
            {leitura.timer ? (
              <Linha
                rotulo="restante / total"
                valor={`${leitura.timer.remainingSeconds}s / ${leitura.timer.totalSeconds}s`}
              />
            ) : (
              <span style={{ color: '#666' }}>null</span>
            )}
          </section>
        </>
      )}
    </aside>
  )
}

function WrapperComDepuracao(props: SandboxProps) {
  const [value, setValue] = useState<FotografiaValue>(null)
  const handle = useRef<FotografoDeFacesHandle>(null)

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ width: 480, height: 360 }}>
        <FotografoDeFaces {...props} ref={handle} value={value} onChange={setValue} />
      </div>
      <PainelDeDepuracao alvo={handle} />
    </div>
  )
}

const meta = {
  title: 'FotografoDeFaces/Depuração',
  component: WrapperComDepuracao,
  parameters: {
    docs: {
      description: {
        component: [
          'Painel de depuração ao vivo, lendo `getState()` e `getQuality()` pela API imperativa (F7)',
          'a cada 200ms. **Só observabilidade** — nenhum threshold, critério ou lógica de detecção',
          'foi alterado para esta história.',
          '',
          '**Como usar para diagnosticar:** mexa na frente da câmera e observe o bloco do topo.',
          'Se `mudanças observadas` continua subindo e `última mudança há` fica perto de zero, o',
          'ciclo de detecção está vivo — e a detecção "não reconhecer" é um critério reprovando',
          '(veja qual está em FALHA). Se o contador trava e o tempo desde a última mudança cresce',
          'sem parar, o ciclo morreu — o problema é de ciclo de vida, não de threshold.',
          '',
          '**Limite do que dá para ver aqui:** `getQuality()` expõe os 7 critérios como booleanos,',
          'não os valores numéricos brutos. Os números são reduzidos a booleano dentro do motor',
          '(faceMetrics.ts) antes de chegarem ao snapshot público.',
          '',
          '**Controls:** os mesmos controles do sandbox da F10 valem aqui, então dá para mexer em',
          '`autoCaptureAfter`, `reviewFor`, `mode` e nos adornos visuais sem trocar de história —',
          'o painel continua observando o mesmo componente enquanto as props mudam.',
        ].join('\n'),
      },
    },
  },
  /**
   * Reaproveita a MESMA definição de argTypes do sandbox da F10, importada de
   * lá — e não uma cópia. Assim os controles das duas famílias de história não
   * têm como divergir quando as props do componente mudarem.
   */
  argTypes: metaSandbox.argTypes,
  args: {
    mode: 'autorretrato',
    autoCaptureAfter: null,
    reviewFor: null,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: true,
  },
} satisfies Meta<typeof WrapperComDepuracao>

export default meta

type Story = StoryObj<typeof meta>

/**
 * Captura manual e sem janela de revisão: o ciclo fica em DETECTANDO/AVALIANDO/
 * PRONTO indefinidamente, que é justamente onde se quer observar os critérios.
 */
export const PainelAoVivo: Story = {}

/**
 * Mesmo painel no modo quiosque, para observar a seleção da melhor face e o
 * Face Lock (§08, §09) — repare em `candidate.id` mudando ou se mantendo.
 */
export const PainelAoVivoQuiosque: Story = {
  args: {
    mode: 'quiosque',
    showFramingGuide: false,
  },
}
