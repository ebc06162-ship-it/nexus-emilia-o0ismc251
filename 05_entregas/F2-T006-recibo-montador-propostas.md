# Recibo F2-T006 — Montador de cumulativos, alternativas e revisão

**Status:** implementação realizada; aguardando teste humano
**Data:** 2026-09-11
**Versão Preview:** 0.0.77
**Task:** F2-T006
**SPEC:** SPEC-2-001 — Composição versionada e proposta comercial

## O que foi criado

- Rota protegida `/propostas/nova`.
- Tela de montador de proposta.
- Seleção de cliente e oportunidade.
- Seleção somente de itens aprovados do catálogo.
- Inclusão de itens cumulativos, alternativas, serviços e observações.
- Grupo obrigatório para itens do tipo alternativa.
- Quantidade e ordem persistidas.
- Snapshots de código, label, versão do catálogo e composição.
- Resumo visual de grupos exclusivos.
- Salvamento de rascunho em `propostas` e `itens_proposta`.
- Auditoria de criação em `auditoria_propostas`.
- Bloqueio de envio para revisão quando não existe política comercial aprovada.

## Limites preservados

- Não calcula preço.
- Não soma alternativas.
- Não aplica frete, desconto ou adicional.
- Não escolhe precedência entre tabelas.
- Não envia proposta externamente.
- Não integra Stone, Pix ou outro serviço externo.
- Não libera produção.

## QA automatizado

Versão `0.0.77`:

- setup: passou
- análise estática: passou
- build: passou
- integrações: passou
- testes: passaram

## Verificação no Preview

- Rota `/propostas/nova` abriu autenticada.
- Catálogo aprovado foi carregado.
- Item aprovado apareceu no seletor.
- Item do tipo alternativa foi adicionado com grupo `embalagem`.
- `Enviar para revisão` permaneceu desabilitado sem política aprovada.
- O salvamento completo não foi considerado validado porque os dados de homologação disponíveis não apresentaram uma oportunidade vinculada ao cliente escolhido.

## Evidência esperada no teste humano

- Selecionar cliente e uma oportunidade do mesmo cliente.
- Adicionar item cumulativo.
- Adicionar duas alternativas no mesmo grupo.
- Confirmar que o grupo aparece como exclusivo e que não há soma automática.
- Salvar rascunho.
- Confirmar que o rascunho não contém preço calculado.
- Confirmar que revisão permanece bloqueada sem política aprovada.
