/// <reference path="../pb_data/types.d.ts" />
// F3-T001 (SPEC-3-001): consolida o estado final pretendido da colisão de migrations 0036
// (0036_regressao_propostas_politicas_rls.js x 0036_rls_propostas_politicas.js) e adiciona
// os campos de cancelamento usados pelo hook de cancelamento (RN-3-003/004/005).
// Nenhum dado é apagado: apenas regras de acesso e campos aditivos.
migrate(
  (app) => {
    const auth = '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    const adminGestao = `${auth} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")`
    const composicaoLeitura =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento" || @request.auth.papel = "financeiro")'
    const composicaoEscrita =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento")'

    // Estado final pretendido = 0036_rls_propostas_politicas (o segundo arquivo da colisão)
    const politicas = app.findCollectionByNameOrId('politicas_comerciais')
    politicas.listRule = `${auth} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "financeiro" || (@request.auth.papel = "atendimento" && estado = "aprovada"))`
    politicas.viewRule = politicas.listRule
    politicas.createRule = adminGestao
    politicas.updateRule = adminGestao
    politicas.deleteRule = null
    app.save(politicas)

    const propostas = app.findCollectionByNameOrId('propostas')
    propostas.listRule = composicaoLeitura
    propostas.viewRule = composicaoLeitura
    propostas.createRule = composicaoEscrita
    propostas.updateRule = null
    propostas.deleteRule = null
    app.save(propostas)

    const itens = app.findCollectionByNameOrId('itens_proposta')
    itens.listRule = composicaoLeitura
    itens.viewRule = composicaoLeitura
    itens.createRule = composicaoEscrita
    itens.updateRule = null
    itens.deleteRule = null
    app.save(itens)

    const auditoriaPropostas = app.findCollectionByNameOrId('auditoria_propostas')
    auditoriaPropostas.listRule = adminGestao
    auditoriaPropostas.viewRule = adminGestao
    auditoriaPropostas.createRule = composicaoEscrita
    auditoriaPropostas.updateRule = null
    auditoriaPropostas.deleteRule = null
    app.save(auditoriaPropostas)

    // Campos aditivos de cancelamento em pedidos (RN-3-003/004/005)
    const pedidos = app.findCollectionByNameOrId('pedidos')
    pedidos.fields.add(new Field({ name: 'data_evento', type: 'date' }))
    pedidos.fields.add(
      new Field({
        name: 'cancelado_por',
        type: 'relation',
        collectionId: app.findCollectionByNameOrId('_pb_users_auth_').id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    pedidos.fields.add(new Field({ name: 'cancelado_em', type: 'date' }))
    pedidos.fields.add(new Field({ name: 'retencao_percentual', type: 'number' }))
    app.save(pedidos)

    console.log(
      'Migration 0037 completed: estado 0036 consolidado e campos de cancelamento adicionados',
    )
  },
  (app) => {
    // Down não destrutivo: restaura as regras da 0036_regressao_propostas_politicas_rls
    // (primeiro arquivo da colisão). Campos aditivos permanecem (removê-los destruiria dados).
    const auth = '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    const composicaoLeitura =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento" || @request.auth.papel = "financeiro")'
    const composicaoEscrita =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento")'
    const politicaGestao =
      auth + ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")'
    const auditoriaLeitura =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "financeiro")'

    const politicas = app.findCollectionByNameOrId('politicas_comerciais')
    politicas.listRule = politicaLeitura
    politicas.viewRule = politicaLeitura
    politicas.createRule = politicaGestao
    politicas.updateRule = politicaGestao
    politicas.deleteRule = null
    app.save(politicas)

    const propostas = app.findCollectionByNameOrId('propostas')
    propostas.listRule = composicaoLeitura
    propostas.viewRule = composicaoLeitura
    propostas.createRule = composicaoEscrita
    propostas.updateRule = null
    propostas.deleteRule = null
    app.save(propostas)

    const itens = app.findCollectionByNameOrId('itens_proposta')
    itens.listRule = composicaoLeitura
    itens.viewRule = composicaoLeitura
    itens.createRule = composicaoEscrita
    itens.updateRule = null
    itens.deleteRule = null
    app.save(itens)

    const auditoriaPropostas = app.findCollectionByNameOrId('auditoria_propostas')
    auditoriaPropostas.listRule = auditoriaLeitura
    auditoriaPropostas.viewRule = auditoriaLeitura
    auditoriaPropostas.createRule = composicaoEscrita
    auditoriaPropostas.updateRule = null
    auditoriaPropostas.deleteRule = null
    app.save(auditoriaPropostas)

    console.log('Migration 0037 down: regras da 0036a restauradas; campos aditivos preservados')
  },
)
