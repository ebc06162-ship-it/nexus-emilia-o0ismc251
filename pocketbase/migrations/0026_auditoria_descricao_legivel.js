migrate(
  (app) => {
    const auditoria = app.findCollectionByNameOrId('auditoria')
    if (!auditoria.fields.getByName('descricao')) {
      auditoria.fields.add(new TextField({ name: 'descricao', max: 240 }))
    }
    app.save(auditoria)
    console.log('Migration 0026 completed: legible description field on audit collection')
  },
  (app) => {
    console.log('Migration 0026 down: audit description field preserved')
  },
)
