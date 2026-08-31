migrate(
  (app) => {
    const authenticated = '@request.auth.id != "" && @request.auth.papel != ""'
    const adminOrManagement = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")`
    const operational = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento")`
    const readOperational = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento" || @request.auth.papel = "financeiro" || @request.auth.papel = "producao")`
    const auditRead = adminOrManagement

    const writableCollections = [
      'clientes',
      'participantes',
      'oportunidades',
      'dados_entrega',
      'cerimonialistas',
      'contatos_cerimonialistas',
      'grupos_parceiros',
      'empresas_parceiros',
      'contatos_parceiros',
      'unidades_parceiros',
      'contatos_unidades_parceiros',
      'eventos',
      'pessoas',
      'clientes_pessoas',
      'locais_entrega',
      'enderecos_pessoas',
      'enderecos_entrega',
      'pendencias',
    ]
    for (var i = 0; i < writableCollections.length; i++) {
      const collection = app.findCollectionByNameOrId(writableCollections[i])
      collection.listRule = readOperational
      collection.viewRule = readOperational
      collection.createRule = operational
      collection.updateRule = operational
      collection.deleteRule = null
      app.save(collection)
    }

    const catalogo = app.findCollectionByNameOrId('catalogo_itens')
    catalogo.listRule = readOperational
    catalogo.viewRule = readOperational
    catalogo.createRule = adminOrManagement
    catalogo.updateRule = adminOrManagement
    catalogo.deleteRule = null
    app.save(catalogo)

    const historico = app.findCollectionByNameOrId('historico_eventos')
    historico.listRule = auditRead
    historico.viewRule = auditRead
    historico.createRule = operational
    historico.updateRule = null
    historico.deleteRule = null
    app.save(historico)

    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.listRule = adminOrManagement
    users.viewRule = adminOrManagement
    users.createRule = adminOrManagement
    users.updateRule = `${adminOrManagement} || id = @request.auth.id`
    users.deleteRule = null
    app.save(users)

    console.log('Migration 0021 completed: corrected role predicates and protected auth management')
  },
  (app) => {
    console.log(
      'Migration 0021 down: rules must be restored explicitly; no records or logs are deleted',
    )
  },
)
