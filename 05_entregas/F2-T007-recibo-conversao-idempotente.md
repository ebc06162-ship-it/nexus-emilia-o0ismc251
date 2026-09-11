# Recibo F2-T007 — Estados, resposta e conversão idempotente

**Status:** implementação realizada; aguardando teste humano
**Data:** 2026-09-11
**Versão funcional:** 0.0.80
**Task:** F2-T007
**SPEC:** SPEC-2-002 — Aprovação, conversão e fila financeira controlada

## O que foi criado

- Migration `0031_pedidos_conversao.js`.
- Coleção `pedidos`, separada de `propostas`.
- Coleção append-only `auditoria_pedidos`.
- Relação `propostas.pedido_id`.
- Endpoint autenticado `POST /backend/v1/propostas/{id}/resposta`.
- Ações: `aprovar`, `recusar` e `devolver`.
- Conversão transacional e idempotente.

## Regras implementadas

- Proposta recusada vira `recusada` e não gera pedido.
- Proposta devolvida vira `em_revisao` e não gera pedido.
- Proposta expirada, substituída ou bloqueada não pode receber resposta.
- Aprovação exige política comercial aprovada e vigente.
- Primeira aprovação cria exatamente um pedido.
- Pedido recebe snapshots da proposta e dos itens.
- Pedido inicia com status comercial `aprovado`, operacional `entrega` e financeiro `aguardando_pagamento`.
- Nova tentativa de conversão encontra o pedido existente pela relação única com a proposta.
- A repetição retorna o mesmo pedido e cria evento `tentativa_conversao`.
- A conversão registra auditoria de proposta e de pedido.
- Não há liberação automática de produção, pagamento real ou integração externa.

## QA automatizado

Versão `0.0.80`:

- setup: passou
- análise estática: passou
- build: passou
- integrações: passou
- testes: passaram

## Prova backend executada

Com uma proposta de homologação nova, política aprovada e item de proposta:

- primeira resposta `aprovar`: criou pedido com `idempotente=false`;
- segunda resposta `aprovar`: retornou o mesmo pedido com `idempotente=true`;
- pedido retornado: `544almaps7cgga2`;
- status: `aprovada`, `entrega`, `aguardando_pagamento`;
- nenhuma liberação de produção ocorreu.

## Limites desta task

- Não cria comprovantes.
- Não confirma pagamento.
- Não integra Stone ou Pix.
- Não libera produção.
- Não implementa retiradas parciais.
