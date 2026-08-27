migrate(
  (app) => {
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    if (!oportunidades.fields.getByName('source_ref')) {
      oportunidades.fields.add(new TextField({ name: 'source_ref', max: 160 }))
    }
    const historico = app.findCollectionByNameOrId('historico_eventos')
    if (!historico.fields.getByName('decisao_duplicidade')) {
      historico.fields.add(
        new SelectField({
          name: 'decisao_duplicidade',
          maxSelect: 1,
          values: ['reutilizar', 'criar_novo', 'nao_aplicavel'],
        }),
      )
    }
    app.save(oportunidades)
    app.save(historico)
    console.log('Migration 0011 completed: source reference and duplicate decision fields')
  },
  (app) => {
    console.log('Migration 0011 rollback preserves all records and history')
  },
)
