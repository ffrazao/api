# FotografoDeFaces — Referência da especificação para a F1 (máquina de estados)

> Extraído e reorganizado a partir do documento "FotografoDeFaces" (especificação completa,
> 20 seções). Este arquivo cobre **apenas** o necessário para a F1. Seções como Face Lock (§08),
> seleção da melhor face no quiosque (§09), tratamento/contrato da fotografia final (§12–§13, §17)
> e as ações de revisão Trocar/Limpar/Confirmar/Cancelar (§7.7, §15.4) ficam **fora do escopo da F1**
> — entram em fases posteriores (F4, F6, F7).

## §06 — Máquina de estados

### §06.1 Os 8 estados

- **AGUARDANDO** — estado inicial e de retorno. Não há candidata selecionada. Só neste estado,
  no modo quiosque, uma nova pessoa pode se tornar candidata.
- **DETECTANDO** — o componente procura uma ou mais faces. Detectar uma face ainda não
  significa que ela esteja apta.
- **AVALIANDO** — existe uma candidata sendo verificada continuamente contra os critérios
  de qualidade (enquadramento, distância, pose, nitidez, iluminação, estabilidade, posicionamento).
  No quiosque, a candidata deve estar protegida pelo Face Lock (mecanismo implementado só na F4/F7;
  na F1, trate como uma informação que o reducer recebe, não que ele calcula).
- **PRONTO** — a candidata atual atende a todos os critérios. Só neste estado uma captura pode
  ser efetivamente disparada. PRONTO não significa que a fotografia já foi produzida.
- **CRONOMETRANDO** — usado somente quando `autoCaptureAfter > 0`. Representa a espera entre
  PRONTO e o disparo automático. Se a candidata deixar de atender aos critérios durante a
  contagem, o disparo não ocorre e o componente volta para AGUARDANDO.
- **CAPTURANDO** — estado transitório em que a fotografia está sendo efetivamente produzida.
  Nenhum novo disparo é aceito enquanto durar.
- **FOTOGRAFIA_PRONTA** — existe um valor de fotografia atualmente disponível em `value`
  (pode ter vindo de uma captura, ou ter sido fornecido/alterado pela aplicação).
- **ERRO** — uma operação de captura ou tratamento não conseguiu produzir uma fotografia válida.

### §06.2 Relação entre `value` e o estado

```
value = null            → AGUARDANDO
value = fotografia       → FOTOGRAFIA_PRONTA
```
Essa regra vale tanto para uma fotografia produzida pelo próprio componente quanto para uma
fornecida inicialmente ou alterada pela aplicação hospedeira. **A máquina de estados deve reagir
a mudanças de `value` vindas de fora**, não só a eventos internos de captura.

### §06.3 Transições principais

Fluxo sem captura automática:
```
AGUARDANDO → DETECTANDO → AVALIANDO → PRONTO → CAPTURANDO → FOTOGRAFIA_PRONTA
```
Fluxo com captura automática temporizada:
```
AGUARDANDO → DETECTANDO → AVALIANDO → PRONTO → CRONOMETRANDO → CAPTURANDO → FOTOGRAFIA_PRONTA
```

### §06.4 Perda da candidata

Se, durante AVALIANDO, PRONTO ou CRONOMETRANDO, a candidata deixar de atender às condições
necessárias, o retorno é sempre:
```
AGUARDANDO → DETECTANDO
```
Esse retorno é deliberado — inicia um novo ciclo de busca. No modo quiosque, isso é
especialmente importante: a perda da candidata protegida pelo Face Lock **não** deve fazer
outra face assumir automaticamente o foco. Só depois do retorno a AGUARDANDO pode ocorrer
nova seleção.

### §06.5 Cancelamento do disparo automático

```
CRONOMETRANDO ──condição mantida──▶ CAPTURANDO
CRONOMETRANDO ──condição perdida──▶ AGUARDANDO → DETECTANDO
```
O término do cronômetro é condição **necessária, mas não suficiente** — a candidata precisa
continuar apta no exato momento do disparo.

### §06.6 Captura manual

No modo manual, o botão de captura só é disponibilizado quando o estado é PRONTO.
Regra única, vale tanto para o botão interno quanto para `capture()` via ref:
**não existe captura válida fora de PRONTO.**

### §06.9 Regra fundamental da máquina

> Nenhuma fotografia poderá ser capturada enquanto o componente não estiver no estado PRONTO.

Essa regra deve ser respeitada pelo botão interno de captura, pelos comandos do `useRef` e
pelos mecanismos automáticos de disparo, sem exceção.

---

## §07 — Comportamento de cada estado (relevante à F1)

- **7.1 AGUARDANDO**: sem candidata selecionada; Face Lock inativo; nenhuma captura em
  andamento; pronto para nova busca; no quiosque, uma nova pessoa pode virar candidata.
- **7.2 DETECTANDO**: nos modos autorretrato/assistido, avança para AVALIANDO só com
  exatamente uma face detectada (nenhuma face = continua procurando; mais de uma = não avança).
  No quiosque, várias faces podem coexistir; o componente seleciona uma única candidata e
  aplica o Face Lock (lógica de seleção real fica para F4/F7 — na F1, modele a transição como
  dependente de um "candidato selecionado" já resolvido externamente).
- **7.3 AVALIANDO**: candidata sendo analisada continuamente; avança para PRONTO quando todos
  os critérios são atendidos (o cálculo dos critérios em si é da F4 — na F1, trate como um
  booleano/objeto de qualidade recebido pelo reducer).
- **7.4 PRONTO**: candidata monitorada continuamente; Face Lock ativo quando aplicável;
  fotografia ainda não produzida. Comportamento de `autoCaptureAfter`:
  - `null` → permanece em PRONTO aguardando disparo manual;
  - `0` → inicia imediatamente o processo de captura (vai direto a CAPTURANDO);
  - `> 0` → avança para CRONOMETRANDO.
- **7.5 CRONOMETRANDO**: existe só com captura automática temporizada. Durante toda a
  contagem, o componente continua avaliando a candidata. Se a candidata for perdida, volta
  a AGUARDANDO sem disparar; se permanecer apta até o fim, avança a CAPTURANDO.
- **7.6 CAPTURANDO**: disparo bloqueado para novos comandos enquanto dura. Se a fotografia for
  produzida corretamente → FOTOGRAFIA_PRONTA; se houver falha → ERRO.
- **7.8 ERRO**: impede que uma fotografia inválida seja considerada produzida com sucesso;
  mantém o estado consistente; impede novos disparos enquanto a operação estiver
  impossibilitada. Conforme a natureza da falha, pode retornar a AGUARDANDO ou permanecer em
  ERRO até uma ação explícita.
- **7.9 Molduras (referência, implementação visual fica para fase de UI)**: nenhuma face → não
  exibir; face(s) detectada(s)/candidata em avaliação → amarela; candidata aprovada em PRONTO →
  verde; fotografia produzida → azul; falha → vermelha.
- **7.11 Regra de consistência**: nenhuma informação (visual ou via `useRef`) deve indicar que
  uma fotografia está pronta para captura quando a máquina não estiver efetivamente em PRONTO.
  O botão de captura só pode estar habilitado quando o disparo for permitido.

> **Nota de escopo**: §7.7 (comportamento de FOTOGRAFIA_PRONTA com `reviewFor`, ações Trocar/
> Limpar/Confirmar/Cancelar e `value_rollback`) fica **fora da F1**. Na F1, FOTOGRAFIA_PRONTA é
> tratado apenas como "existe um `value` não nulo", sem as ações de revisão.

---

## §10 — Timer e estabilidade (resumo aplicável à F1)

A propriedade `autoCaptureAfter` controla se e quando ocorre disparo automático:
- `null` → nunca dispara sozinho, precisa de `capture()` explícito;
- `0` → dispara imediatamente ao atingir PRONTO;
- `> 0` (segundos) → entra em CRONOMETRANDO, aguarda a contagem, e só dispara se a candidata
  continuar apta ao final.

Movimento incompatível com uma boa fotografia durante a contagem, ou perda da candidata,
deve cancelar a contagem e retornar a AGUARDANDO. A regra fundamental do timer:
**o término do cronômetro nunca é, sozinho, motivo suficiente para capturar.**

---

## §11 — Regras de captura manual (resumo aplicável à F1)

- Condição obrigatória para capturar: estado é PRONTO.
- `capture()` não significa "capturar a qualquer custo" — se chamado fora de PRONTO, deve
  simplesmente não realizar a captura (nunca lançar exceção por isso).
- Chamado durante CAPTURANDO, o comando deve ser bloqueado (nenhum novo disparo é aceito).
- Regra fundamental: a mesma regra vale para o botão interno e para o `useRef` — não existe
  captura válida fora de PRONTO.

---

## §15.1–15.3 — Contrato controlado (`value`/`onChange`), parte aplicável à F1

- `onChange` comunica uma **alteração no valor atual** do componente — não é, em si, uma
  "confirmação" de fotografia. Segue o padrão de componente controlado do React:
  ```jsx
  const [foto, setFoto] = useState(null);
  <FotografoDeFaces value={foto} onChange={setFoto} />
  ```
- O componente nunca deve tratar o simples disparo de `onChange` como substituição imediata
  de sua fonte de verdade — ele continua operando com o `value` que a aplicação devolver.
- (As ações Trocar/Limpar/Confirmar/Cancelar que também usam `onChange`, descritas em §15.4,
  ficam para a F6.)

---

## §16 — API imperativa via `useRef` (contrato completo, relevante à F1)

A API deve ser pequena, previsível e não pode permitir que a aplicação burle a máquina de
estados (§16.11) — não pode existir `forceReady()` nem `forceCapture()`.

| Método | Finalidade |
|---|---|
| `capture()` | Solicita captura; só é efetivada se o estado for PRONTO. Fora de PRONTO, não faz nada (sem lançar exceção). |
| `restart()` | Retorna o componente ao ciclo de AGUARDANDO (ver §19 abaixo). |
| `setFullscreen(boolean)` | Ativa/desativa apresentação em tela cheia (implementação real de UI fica para fase de UI — na F1, só o contrato de tipo). |
| `getState()` | Retorna um retrato do estado atual: `{ state, message, value, quality, timer, candidate, mode }`. |
| `getValue()` | Retorna exatamente o `value` atual (`Blob` ou `null`) — nunca um conceito diferente de "confirmado". |
| `getMessage()` | Retorna a mensagem de orientação atual. |
| `getQuality()` | Retorna os indicadores de qualidade usados internamente (só leitura — a aplicação não pode alterar os critérios). |
| `getTimer()` | Retorna o estado do cronômetro quando houver um ativo. |

Princípio geral (§16.13): o `useRef` permite consultar e solicitar ações, **nunca** assumir o
controle das regras internas (detecção, seleção de candidato, avaliação de qualidade, Face
Lock, estabilidade, decisão de PRONTO, cronômetro, captura, tratamento da fotografia,
`value_rollback`, consistência da máquina).

---

## §19 — Comportamento de `restart()` (resumo por estado, relevante à F1)

Regra fundamental (§19.18): `restart()` encerra o ciclo atual, cancela operações transitórias,
desfaz o Face Lock, interrompe cronômetros pendentes, abandona fotografias em avaliação e
devolve o componente a AGUARDANDO, **preservando a última fotografia confirmada**.

Comportamento por estado de origem:
- **AGUARDANDO**: permanece no estado, sem efeito perceptível.
- **DETECTANDO**: interrompe avaliação atual, descarta candidatos temporários, volta a
  AGUARDANDO e inicia novo ciclo de detecção.
- **AVALIANDO**: descarta a candidata atual (não tenta preservá-la); nova seleção só depois de
  voltar a AGUARDANDO.
- **CRONOMETRANDO**: cancela o cronômetro imediatamente; contador zerado; não pode concluir a
  captura depois.
- **PRONTO**: abandona a condição de prontidão; a candidata deixa de estar bloqueada; nenhuma
  captura automática pendente é executada depois do reinício.
- **CAPTURANDO**: impede que o resultado daquela operação seja considerado uma nova fotografia
  confirmada; descarta o resultado se ainda não tiver sido finalizado/confirmado.
- **FOTOGRAFIA_PRONTA**: se havia uma fotografia em avaliação (fluxo de revisão, fora do
  escopo da F1), ela é descartada; a fotografia confirmada anterior permanece válida.
- **ERRO**: `restart()` é uma forma válida de solicitar nova tentativa; limpa o contexto
  transitório da falha. Se a causa persistir, o componente deve permanecer na condição
  apropriada — `restart()` não deve mascarar uma falha permanente.

Outras regras importantes:
- `restart()` **não** dispara `onChange` — não altera `value` por si só (§19.14–19.15).
- `restart()` sempre encerra qualquer Face Lock existente (§19.2) — mesmo que a pessoa
  continue diante da câmera, ela deve ser tratada como nova candidata em um novo ciclo (§19.17).