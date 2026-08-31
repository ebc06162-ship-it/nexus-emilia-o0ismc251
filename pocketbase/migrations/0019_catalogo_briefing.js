migrate(
  (app) => {
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const add = (field) => {
      if (!oportunidades.fields.getByName(field.name)) oportunidades.fields.add(field)
    }
    add(new TextField({ name: 'catalogo_item_id', max: 80 }))
    add(new TextField({ name: 'catalogo_codigo', max: 80 }))
    add(new TextField({ name: 'catalogo_label', max: 300 }))
    add(new TextField({ name: 'catalogo_source_version', max: 80 }))
    add(new TextField({ name: 'catalogo_selected_at', max: 80 }))
    add(new TextField({ name: 'catalogo_selected_by', max: 80 }))
    app.save(oportunidades)
    console.log('Migration 0019 completed: catalog selection snapshot on opportunities')
  },
  (app) => {
    console.log('Migration 0019 rollback preserves opportunity records')
  },
)
