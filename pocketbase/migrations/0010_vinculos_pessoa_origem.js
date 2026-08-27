migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const pessoas = app.findCollectionByNameOrId('pessoas')
    const cerimonialistas = app.findCollectionByNameOrId('cerimonialistas')
    const addCliente = (field) => {
      if (!clientes.fields.getByName(field.name)) clientes.fields.add(field)
    }
    addCliente(new RelationField({ name: 'pessoa_id', collectionId: pessoas.id, maxSelect: 1 }))
    addCliente(
      new RelationField({ name: 'indicador_pessoa_id', collectionId: pessoas.id, maxSelect: 1 }),
    )
    addCliente(
      new RelationField({
        name: 'cerimonialista_origem_id',
        collectionId: cerimonialistas.id,
        maxSelect: 1,
      }),
    )
    addCliente(new TextField({ name: 'coordenador_origem_nome' }))
    app.save(clientes)
    console.log('Migration 0010 completed: reusable person and source relationships')
  },
  (app) => {
    console.log('Migration 0010 rollback preserves existing records')
  },
)
