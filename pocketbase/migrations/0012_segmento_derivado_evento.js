migrate(
  (app) => {
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const add = (field) => {
      if (!oportunidades.fields.getByName(field.name)) oportunidades.fields.add(field)
    }
    add(
      new SelectField({
        name: 'segmento',
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
    add(new TextField({ name: 'subtipo_evento', max: 80 }))
    add(new TextField({ name: 'justificativa_outros', max: 500 }))
    app.save(oportunidades)
    console.log('Migration 0012 completed: derived segments and event subtypes')
  },
  (app) => {
    console.log('Migration 0012 rollback preserves opportunity records')
  },
)
