migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('papel')) {
      users.fields.add(
        new SelectField({
          name: 'papel',
          values: [
            'administrador',
            'atendimento',
            'gestao',
            'financeiro',
            'producao',
            'cliente_externo',
          ],
          required: true,
          maxSelect: 1,
        }),
      )
    }
    app.save(users)

    const userRoles = {
      'fernanda@emiliabemcasados.local': 'administrador',
      'mara@emiliabemcasados.local': 'gestao',
      'anie@emiliabemcasados.local': 'atendimento',
    }
    for (var email in userRoles) {
      try {
        const user = app.findAuthRecordByEmail('_pb_users_auth_', email)
        user.set('papel', userRoles[email])
        app.save(user)
      } catch (e) {
        console.log('Usuário de homologação não encontrado: ' + email)
      }
    }

    const auth = '@request.auth.id != ""'
    const admin = '@request.auth.papel = "administrador"'
    const authenticated = `${auth} && (${admin} || @request.auth.papel != "")`
    const readOnly = `${authenticated}`
    const editableByOperations = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "atendimento" || @request.auth.papel = "gestao")`
    const managementOnly = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")`
    const auditRead = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")`

    const names = [
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
    ]
    for (var i = 0; i < names.length; i++) {
      const collection = app.findCollectionByNameOrId(names[i])
      collection.listRule = readOnly
      collection.viewRule = readOnly
      collection.createRule = editableByOperations
      collection.updateRule = editableByOperations
      collection.deleteRule = null
      app.save(collection)
    }

    const catalogo = app.findCollectionByNameOrId('catalogo_itens')
    catalogo.listRule = readOnly
    catalogo.viewRule = readOnly
    catalogo.createRule = managementOnly
    catalogo.updateRule = managementOnly
    catalogo.deleteRule = null
    app.save(catalogo)

    const pendencias = app.findCollectionByNameOrId('pendencias')
    pendencias.listRule = readOnly
    pendencias.viewRule = readOnly
    pendencias.createRule = editableByOperations
    pendencias.updateRule = editableByOperations
    pendencias.deleteRule = null
    app.save(pendencias)

    const historico = app.findCollectionByNameOrId('historico_eventos')
    historico.listRule = auditRead
    historico.viewRule = auditRead
    historico.createRule = editableByOperations
    historico.updateRule = null
    historico.deleteRule = null
    app.save(historico)

    console.log('Migration 0020 completed: F1-T011 roles, RLS and append-only audit protections')
  },
  (app) => {
    console.log(
      'Migration 0020 rollback preserves roles and audit records; restore rules manually if required',
    )
  },
)
