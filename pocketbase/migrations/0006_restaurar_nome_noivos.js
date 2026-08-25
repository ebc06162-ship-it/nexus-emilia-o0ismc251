migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    if (!clientes.fields.getByName('nome_noivos')) {
      clientes.fields.add(new TextField({ name: 'nome_noivos' }))
    }
    app.save(clientes)
    console.log('Migration 0006 completed: nome_noivos restored for casamento')
  },
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    if (clientes.fields.getByName('nome_noivos')) {
      clientes.fields.removeByName('nome_noivos')
    }
    app.save(clientes)
  },
)
