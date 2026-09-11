migrate(
  (app) => {
    const auth = '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    const adminGestao = `${auth} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")`
    const composicaoLeitura = `${auth} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento" || @request.auth.papel = "financeiro")`
    const composicaoEscrita = `${auth} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento")`

    const politicas = app.findCollectionByNameOrId('politicas_comerciais')
    politicas.listRule = `${auth} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "financeiro" || (@request.auth.papel = "atendimento" && estado = "aprovada"))`
    politicas.viewRule = `${auth} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "financeiro" || (@request.auth.papel = "atendimento" && estado = "aprovada"))`
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

    const auditoria = app.findCollectionByNameOrId('auditoria_propostas')
    auditoria.listRule = adminGestao
    auditoria.viewRule = adminGestao
    auditoria.createRule = composicaoEscrita
    auditoria.updateRule = null
    auditoria.deleteRule = null
    app.save(auditoria)
  },
  (app) => {
    const authenticated = '@request.auth.id != ""'
    const politicas = app.findCollectionByNameOrId('politicas_comerciais')
    politicas.listRule = authenticated
    politicas.viewRule = authenticated
    politicas.createRule = authenticated
    politicas.updateRule = authenticated
    politicas.deleteRule = null
    app.save(politicas)

    const propostas = app.findCollectionByNameOrId('propostas')
    propostas.listRule = authenticated
    propostas.viewRule = authenticated
    propostas.createRule = authenticated
    propostas.updateRule = authenticated
    propostas.deleteRule = null
    app.save(propostas)

    const itens = app.findCollectionByNameOrId('itens_proposta')
    itens.listRule = authenticated
    itens.viewRule = authenticated
    itens.createRule = authenticated
    itens.updateRule = authenticated
    itens.deleteRule = null
    app.save(itens)

    const auditoria = app.findCollectionByNameOrId('auditoria_propostas')
    auditoria.listRule = authenticated
    auditoria.viewRule = authenticated
    auditoria.createRule = authenticated
    auditoria.updateRule = null
    auditoria.deleteRule = null
    app.save(auditoria)
  },
)
