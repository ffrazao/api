# @ffrazao/fotografo-de-faces

Componente React para captura assistida de fotografias de face: acessa a câmera,
detecta e avalia a qualidade da candidata (enquadramento, distância, pose,
nitidez, iluminação, estabilidade e posicionamento) e só então permite produzir
a fotografia, já recortada com margem de contexto e comprimida em JPEG.

## Instalação a partir do GitHub Packages

O pacote é publicado no **GitHub Packages**, não no registro público do npm.
Antes de instalar, crie um `.npmrc` na raiz do projeto que vai consumi-lo:

```
@ffrazao:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

`NPM_TOKEN` precisa ser um GitHub Personal Access Token com a permissão
`read:packages` — o GitHub Packages exige autenticação para instalar, mesmo em
pacotes públicos. Mantenha o token fora do `.npmrc` versionado: a sintaxe
`${NPM_TOKEN}` acima lê a variável de ambiente na hora da instalação, então
basta exportá-la no seu ambiente (`export NPM_TOKEN=ghp_...`) ou defini-la como
segredo na CI.

## Instalação

```bash
npm install @ffrazao/fotografo-de-faces
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
`node_modules/@ffrazao/fotografo-de-faces/public/models/`. Basta copiá-los para
o diretório público da sua aplicação:

```bash
mkdir -p public/models
cp -r node_modules/@ffrazao/fotografo-de-faces/public/models/. public/models/
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
    "postinstall": "mkdir -p public/models && cp -r node_modules/@ffrazao/fotografo-de-faces/public/models/. public/models/"
  }
}
```

Em equipes com Windows, use [`shx`](https://www.npmjs.com/package/shx) para o
mesmo comando funcionar em qualquer sistema (`npm install --save-dev shx`):

```json
{
  "scripts": {
    "postinstall": "shx mkdir -p public/models && shx cp -r node_modules/@ffrazao/fotografo-de-faces/public/models/* public/models/"
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
import { FotografoDeFaces } from '@ffrazao/fotografo-de-faces'
import type { FotografoDeFacesHandle } from '@ffrazao/fotografo-de-faces'

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
| `showFramingGuide` | `boolean` | `false` | Exibe a guia oval de enquadramento. Ignorada no modo `quiosque` (§07.9.1). |
| `modelsUrl` | `string` | `'/models'` | Caminho local dos pesos da `face-api.js`. |

O componente nunca aceita `width`/`height`/`cameraWidth`/`cameraHeight`: ele se
adapta ao contêiner do hospedeiro.

### API imperativa (`ref`)

`capture()`, `restart()`, `setFullscreen(ativo)`, `getState()`, `getValue()`,
`getRollbackValue()`, `getMessage()`, `getQuality()` e `getTimer()`. A API só
solicita ações e consulta estado — não existe forma de forçar uma transição ou
capturar fora do estado `PRONTO`.

`getState()` devolve `{ state, message, value, quality, timer, candidate, mode,
errorCode, rollbackValue }`. O `errorCode` identifica o motivo de um `ERRO` sem
depender da mensagem em português — inclusive `'INVALID_INITIAL_VALUE'`, usado
quando a fotografia fornecida na montagem não contém exatamente um rosto
identificável (§05.1.1). O `rollbackValue` (também disponível por
`getRollbackValue()`) é a fotografia anterior preservada durante uma operação
de revisão, útil para montar uma comparação "Foto Anterior" × "Nova Captura".
Ele é **estritamente somente-leitura**: não existe propriedade nem método que
escreva nele.

### Fluxo de revisão

Com `reviewFor` ativo e uma fotografia em tela, aparecem **[Trocar]** e
**[Limpar]**. Qualquer uma das duas preserva a fotografia atual no rollback
interno e propõe `onChange(null)`, devolvendo o componente ao ciclo de captura.
**[Confirmar]** e **[Cancelar]** só aparecem depois que uma nova fotografia for
capturada — é aí que existe, de fato, uma alteração a aceitar ou descartar
(§04.9, §04.10, §20.7). A diferença entre Trocar e Limpar está apenas na
intenção inicial do usuário.

## Limitações conhecidas

**Inferência na thread principal.** A inferência da `face-api.js` roda na thread
principal do navegador. O componente já mitiga os efeitos disso — aquece o motor
antes de a detecção começar a valer e espaça os quadros proporcionalmente ao
custo real medido, devolvendo tempo de thread para a interface — mas, em
máquinas fracas ou sem aceleração por GPU, quadros caros ainda concorrem com o
resto da página. Mover a inferência para um Web Worker é a otimização natural
seguinte, e continua em aberto: exigiria uma revisão de arquitetura do motor de
detecção, fora do escopo até aqui.

**Molduras em navegadores sem `ResizeObserver`.** As molduras do modo quiosque
são posicionadas atravessando o mapeamento geométrico de `object-fit: cover`, o
que exige saber o tamanho do contêiner em tempo de renderização — obtido por um
`ResizeObserver` sobre o elemento de vídeo. Onde a API não existir (navegadores
anteriores a 2020), o tamanho é medido uma vez na montagem: as molduras ficam
corretas, mas param de acompanhar redimensionamentos posteriores do contêiner
até que o componente volte a montar. Nos navegadores suportados pelo projeto a
API está disponível, então o caso é residual.

Vale ser preciso sobre o alcance disso: seria uma imprecisão **visual, da
posição da moldura desenhada sobre o preview**. A detecção facial em si, a
avaliação de qualidade e o recorte da fotografia capturada trabalham nas
coordenadas intrínsecas do vídeo e nunca dependem do tamanho do contêiner.

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
