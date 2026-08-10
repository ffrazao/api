import { useEffect, useState } from 'react'
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

const meta = {
  title: 'FotografoDeFaces/Sandbox',
  component: StatefulFotografoWrapper,
  tags: ['autodocs'],
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
    showFramingGuide: { control: 'boolean', description: '§02.1 item 4, §20.4 — guia oval de enquadramento.' },
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
 * §04.8, §13.5 — janela de revisão: com a fotografia pronta aparecem [Trocar]
 * e [Limpar]; ao acionar qualquer uma delas, o valor anterior vai para o
 * rollback privado e aparecem [Confirmar] e [Cancelar]. Com `reviewFor: 0` a
 * janela fica aberta indefinidamente, então dá tempo de exercitar o ciclo todo.
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
