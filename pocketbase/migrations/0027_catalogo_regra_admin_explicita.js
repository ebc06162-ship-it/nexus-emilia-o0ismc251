migrate(
  (app) => {
    const catalogo = app.findCollectionByNameOrId('catalogo_itens')
    catalogo.createRule =
      '@request.auth.id != "" && @request.auth.papel != "" && @request.auth.papel = "administrador"'
    catalogo.updateRule =
      '@request.auth.id != "" && @request.auth.papel != "" && @request.auth.papel = "administrador"'
    app.save(catalogo)
    console.log(
      'Migration 0027 completed: catalog create/update restricted to administrador with explicit deny',
    )
  },
  (app) => {
    console.log('Migration 0027 down: catalog rules must be restored explicitly')
  },
)
