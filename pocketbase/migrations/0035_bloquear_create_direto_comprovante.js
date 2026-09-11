migrate(
  (app) => {
    const comprovantes = app.findCollectionByNameOrId('comprovantes_pagamento')
    comprovantes.createRule = null
    comprovantes.updateRule = null
    comprovantes.deleteRule = null
    app.save(comprovantes)
  },
  (app) => {
    const comprovantes = app.findCollectionByNameOrId('comprovantes_pagamento')
    comprovantes.createRule =
      '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    comprovantes.updateRule = null
    comprovantes.deleteRule = null
    app.save(comprovantes)
  },
)
