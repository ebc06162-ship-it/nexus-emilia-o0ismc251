migrate(
  (app) => {
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const tipoPedido = oportunidades.fields.getByName('tipo_pedido')
    if (tipoPedido) {
      tipoPedido.values = [
        'casamento',
        'degustacao',
        'revendedor',
        'bem_nascido',
        'batizado',
        'aniversario',
        'corporativo',
        'maternidade',
        'bodas',
        'formatura',
        'cha_bebe',
        'revelacao',
        'presente',
        'outros',
      ]
      app.save(oportunidades)
    }
    console.log('Migration 0017 completed: briefing type values expanded')
  },
  (app) => {
    console.log('Migration 0017 rollback preserves opportunity records')
  },
)
