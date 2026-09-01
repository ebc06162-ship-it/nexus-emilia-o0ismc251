# Contrato de entrada e fallback — v1

## Objetivo

Definir a entrada de eventos em homologação sem ativar Digisac, WhatsApp, GestãoClick ou qualquer endpoint externo.

## Envelope obrigatório

- `event_id`: identificador único do evento, usado para idempotência.
- `event_type`: `customer.created`, `opportunity.created` ou `opportunity.updated`.
- `payload_version`: nesta versão, somente `1.0`.
- `source_system`: origem declarada, sem conceder autorização por si só.
- `external_record_id`: identificador do registro na origem.
- `occurred_at` e `received_at`: timestamps ISO 8601.
- `data`: somente campos permitidos pelo schema.
- `trace_id`: rastreabilidade técnica sem dado pessoal.
- `test_mode`: obrigatório nas fixtures; deve ser `true`.

## Respostas do contrato

- `processed`: evento válido processado.
- `duplicate`: mesmo `event_id` e mesmo hash, sem nova criação.
- `integration_conflict`: mesmo `event_id` com conteúdo divergente; não escrever.
- `rejected`: schema inválido; não escrever no registro canônico.
- `manual_reconciliation`: destino indisponível ou caso que exige atendimento manual.

## Regras de segurança

- Nenhuma credencial é armazenada nas fixtures.
- Nenhum evento de fixture escreve em produção ou em sistema externo.
- A autenticação real ainda depende de B1-INT-01.
- O modo fixture usa `test_mode=true` e origem `fixture`.
- Logs devem registrar identificadores técnicos, não senhas, tokens ou dados pessoais desnecessários.

## Idempotência e erros

A chave de idempotência é `event_id`. O hash lógico do envelope é comparado quando o mesmo ID reaparece. Hash igual retorna `duplicate`; hash diferente retorna `integration_conflict`. Evento inválido retorna `rejected`. Timeout preserva o último estado confirmado e retorna `manual_reconciliation`, com `source_ref`, responsável e próxima ação.

## Fallback manual

O Atendimento continua pelo cadastro autorizado, registra o `source_ref` externo, motivo, último estado confirmado, responsável e próxima ação. Não há retry automático ou escrita externa nesta etapa.

## B1-INT-01

Permanece bloqueando ativação externa até confirmação de endpoint, método de autenticação, payload real, credencial de homologação, limites e autorização de escrita. F1-T013 fecha o contrato de homologação, não a conexão externa.
