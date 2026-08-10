# @seagri/fotografo-de-faces

Componente React para captura assistida de fotografias de face: acessa a câmera,
detecta e avalia a qualidade da candidata (enquadramento, distância, pose,
nitidez, iluminação, estabilidade e posicionamento) e só então permite produzir
a fotografia, já recortada com margem de contexto e comprimida em JPEG.

## Instalação

```bash
npm install @seagri/fotografo-de-faces
```

As dependências abaixo são `peerDependencies` — a aplicação hospedeira é quem
as fornece (elas **não** vão embutidas no pacote):

```bash
npm install react react-dom styled-components
```

O motor de detecção (`face-api.js` e o `@tensorflow/tfjs-core` que ele usa) vai
empacotado junto: não é preciso instalá-los à parte.

## Modelos de IA (obrigatório)

O componente carrega os pesos da `face-api.js` **localmente**, sem nenhuma
requisição externa em tempo de execução. O pacote inclui os 4 arquivos em
`public/models/`; copie-os para o diretório público da sua aplicação:

```bash
cp -r node_modules/@seagri/fotografo-de-faces/public/models public/models
```

Se preferir servi-los de outro caminho, aponte a prop `modelsUrl` para ele
(o padrão é `/models`).

## Uso

O componente é **estritamente controlado**: ele nunca altera o próprio valor —
propõe um novo via `onChange` e espera a aplicação devolvê-lo em `value`.

```tsx
import { useRef, useState } from 'react'
import { FotografoDeFaces } from '@seagri/fotografo-de-faces'
import type { FotografoDeFacesHandle } from '@seagri/fotografo-de-faces'

export function MinhaTela() {
  const [foto, setFoto] = useState<Blob | null>(null)
  const fotografo = useRef<FotografoDeFacesHandle>(null)

  return (
    // O componente preenche 100% do contêiner — quem define o tamanho é você.
    <div style={{ width: 640, height: 480 }}>
      <FotografoDeFaces
        ref={fotografo}
        value={foto}
        onChange={setFoto}
        mode="autorretrato"
        autoCaptureAfter={3}
        reviewFor={5000}
        showMessages
        showFaceFrame
        showFramingGuide
      />
    </div>
  )
}
```

### Propriedades

| Prop | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `value` | `Blob \| null` | — | Fotografia atual (contrato controlado). |
| `onChange` | `(value: Blob \| null) => void` | — | Recebe cada novo valor proposto. |
| `mode` | `'autorretrato' \| 'assistido' \| 'quiosque'` | `'autorretrato'` | Modo de operação. |
| `autoCaptureAfter` | `number \| null` | `null` | `null`: só manual; `0`: imediato; `> 0`: segundos de cronômetro. |
| `reviewFor` | `number \| null` | `null` | Janela de revisão: `null` desliga; `0` fica aberta; `> 0` expira em ms. |
| `showMessages` | `boolean` | `false` | Exibe as mensagens de orientação. |
| `showFaceFrame` | `boolean` | `false` | Exibe as molduras coloridas por estado. |
| `showFramingGuide` | `boolean` | `false` | Exibe a guia oval de enquadramento. |
| `modelsUrl` | `string` | `'/models'` | Caminho local dos pesos da `face-api.js`. |

O componente nunca aceita `width`/`height`/`cameraWidth`/`cameraHeight`: ele se
adapta ao contêiner do hospedeiro.

### API imperativa (`ref`)

`capture()`, `restart()`, `setFullscreen(ativo)`, `getState()`, `getValue()`,
`getMessage()`, `getQuality()` e `getTimer()`. A API só solicita ações e
consulta estado — não existe forma de forçar uma transição ou capturar fora do
estado `PRONTO`.

## Desenvolvimento

```bash
npm run dev              # aplicação de demonstração
npm run storybook        # sandbox interativo com todas as histórias
npm run test             # suíte de testes unitários
npm run lint             # oxlint
npm run build            # build de distribuição (ESM + CJS + .d.ts)
npm run download:models  # baixa os pesos da face-api.js para public/models/
```
