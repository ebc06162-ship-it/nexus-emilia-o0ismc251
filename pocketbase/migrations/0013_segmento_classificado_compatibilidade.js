migrate(
  (app) => {
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    if (!oportunidades.fields.getByName('segmento_classificado')) {
      oportunidades.fields.add(
        new SelectField({
          name: 'segmento_classificado',
          maxSelect: 1,
          values: [
            'casamento',
            'eventos_sociais',
            'maternidade',
            'corporativo',
            'presente',
            'outros',
          ],
        }),
      )
    }
    if (!oportunidades.fields.getByName('subtipo_evento')) {
      oportunidades.fields.add(new TextField({ name: 'subtipo_evento', max: 80 }))
    }
    if (!oportunidades.fields.getByName('justificativa_outros')) {
      oportunidades.fields.add(new TextField({ name: 'justificativa_outros', max: 500 }))
    }
    app.save(oportunidades)
    console.log('Migration 0013 completed: classified segment compatibility field')
  },
  (app) => {
    console.log('Migration 0013 rollback preserves opportunity records')
  },
)
