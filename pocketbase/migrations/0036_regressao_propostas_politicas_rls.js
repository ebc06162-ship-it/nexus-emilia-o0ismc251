migrate(
  (app) => {
    const auth = '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    const composicaoLeitura =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento" || @request.auth.papel = "financeiro")'
    const composicaoEscrita =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento")'
    const politicaGestao =
      auth + ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")'
    const politicaLeitura =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento" || @request.auth.papel = "financeiro")'
    const auditoriaLeitura =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "financeiro")'
    const auditoriaCriacao =
      auth +
      ' && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento")'

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
    auditoriaPropostas.createRule = auditoriaCriacao
    auditoriaPropostas.updateRule = null
    auditoriaPropostas.deleteRule = null
    app.save(auditoriaPropostas)

    console.log('Migration 0036 completed: proposal, policy and audit RLS separated')
  },
  (app) => {
    const politicas = app.findCollectionByNameOrId('politicas_comerciais')
    politicas.listRule = '@request.auth.id != ""'
    politicas.viewRule = '@request.auth.id != ""'
    politicas.createRule = '@request.auth.id != ""'
    politicas.updateRule = '@request.auth.id != ""'
    politicas.deleteRule = null
    app.save(politicas)

    const propostas = app.findCollectionByNameOrId('propostas')
    propostas.listRule = '@request.auth.id != ""'
    propostas.viewRule = '@request.auth.id != ""'
    propostas.createRule = '@request.auth.id != ""'
    propostas.updateRule = '@request.auth.id != ""'
    propostas.deleteRule = null
    app.save(propostas)

    const itens = app.findCollectionByNameOrId('itens_proposta')
    itens.listRule = '@request.auth.id != ""'
    itens.viewRule = '@request.auth.id != ""'
    itens.createRule = '@request.auth.id != ""'
    itens.updateRule = '@request.auth.id != ""'
    itens.deleteRule = null
    app.save(itens)

    const auditoriaPropostas = app.findCollectionByNameOrId('auditoria_propostas')
    auditoriaPropostas.listRule = '@request.auth.id != ""'
    auditoriaPropostas.viewRule = '@request.auth.id != ""'
    auditoriaPropostas.createRule = '@request.auth.id != ""'
    auditoriaPropostas.updateRule = null
    auditoriaPropostas.deleteRule = null
    app.save(auditoriaPropostas)
  },
)
