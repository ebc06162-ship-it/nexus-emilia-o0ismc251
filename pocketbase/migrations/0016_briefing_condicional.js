migrate(
  (app) => {
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const add = (field) => {
      if (!oportunidades.fields.getByName(field.name)) oportunidades.fields.add(field)
    }

    add(new TextField({ name: 'modalidade_entrega', max: 80 }))
    add(new TextField({ name: 'referencia_paleta', max: 240 }))
    add(new TextField({ name: 'datas_entrega', max: 240 }))
    add(new TextField({ name: 'tipo_cliente', max: 120 }))
    add(new DateField({ name: 'data_estimada_parto' }))
    add(new TextField({ name: 'maternidade', max: 160 }))
    add(new TextField({ name: 'tipo_parto', max: 80 }))
    add(new TextField({ name: 'responsavel_acompanhamento', max: 160 }))

    app.save(oportunidades)
    console.log('Migration 0016 completed: conditional briefing groups')
  },
  (app) => {
    console.log('Migration 0016 rollback preserves opportunity records')
  },
)
