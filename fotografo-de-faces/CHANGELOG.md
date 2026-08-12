# Changelog

Todas as mudanças relevantes deste componente são registradas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [1.0.0-rc.1] - 2026-08-12

Primeira versão candidata: o componente está completo em relação à
especificação (seções 01 a 20) e estabilizado após a integração das fases.

### Adicionado

- **Componente `FotografoDeFaces`, estritamente controlado** (§15, §20.3): o par
  `value`/`onChange` é a única fonte de verdade. O componente nunca altera o
  próprio valor — só propõe um novo, e `onChange` jamais significa confirmação
  implícita da fotografia.
- **Máquina de estados** como referência central do ciclo: `AGUARDANDO` →
  `DETECTANDO` → `AVALIANDO` → `PRONTO` → `CRONOMETRANDO` (opcional) →
  `CAPTURANDO` → `FOTOGRAFIA_PRONTA` | `ERRO`. Nenhuma fotografia é capturada
  fora de `PRONTO` — nem pelo botão, nem pelo `ref`, nem por disparo automático
  (§06.9, §11.11).
- **Três modos de operação** (§03): `autorretrato` e `assistido` exigem
  exatamente uma face em cena; `quiosque` aceita várias, seleciona a de melhor
  qualidade geométrica/biométrica (nunca a maior ou mais próxima — §09.2,
  §09.9) e mantém o Face Lock nela por continuidade espacial entre quadros.
- **Motor de detecção e avaliação de qualidade** sobre a `face-api.js`
  (TinyFaceDetector + 68 landmarks), com os sete critérios obrigatórios:
  enquadramento, posicionamento, distância, pose, nitidez, iluminação e
  estabilidade (§08.10). Os pesos são carregados localmente, sem nenhuma
  requisição externa em tempo de execução.
- **Captura automática configurável** via `autoCaptureAfter`: imediata ao
  atingir `PRONTO` (`0`) ou após cronômetro regressivo visível (`> 0`). Perder a
  condição durante a contagem cancela o disparo (§06.5, §07.5).
- **Janela de revisão** via `reviewFor` (§04.8, §13.5): [Trocar]/[Limpar] com a
  fotografia pronta e [Confirmar]/[Cancelar] em seguida, com rollback privado
  que devolve a fotografia anterior intacta.
- **Pipeline de imagem** (§12, §17): recorte com margem de contexto a partir do
  `<video>` ao vivo — nunca de uma amostra de baixa resolução usada só para
  análise —, normalização do espelhamento (o preview do autorretrato é
  espelhado, a fotografia nunca) e saída em JPEG (`Blob`).
- **API imperativa via `ref`** (§16): `capture()`, `restart()`,
  `setFullscreen()`, `getState()`, `getValue()`, `getMessage()`, `getQuality()`
  e `getTimer()`. A API só solicita ações e consulta o que a máquina já decidiu,
  sempre pelas mesmas funções que governam o componente por dentro — não existe
  caminho paralelo capaz de burlar a máquina de estados (§16.11).
- **Acessibilidade WCAG 2.2 AA** (§4): região de status com `aria-live` sempre
  presente no DOM (mesmo com as mensagens visuais desligadas), controles
  operáveis por teclado e paleta cujo contraste é verificado por teste, e não
  escolhido no olho.
- **Tratamento de falhas de câmera e de captura** (§18, §19): permissão negada,
  dispositivo ausente ou ocupado e falhas de processamento levam a `ERRO` com
  mensagem de orientação, distinguindo falhas recuperáveis das permanentes. Uma
  fotografia já confirmada nunca é perdida silenciosamente por causa de um erro.
- **Distribuição** em ESM + CJS com tipos (`.d.ts`), pesos dos modelos
  incluídos no pacote e sandbox de Storybook com uma história por cenário.

### Corrigido

Estabilizações posteriores à conclusão das fases, todas com reprodução
determinística antes da correção:

- **Cache dos modelos de IA movido para escopo de módulo.** As redes da
  `face-api.js` são singletons do próprio módulo dela; memoizar o carregamento
  por instância fazia cada montagem do componente rebaixar os mesmos pesos e
  reinicializar as mesmas redes globais.
- **Corrida do `readyState` do vídeo.** Entregar ao motor um `<video>` ainda sem
  quadro decodificado deixava a promessa de `detect()` pendente para sempre —
  não resolvia, não rejeitava e nada aparecia no `catch`, travando o ciclo. O
  loop passou a exigir quadro decodificado e dimensões reais, com um cão de
  guarda que abandona o quadro em vez de deixar o ciclo inerte.
- **Recalibração do critério de estabilidade.** Os limiares foram remedidos com
  rosto real a 12fps: a variação passou a ser avaliada por média móvel de
  poucos quadros e pela variação **linear** da caixa (não pela área, que dobrava
  o ruído), evitando que um pico isolado do detector derrubasse `PRONTO`.
- **Cronômetro travando sob inferência lenta.** A contagem passou a ser derivada
  de um prazo em tempo real, e não de um acumulado de tiques: como a inferência
  roda na thread principal, um quadro caro prendia junto todos os
  temporizadores, esticando um cronômetro de 3s para 17s reais e deixando a
  contagem parada num número sem nunca capturar. Somaram-se a isso o
  **aquecimento (warm-up) do motor** antes de a detecção começar a valer — que
  reduziu a primeira inferência de ~4s para ~0,46s nas medições — e o
  **throttling dinâmico** do loop, que espaça os quadros proporcionalmente ao
  custo medido e devolve tempo de thread para a interface.
