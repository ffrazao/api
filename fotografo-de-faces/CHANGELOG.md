# Changelog

Todas as mudanças relevantes deste componente são registradas aqui.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o
versionamento segue [SemVer](https://semver.org/lang/pt-BR/).

## [1.0.0-rc.3] - 2026-08-14

Correção de bug de implementação no modo quiosque, relatado a partir de teste
manual na história "Painel Ao Vivo Quiosque" (`autoCaptureAfter=3`): o
indicador visual da candidata travada pelo Face Lock alternava entre forma
circular e retangular (a cor por estado permanecia correta — só a geometria
falhava), e o cronômetro regressivo reiniciava repetidamente antes de
completar com sucesso. Nenhum dos dois sintomas decorre de ambiguidade da
especificação; são bugs de implementação, com causas raiz distintas
confirmadas por reprodução determinística antes da correção.

### Corrigido

- **Moldura da candidata travada virava oval no quiosque.** Um único quadro em
  que o motor de detecção não encontrava nenhuma face (ruído comum do
  detector, não perda de verdade) esvaziava a lista de faces visíveis mesmo
  com a candidata ainda dentro da tolerância de 700ms de perda. Como a
  renderização decidia entre moldura retangular e a oval de face única com
  base nessa lista, ela caía no fallback errado exatamente naquele quadro,
  voltando ao retângulo no seguinte — a alternância observada. A correção
  para de esvaziar a última moldura travada durante a janela de tolerância (só
  limpa de fato quando a perda é confirmada) e, como reforço, o quiosque nunca
  mais renderiza a moldura oval, em nenhuma circunstância.
- **Cronômetro reiniciando repetidamente no quiosque.** Causa distinta da
  anterior: mesmo com uma face encontrada em absolutamente todo quadro
  processado (o motor nunca deixava de detectar ninguém), o Face Lock exigia
  que a posição da face ficasse a menos de 25% da largura do quadro em
  relação ao último quadro combinado — um limiar fixo, indiferente ao tempo
  decorrido entre dois quadros processados. Sob um motor mais lento (quadros
  mais espaçados), um deslocamento normal da candidata já ultrapassava esse
  limiar e alimentava a mesma contagem de tolerância usada para sumiço total,
  cancelando o disparo sem a pessoa ter saído de cena. A correção deixa de
  exigir essa checagem de distância quando existe exatamente uma face no
  quadro — não há ambiguidade possível sobre "quem é quem" sem mais de uma
  candidata presente, e o componente não faz reconhecimento de identidade. A
  checagem por proximidade espacial continua obrigatória quando há duas ou
  mais faces em cena, para o Face Lock nunca "pular" para outra pessoa.

## [1.0.0-rc.2] - 2026-08-14

Estabilização de contratos e alinhamento com as emendas v1.1 da especificação
formal (`docs/especificacao-formal.md`), agora a fonte de verdade normativa do
projeto.

### Adicionado

- **Janela de tolerância no cronômetro** (§10.8.1): uma reprovação momentânea de
  qualidade durante `CRONOMETRANDO` passa a suspender a contagem por até 300ms
  em vez de cancelá-la de imediato. Recuperando os critérios dentro da janela, a
  contagem retoma de onde parou — o tempo congelado é devolvido ao prazo, então
  a captura nunca dispara adiantada. A perda total da face continua cancelando
  na hora, sem amortecimento. `TimerState` ganhou o campo `suspended`.
- **`getRollbackValue()` e `getState().rollbackValue`** (§16.5): acesso
  estritamente somente-leitura à fotografia preservada durante uma operação de
  revisão, para o hospedeiro montar comparações do tipo "Foto Anterior" × "Nova
  Captura". Nenhum caminho de escrita foi aberto (§20.7).
- **`getState().errorCode`** (§18.12): identifica o motivo de um `ERRO` sem
  depender da mensagem em português.
- **Validação passiva da fotografia inicial** (§05.1.1): montando o componente
  com `value = Blob`, os modelos são carregados e uma única passagem de detecção
  roda em segundo plano sobre a imagem. Sem exatamente um rosto identificável, o
  componente vai a `ERRO` com o código `INVALID_INITIAL_VALUE`; a fotografia não
  é apagada e a saída são as ações de revisão (§18.13). Falha de infraestrutura
  (modelos indisponíveis, imagem que não decodifica) não é tratada como
  reprovação.

### Corrigido

- **[Confirmar]/[Cancelar] apareciam cedo demais** (§04.9, §04.10, §20.7): os
  botões surgiam no clique de Trocar/Limpar, antes de existir qualquer nova
  captura para aceitar ou descartar. Agora só aparecem depois de uma nova
  fotografia consolidada, com a mesma regra para as duas ações — a diferença
  entre elas está apenas na intenção inicial (§04.10). Enquanto a operação
  estiver em andamento, Trocar/Limpar não reaparecem, o que impede sobrescrever
  o rollback. Se um erro interromper a operação, Cancelar permanece disponível
  para restaurar a fotografia anterior (§18.13, §18.17).

### Alterado

- **Símbolos visuais no modo quiosque** (§07.9.1): a guia oval fixa é forçada a
  oculta (o enquadramento no quiosque é dinâmico, §03.2), e as faces não
  travadas passam a exibir molduras amarelas finas e discretas. A candidata
  protegida pelo Face Lock preserva o mapeamento de cores do §07.9.

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
- **Disputa de CPU na página Docs do Storybook.** A página de documentação monta
  todas as histórias de uma vez, e os detectores simultâneos saturavam a thread
  principal: cada quadro passou a custar de 2,3s a 10,4s, o cão de guarda do
  loop chegou a abandonar quadros e nenhuma instância saiu de `DETECTANDO` em
  45s — enquanto a mesma história sozinha chegava a `FOTOGRAFIA_PRONTA` em ~8s.
  A suspeita inicial de disputa pelo dispositivo não se confirmou na medição:
  todas as chamadas de `getUserMedia()` foram concedidas, com tracks ativas. A
  página Docs passou a manter no máximo uma instância viva por vez, sob ativação
  explícita. Vale só para a documentação — o componente publicado não muda.
- **Precisão do posicionamento das molduras no modo quiosque.** A conversão da
  caixa da face para a tela usava escala uniforme, ignorando que o preview é
  exibido com `object-fit: cover`, que recorta um dos eixos quando a proporção do
  contêiner difere da proporção nativa da câmera. Medido no navegador, com
  câmera 640×480: num contêiner de 960×270 a moldura saía 50px abaixo do rosto e
  com 112px de altura em vez de 300px; num de 300×600 saía 84px à direita e com
  94px de largura em vez de 250px. A conversão passou a atravessar o mapeamento
  geométrico real do `cover` — escala pelo maior fator e desconto do excedente do
  eixo cortado —, usando o tamanho do contêiner observado em tempo de
  renderização (`ResizeObserver`), já que §20.10 deixa esse tamanho na mão da
  aplicação hospedeira. O desvio medido nos mesmos cenários caiu a zero.

<!--
  Ainda não existe tag git para nenhuma destas versões, então os links abaixo
  apontam para o diretório do componente no repositório — o alvo mais
  específico que de fato existe hoje. Quando as releases forem marcadas
  (`git tag`), troque-os pelas tags correspondentes, e passe a usar links de
  comparação entre versões nas entradas seguintes.
-->

[1.0.0-rc.3]: https://github.com/ffrazao/api/tree/main/fotografo-de-faces
[1.0.0-rc.2]: https://github.com/ffrazao/api/tree/main/fotografo-de-faces
[1.0.0-rc.1]: https://github.com/ffrazao/api/tree/main/fotografo-de-faces
