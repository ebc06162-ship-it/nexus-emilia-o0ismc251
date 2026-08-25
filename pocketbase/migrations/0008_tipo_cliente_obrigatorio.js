migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const tipoCliente = clientes.fields.getByName('tipo_cliente')
    tipoCliente.required = true
    app.save(clientes)
    console.log('Migration 0008 completed: tipo_cliente is required')
  },
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const tipoCliente = clientes.fields.getByName('tipo_cliente')
    tipoCliente.required = false
    app.save(clientes)
  },
)
