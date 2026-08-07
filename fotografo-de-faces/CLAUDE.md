# FotografoDeFaces — Regras Fundamentais

Este projeto implementa o componente React `FotografoDeFaces`, especificado em
documento próprio (20 seções, da 01. Objetivo à 20. Limites entre componente e aplicação).

## Papel do Claude Code aqui
Trabalhamos fase por fase (F1, F2, F3...). Nunca implemente uma fase além da que
foi pedida explicitamente na tarefa atual. Ao final de cada fase, pare e aguarde
revisão antes de seguir para a próxima.

## Invariantes que NUNCA podem ser violados (citações da especificação)
- Nenhuma fotografia pode ser capturada enquanto o componente não estiver no
  estado `PRONTO` — nem pelo botão interno, nem via `useRef`, nem por disparo
  automático (§06.9, §11.11).
- `onChange` comunica uma nova proposta de valor, nunca uma "confirmação"
  implícita de fotografia (§15.5).
- No modo quiosque, a perda da candidata protegida pelo Face Lock não transfere
  o foco automaticamente para outra face — só uma nova seleção após retorno a
  `AGUARDANDO` (§06.4, §19.16).
- Uma fotografia já confirmada (`value`) não pode ser perdida silenciosamente
  por causa de um erro (§18.13, §18.17).
- O componente deve encerrar todas as tracks de mídia da câmera ao desmontar,
  independentemente do estado atual (§05).

## Máquina de estados (referência central do componente)
AGUARDANDO → DETECTANDO → AVALIANDO → PRONTO → CRONOMETRANDO (opcional) →
CAPTURANDO → FOTOGRAFIA_PRONTA | ERRO

## Convenções deste projeto
- Editor de preferência do desenvolvedor: Sublime Text (`subl`).
- Um commit por fase concluída, mensagem no formato `feat(fN): descrição`.
- Testes da máquina de estados (Vitest) não dependem de câmera real — sempre mockar.