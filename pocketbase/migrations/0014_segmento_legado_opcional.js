migrate(
  (app) => {
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const segmento = oportunidades.fields.getByName('segmento')
    if (segmento) segmento.required = false
    app.save(oportunidades)
    console.log(
      'Migration 0014 completed: legacy segment optional, classified segment is source of truth',
    )
  },
  (app) => {
    console.log('Migration 0014 rollback preserves opportunity records')
  },
)
