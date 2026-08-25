migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const tipoCliente = clientes.fields.getByName('tipo_cliente')
    tipoCliente.values = ['cliente_direto', 'cerimonialista', 'corporativo', 'revenda', 'parceiro']
    clientes.fields.removeByName('nome_noivos')
    clientes.fields.removeByName('nome_aniversariante')
    clientes.fields.removeByName('nome_casal')
    clientes.fields.removeByName('nome_bebe')
    clientes.fields.removeByName('nome_presenteado')
    clientes.fields.removeByName('tipo_outro')
    clientes.fields.removeByName('descricao_outro')
    app.save(clientes)

    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const tipoPedido = oportunidades.fields.getByName('tipo_pedido')
    tipoPedido.values = [
      'casamento',
      'aniversario',
      'cha_bebe',
      'revelacao',
      'bodas',
      'batizado',
      'corporativo',
      'outro',
    ]
    const add = (field) => {
      try {
        oportunidades.fields.add(field)
      } catch (e) {
        console.log(`field ${field.name} already exists`)
      }
    }
    add(
      new SelectField({
        name: 'segmento',
        values: ['casamento_noiva', 'eventos_sociais', 'maternidade', 'corporativo', 'outros'],
        required: true,
        maxSelect: 1,
      }),
    )
    add(new TextField({ name: 'nome_noivos', max: 200 }))
    add(new TextField({ name: 'nome_aniversariante', max: 200 }))
    add(new TextField({ name: 'nome_casal', max: 200 }))
    add(new TextField({ name: 'nome_bebe', max: 200 }))
    add(new TextField({ name: 'tipo_outro', max: 100 }))
    add(new TextField({ name: 'descricao_outro_evento' }))
    app.save(oportunidades)

    console.log('Migration 0007 completed: customer type separated from opportunity segment')
  },
  (app) => {
    console.log(
      'Migration 0007 rollback preserves existing records; fields remain for safe manual rollback',
    )
  },
)
