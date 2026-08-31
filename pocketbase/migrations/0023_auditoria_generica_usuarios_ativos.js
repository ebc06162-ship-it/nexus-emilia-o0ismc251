migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('ativo')) {
      users.fields.add(new BoolField({ name: 'ativo' }))
    }
    app.save(users)

    const userRecords = app.findRecordsByFilter(users, 'ativo = false')
    for (var i = 0; i < userRecords.length; i++) {
      userRecords[i].set('ativo', true)
      app.save(userRecords[i])
    }

    const auditoria = new Collection({
      name: 'auditoria',
      type: 'base',
      listRule:
        '@request.auth.id != "" && @request.auth.ativo = true && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")',
      viewRule:
        '@request.auth.id != "" && @request.auth.ativo = true && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'ator_id',
          type: 'relation',
          collectionId: users.id,
          required: false,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'ator_nome', type: 'text', required: false, max: 160 },
        { name: 'papel', type: 'text', required: false, max: 60 },
        { name: 'objeto_tipo', type: 'text', required: true, max: 120 },
        { name: 'objeto_id', type: 'text', required: false, max: 80 },
        { name: 'acao', type: 'text', required: true, max: 80 },
        { name: 'campo', type: 'text', required: false, max: 120 },
        { name: 'motivo', type: 'text', required: false, max: 240 },
        { name: 'origem', type: 'text', required: false, max: 160 },
        {
          name: 'resultado',
          type: 'select',
          values: ['permitido', 'negado', 'falha'],
          required: true,
          maxSelect: 1,
        },
        { name: 'trace_id', type: 'text', required: false, max: 120 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE INDEX idx_auditoria_created ON auditoria (created)',
        'CREATE INDEX idx_auditoria_ator ON auditoria (ator_id)',
        'CREATE INDEX idx_auditoria_resultado ON auditoria (resultado)',
      ],
    })
    app.save(auditoria)
    console.log('Migration 0023 completed: active users and generic append-only audit collection')
  },
  (app) => {
    console.log('Migration 0023 down: audit records and user active state are preserved')
  },
)
