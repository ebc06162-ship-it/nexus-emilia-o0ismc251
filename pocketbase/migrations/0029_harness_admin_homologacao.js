migrate(
  (app) => {
    const events = app.findCollectionByNameOrId('integration_events')
    const fallbacks = app.findCollectionByNameOrId('integration_fallbacks')
    const admin =
      '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel = "administrador"'
    events.createRule = admin
    fallbacks.createRule = admin
    app.save(events)
    app.save(fallbacks)
  },
  (app) => {
    const events = app.findCollectionByNameOrId('integration_events')
    const fallbacks = app.findCollectionByNameOrId('integration_fallbacks')
    events.createRule = null
    fallbacks.createRule = '@request.auth.id != ""'
    app.save(events)
    app.save(fallbacks)
  },
)
