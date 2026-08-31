migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'producao@emiliabemcasados.local')
      user.set('ativo', true)
      app.save(user)
    } catch (e) {
      console.log('Conta de Produção não encontrada; nenhuma reativação necessária')
    }
    console.log('Migration 0025 completed: homologation production account restored for testing')
  },
  (app) => {
    console.log('Migration 0025 down: account state preserved')
  },
)
