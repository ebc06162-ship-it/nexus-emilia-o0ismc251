migrate(
  (app) => {
    const pendencias = app.findCollectionByNameOrId('pendencias')
    const historico = app.findCollectionByNameOrId('historico_eventos')
    const add = (collection, field) => {
      if (!collection.fields.getByName(field.name)) collection.fields.add(field)
    }

    add(pendencias, new TextField({ name: 'campo', max: 120 }))
    add(pendencias, new TextField({ name: 'valor_atual', max: 500 }))
    add(pendencias, new TextField({ name: 'origem', max: 120 }))
    add(historico, new TextField({ name: 'campo', max: 120 }))
    add(historico, new TextField({ name: 'valor_anterior', max: 500 }))
    add(historico, new TextField({ name: 'valor_novo', max: 500 }))
    add(historico, new TextField({ name: 'origem', max: 120 }))

    app.save(pendencias)
    app.save(historico)
    console.log('Migration 0018 completed: briefing pendency and history details')
  },
  (app) => {
    console.log('Migration 0018 rollback preserves existing pendencies and history')
  },
)
