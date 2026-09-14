// F3-T006 (corretiva): garantir os valores de status_operacional na instância.
// A 0043 adicionou os valores via push no array; na instância o select não os
// aceitou — esta migration substitui a lista explicitamente (idempotente).
migrate(
  (app) => {
    const pedidos = app.findCollectionByNameOrId('pedidos')
    const so = pedidos.fields.getByName('status_operacional')
    if (so) {
      const alvo = [
        'entrega',
        'falta_definicao',
        'em_alteracao',
        'previsao_entrega',
        'suspenso',
        'pronto_producao',
        'em_producao',
        'pronto_expedicao',
        'ocorrencia',
      ]
      so.values = alvo
      app.save(pedidos)
      console.log('Migration 0044 completed: status_operacional com valores de produção')
    }
  },
  (app) => {
    console.log('Migration 0044 down: sem acao (valores aditivos)')
  },
)
