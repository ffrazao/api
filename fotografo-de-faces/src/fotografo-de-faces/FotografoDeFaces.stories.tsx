import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FotografoDeFaces } from './FotografoDeFaces'
import type { FotografoDeFacesProps } from './FotografoDeFaces'
import type { FotografiaValue } from './types'

/** Props que o sandbox expõe: as públicas do componente, menos o par controlado. */
type SandboxProps = Omit<FotografoDeFacesProps, 'value' | 'onChange'>

/** Mostra a fotografia atual (o `value` que o hospedeiro guarda) e seus metadados. */
function PhotoPreview({ value }: { value: FotografiaValue }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  return (
    <aside
      style={{
        width: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        font: '13px/1.4 system-ui, sans-serif',
      }}
    >
      <strong>value (aplicação hospedeira)</strong>
      {value && objectUrl ? (
        <>
          <img
            src={objectUrl}
            alt="Fotografia capturada pelo componente"
            style={{ width: '100%', borderRadius: 8, border: '1px solid #ccc' }}
          />
          <span>
            {value.type} — {(value.size / 1024).toFixed(1)} KB
          </span>
        </>
      ) : (
        <span style={{ color: '#666' }}>null (nenhuma fotografia confirmada)</span>
      )}
    </aside>
  )
}

/**
 * O FotografoDeFaces é estritamente controlado (§15.2, §20.3): ele nunca muda
 * o próprio `value`, só propõe um novo via `onChange`. Este wrapper faz o
 * papel da aplicação hospedeira — guarda o `value` num `useState` e devolve o
 * que o componente propuser. É isso que faz [Trocar]/[Limpar]/[Confirmar]/
 * [Cancelar] funcionarem de verdade aqui dentro (§04.13, §13.5).
 */
function StatefulFotografoWrapper(props: SandboxProps) {
  const [value, setValue] = useState<FotografiaValue>(null)

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* §20.10: o componente não aceita width/height — ele preenche o contêiner que o pai der. */}
      <div style={{ width: 480, height: 360 }}>
        <FotografoDeFaces {...props} value={value} onChange={setValue} />
      </div>
      <PhotoPreview value={value} />
    </div>
  )
}

/**
 * Ativação exclusiva da câmera na página Docs — restrito ao Storybook.
 *
 * A página Docs (autodocs) monta TODAS as histórias deste arquivo de uma vez,
 * e o template do Storybook ainda repete a primeira no bloco "Primary": são 8
 * instâncias do FotografoDeFaces simultâneas na mesma aba.
 *
 * O que foi medido nesse cenário (Chrome headless, câmera USB real, página
 * Docs completa por 45s):
 *   - Câmera: as 8 chamadas de `getUserMedia()` foram TODAS concedidas, com
 *     tracks `live` e quadros chegando nos 8 `<video>`. Nenhum NotReadableError,
 *     nenhum erro de câmera no Console. O Chrome compartilha uma única captura
 *     do dispositivo entre os clientes da mesma aba, então não há disputa de
 *     hardware — a suspeita original não se confirmou.
 *   - CPU: é aqui que a página quebra. Com as 8 instâncias, cada quadro de
 *     detecção passou a custar de 2,3s a 10,4s na thread principal, o watchdog
 *     do loop chegou a abandonar quadro por estouro dos 4s, e NENHUMA das
 *     instâncias saiu de DETECTANDO em 45s. A mesma história sozinha
 *     (`viewMode=story`) não emitiu um único aviso de custo de quadro e chegou
 *     a FOTOGRAFIA_PRONTA em ~8s.
 *
 * Ou seja: 8 loops de face-api.js disputando uma thread principal inutilizam
 * até a história que o leitor está olhando. A correção é manter no máximo UMA
 * instância viva por vez na página Docs, sob ativação explícita.
 *
 * Nada disto vale fora da página Docs: em `viewMode=story` o decorator devolve
 * a história intocada, e o componente publicado não é afetado de forma alguma.
 */
const inscritos = new Set<(idAtivo: number | null) => void>()
let idAtivo: number | null = null
let proximoId = 0

function ativarExclusivo(id: number | null) {
  idAtivo = id
  inscritos.forEach((notificar) => notificar(idAtivo))
}

function CameraSobDemanda({ children }: { children: ReactNode }) {
  const [id] = useState(() => ++proximoId)
  const [ativo, setAtivo] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const notificar = (novoAtivo: number | null) => setAtivo(novoAtivo === id)
    inscritos.add(notificar)
    return () => {
      inscritos.delete(notificar)
    }
  }, [id])

  // Rolou para fora da tela: libera a câmera sozinho. Assim o leitor não deixa
  // uma instância trabalhando lá em cima enquanto lê o resto da documentação.
  //
  // O desligamento só vale DEPOIS de a história ter aparecido na tela pelo
  // menos uma vez. Sem essa guarda, o primeiro disparo do observador — que
  // chega com `isIntersecting: false` quando a história ativada está abaixo da
  // dobra — desmontava o componente no mesmo instante em que ele acabara de
  // pedir a câmera. Isso foi observado de verdade: a ativação sem rolagem
  // registrava a chamada de `getUserMedia()` e voltava ao placeholder, enquanto
  // a mesma ativação com a história visível seguia até FOTOGRAFIA_PRONTA.
  useEffect(() => {
    if (!ativo) return
    const alvo = containerRef.current
    if (!alvo) return
    let jaApareceu = false
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          jaApareceu = true
          return
        }
        if (jaApareceu && idAtivo === id) ativarExclusivo(null)
      },
      { threshold: 0 },
    )
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [ativo, id])

  return (
    <div ref={containerRef}>
      {ativo ? (
        children
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            width: 700,
            height: 360,
            borderRadius: 8,
            border: '1px dashed #bbb',
            background: '#fafafa',
            color: '#444',
            font: '13px/1.5 system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <strong>Câmera desligada nesta história</strong>
          <p style={{ margin: 0, maxWidth: 460 }}>
            A página Docs monta as 7 histórias juntas. Rodar todos os detectores ao mesmo tempo
            satura a thread principal e trava até a história em foco, então aqui só uma fica viva
            por vez — ativar esta desliga a anterior.
          </p>
          <button
            type="button"
            onClick={() => ativarExclusivo(id)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #888',
              background: '#fff',
              cursor: 'pointer',
              font: 'inherit',
              fontWeight: 600,
            }}
          >
            Ativar câmera nesta história
          </button>
          <span style={{ color: '#777' }}>
            Abrir a história pela barra lateral roda a câmera normalmente, sem esta trava.
          </span>
        </div>
      )}
    </div>
  )
}

const meta = {
  title: 'FotografoDeFaces/Sandbox',
  component: StatefulFotografoWrapper,
  tags: ['autodocs'],
  /**
   * Só a página Docs recebe a trava (§ ver comentário de CameraSobDemanda). Em
   * `viewMode=story` a história é renderizada exatamente como antes.
   */
  decorators: [
    (Story, context) =>
      context.viewMode === 'docs' ? (
        <CameraSobDemanda>
          <Story />
        </CameraSobDemanda>
      ) : (
        <Story />
      ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Sandbox do `FotografoDeFaces`. O componente é **estritamente controlado**: o painel à direita',
          'mostra o `value` que a aplicação hospedeira guarda, atualizado só via `onChange`.',
          '',
          '**Câmera:** o preview do Storybook roda num `<iframe>`, e `getUserMedia()` exige',
          '`allow="camera"` nele. O `.storybook/manager-head.html` já aplica isso automaticamente.',
          'Se o navegador ainda assim negar, o componente não quebra — ele entra em ERRO com uma',
          'mensagem de orientação (§05.11, §18.8). Para testar sem o iframe, abra a história como',
          'documento de topo em `/iframe.html?id=<id-da-historia>`.',
          '',
          '**Modelos de IA:** carregados de `/models` (servido de `public/`), sem nenhuma requisição',
          'externa. Se ainda não os baixou, rode `npm run download:models`.',
          '',
          '**Nesta página de documentação, a câmera começa desligada em todas as histórias.** Esta',
          'página monta as 7 de uma vez, e 7 detectores simultâneos saturam a thread principal a',
          'ponto de travar até a história que você está olhando — medido em ~2,3s a 10,4s por quadro',
          'de detecção, contra nenhum aviso de custo com uma instância só. Use o botão **Ativar',
          'câmera nesta história** para ligar uma por vez; ativar outra desliga a anterior, e rolar',
          'a história para fora da tela também a desliga. Abrindo a história pela barra lateral',
          '(`viewMode=story`), nada disso se aplica — ela roda normalmente.',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    mode: {
      control: 'radio',
      options: ['autorretrato', 'quiosque', 'assistido'],
      description: '§03 — modo de operação: muda a regra de contagem de faces e o Face Lock.',
    },
    autoCaptureAfter: {
      control: 'select',
      options: [null, 0, 3, 5],
      description:
        '§04.1–§04.3, §10.1 — `null`: só captura manual; `0`: dispara ao atingir PRONTO; `> 0`: segundos de cronômetro.',
    },
    reviewFor: {
      control: 'select',
      options: [null, 0, 3000, 8000],
      description:
        '§04.8 — `null`: sem janela de revisão; `0`: aberta até o usuário decidir; `> 0`: expira em ms, confirmando.',
    },
    showMessages: { control: 'boolean', description: '§14.1 — mensagens de orientação.' },
    showFaceFrame: { control: 'boolean', description: '§20.4, §07.9 — molduras coloridas por estado.' },
    showFramingGuide: {
      control: 'boolean',
      description:
        '§02.1 item 4, §20.4 — guia oval de enquadramento. §07.9.1: ignorada no modo quiosque, onde o enquadramento é dinâmico.',
    },
    modelsUrl: { control: 'text', description: 'Caminho local dos pesos da face-api.js (padrão `/models`).' },
  },
  args: {
    mode: 'autorretrato',
    autoCaptureAfter: null,
    reviewFor: null,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: true,
  },
} satisfies Meta<typeof StatefulFotografoWrapper>

export default meta

type Story = StoryObj<typeof meta>

/**
 * §03.1 — autorretrato: exige exatamente uma face em cena, guia oval visível
 * para a pessoa se posicionar sozinha e captura no botão manual. O preview
 * aparece espelhado (experiência de selfie), mas a fotografia gerada nunca é
 * espelhada (§17.9/§17.10).
 */
export const Autorretrato: Story = {
  args: {
    mode: 'autorretrato',
    autoCaptureAfter: 0,
    reviewFor: null,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: true,
  },
}

/**
 * §03.2, §09 — quiosque: aceita várias faces na cena, escolhe a de melhor
 * qualidade (nunca a maior/mais próxima) e trava o foco nela. Todas as faces
 * ganham moldura amarela; só a travada evolui para verde ao chegar a PRONTO.
 * Dispara sozinho após 3s e abre uma janela de revisão de 8s.
 */
export const Quiosque: Story = {
  args: {
    mode: 'quiosque',
    autoCaptureAfter: 3,
    reviewFor: null,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: false,
  },
}

/**
 * §03.3 — assistido: um operador conduz o enquadramento, então o disparo fica
 * manual e a janela de revisão fica aberta até ele decidir (`reviewFor: 0`).
 */
export const Assistido: Story = {
  args: {
    mode: 'assistido',
    autoCaptureAfter: null,
    reviewFor: 0,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: false,
  },
}

/**
 * §04.2, §10.1 — `autoCaptureAfter: 0`: assim que a candidata é aprovada, a
 * captura começa imediatamente, sem passar por CRONOMETRANDO nem por botão.
 */
export const CapturaAutomaticaImediata: Story = {
  args: {
    mode: 'autorretrato',
    autoCaptureAfter: 0,
    reviewFor: null,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: true,
  },
}

/**
 * §04.3, §10.1 — cronômetro regressivo de 5s antes do disparo, com a contagem
 * visível. Se a candidata deixar de atender aos critérios durante a contagem,
 * o disparo é cancelado e o ciclo recomeça (§06.5).
 */
export const CronometroRegressivo: Story = {
  args: {
    mode: 'autorretrato',
    autoCaptureAfter: 5,
    reviewFor: null,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: true,
  },
}

/**
 * §04.8, §04.9, §04.10, §13.5 — janela de revisão: com a fotografia pronta
 * aparecem [Trocar] e [Limpar]; ao acionar qualquer uma delas, o valor anterior
 * vai para o rollback privado e o componente volta ao fluxo de captura.
 * [Confirmar] e [Cancelar] só entram em cena depois que uma NOVA captura for
 * consolidada — a regra vale igual para Trocar e para Limpar, já que "a
 * diferença entre as duas ações está apenas na intenção inicial" (§04.10). Com
 * `reviewFor: 0` a janela fica aberta indefinidamente, então dá tempo de
 * exercitar o ciclo todo.
 */
export const JanelaDeRevisao: Story = {
  args: {
    mode: 'autorretrato',
    autoCaptureAfter: null,
    reviewFor: 0,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: true,
  },
}

/**
 * §14.1, §20.4 — todos os adornos visuais desligados: sem mensagens, sem
 * moldura e sem guia. A região de status para leitores de tela continua
 * presente no DOM mesmo assim (§4.1.3, F8).
 */
export const SemAdornosVisuais: Story = {
  args: {
    mode: 'autorretrato',
    autoCaptureAfter: null,
    reviewFor: null,
    showMessages: false,
    showFaceFrame: false,
    showFramingGuide: false,
  },
}

/**
 * Mesmo componente das outras histórias, só que dentro de um contêiner que
 * VOCÊ redimensiona — arraste a alça no canto inferior direito da moldura
 * tracejada.
 *
 * Serve para conferir o posicionamento das molduras sob `object-fit: cover`
 * (§07.9, §09.6): o preview cobre o contêiner, então sempre que a proporção
 * dele difere da proporção nativa da câmera (tipicamente 4:3 ou 16:9) parte do
 * quadro fica cortada. A moldura precisa acompanhar o rosto atravessando esse
 * mesmo recorte — e ser cortada junto quando o rosto sai pela borda.
 *
 * Comece bem largo (o padrão, ~3,5:1), depois arraste para bem estreito e alto:
 * a moldura tem de continuar grudada no rosto nas duas pontas. O componente
 * continua sem aceitar qualquer prop de tamanho (§20.10) — quem manda no
 * tamanho é este contêiner.
 */
function ConteinerRedimensionavelWrapper(props: SandboxProps) {
  const [value, setValue] = useState<FotografiaValue>(null)

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          data-testid="conteiner-redimensionavel"
          style={{
            width: 900,
            height: 260,
            minWidth: 160,
            minHeight: 120,
            resize: 'both',
            overflow: 'hidden',
            outline: '2px dashed #888',
            outlineOffset: 4,
          }}
        >
          <FotografoDeFaces {...props} value={value} onChange={setValue} />
        </div>
        <span style={{ font: '13px/1.4 system-ui, sans-serif', color: '#666', maxWidth: 900 }}>
          Arraste a alça no canto inferior direito para mudar a proporção do contêiner.
        </span>
      </div>
      <PhotoPreview value={value} />
    </div>
  )
}

export const ConteinerRedimensionavel: Story = {
  args: {
    mode: 'quiosque',
    autoCaptureAfter: null,
    reviewFor: null,
    showMessages: true,
    showFaceFrame: true,
    showFramingGuide: false,
  },
  render: (args) => <ConteinerRedimensionavelWrapper {...args} />,
}
