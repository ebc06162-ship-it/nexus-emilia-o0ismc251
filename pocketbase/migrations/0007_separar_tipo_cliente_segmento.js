migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const tipoCliente = clientes.fields.getByName('tipo_cliente')
    tipoCliente.values = ['cliente_direto', 'cerimonialista', 'corporativo', 'revenda', 'parceiro']
    const clienteFields = [
      'nome_noivos',
      'nome_aniversariante',
      'nome_casal',
      'nome_bebe',
      'nome_presenteado',
      'tipo_outro',
      'descricao_outro',
    ]
    for (var i = 0; i < clienteFields.length; i++) {
      if (clientes.fields.getByName(clienteFields[i]))
        clientes.fields.removeByName(clienteFields[i])
    }
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
    if (!oportunidades.fields.getByName('segmento')) {
      oportunidades.fields.add(
        new SelectField({
          name: 'segmento',
          values: ['casamento_noiva', 'eventos_sociais', 'maternidade', 'corporativo', 'outros'],
          required: true,
          maxSelect: 1,
        }),
      )
    }
    const oportunidadeFields = [
      new TextField({ name: 'nome_noivos' }),
      new TextField({ name: 'nome_aniversariante' }),
      new TextField({ name: 'nome_casal' }),
      new TextField({ name: 'nome_bebe' }),
      new TextField({ name: 'tipo_outro' }),
      new TextField({ name: 'descricao_outro_evento' }),
    ]
    for (var j = 0; j < oportunidadeFields.length; j++) {
      if (!oportunidades.fields.getByName(oportunidadeFields[j].name))
        oportunidades.fields.add(oportunidadeFields[j])
    }
    app.save(oportunidades)
    console.log('Migration 0007 completed')
  },
  (app) => {
    console.log('Migration 0007 rollback intentionally preserves records')
  },
)
