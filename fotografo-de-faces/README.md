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
requisição externa em tempo de execução. **Não é preciso baixar nada:** os 4
arquivos de peso já vêm dentro do pacote instalado, em
`node_modules/@seagri/fotografo-de-faces/public/models/`. Basta copiá-los para
o diretório público da sua aplicação:

```bash
mkdir -p public/models
cp -r node_modules/@seagri/fotografo-de-faces/public/models/. public/models/
```

O `/.` no fim da origem faz o comando copiar o *conteúdo* do diretório, e não o
diretório em si — assim ele é idempotente e não cria `public/models/models` se
você rodar de novo. Junto dos pesos vem um `README.md`, inofensivo; se preferir,
copie só os quatro `*_model-*`.

O caminho servido precisa bater com a prop `modelsUrl`, cujo padrão é `/models`.
Se você servir de outro lugar, aponte a prop para lá:

```tsx
<FotografoDeFaces modelsUrl="/assets/face-models" value={value} onChange={setValue} />
```

### Automatizando a cópia (opcional)

Se não quiser depender de um passo manual, dá para deixar a cópia acontecer a
cada `npm install` — isso é uma conveniência, **não** um requisito:

```json
{
  "scripts": {
    "postinstall": "mkdir -p public/models && cp -r node_modules/@seagri/fotografo-de-faces/public/models/. public/models/"
  }
}
```

Em equipes com Windows, use [`shx`](https://www.npmjs.com/package/shx) para o
mesmo comando funcionar em qualquer sistema (`npm install --save-dev shx`):

```json
{
  "scripts": {
    "postinstall": "shx mkdir -p public/models && shx cp -r node_modules/@seagri/fotografo-de-faces/public/models/* public/models/"
  }
}
```

Vale lembrar que `postinstall` roda a cada instalação de dependências, inclusive
na CI — some ~560 KB ao seu diretório público a cada vez. Se o seu `public/` é
versionado, é mais previsível copiar uma vez e commitar os arquivos.

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

`download:models` serve só para (re)baixar os pesos em `public/models/` **neste
repositório**, quando for preciso atualizá-los ou restaurá-los. Quem instala o
pacote não precisa dele — nem teria acesso, já que os `scripts` do
`package.json` não ficam disponíveis para consumidores: os pesos já vão
publicados junto, como descrito em
[Modelos de IA](#modelos-de-ia-obrigatório).
