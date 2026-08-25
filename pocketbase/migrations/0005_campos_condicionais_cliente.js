migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const fields = [
      new TextField({ name: 'empresa_nome' }),
      new TextField({ name: 'contato_nome' }),
      new TextField({ name: 'contato_telefone' }),
      new TextField({ name: 'nome_aniversariante' }),
      new TextField({ name: 'nome_casal' }),
      new TextField({ name: 'nome_bebe' }),
      new TextField({ name: 'nome_presenteado' }),
      new TextField({ name: 'tipo_outro' }),
      new TextField({ name: 'descricao_outro' }),
    ]

    for (var i = 0; i < fields.length; i++) {
      if (!clientes.fields.getByName(fields[i].name)) {
        clientes.fields.add(fields[i])
      }
    }

    app.save(clientes)
    console.log('Migration 0005 completed: conditional customer fields added')
  },
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const names = [
      'empresa_nome',
      'contato_nome',
      'contato_telefone',
      'nome_aniversariante',
      'nome_casal',
      'nome_bebe',
      'nome_presenteado',
      'tipo_outro',
      'descricao_outro',
    ]
    for (var i = 0; i < names.length; i++) {
      if (clientes.fields.getByName(names[i])) {
        clientes.fields.removeByName(names[i])
      }
    }
    app.save(clientes)
  },
)
