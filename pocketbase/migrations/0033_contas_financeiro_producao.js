migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const accounts = [
      { email: 'financeiro@emiliabemcasados.local', name: 'Financeiro Teste', papel: 'financeiro' },
      { email: 'producao@emiliabemcasados.local', name: 'Produção Teste', papel: 'producao' },
    ]
    for (var i = 0; i < accounts.length; i++) {
      const account = accounts[i]
      try {
        const existing = app.findAuthRecordByEmail('_pb_users_auth_', account.email)
        existing.set('name', account.name)
        existing.set('papel', account.papel)
        existing.set('ativo', true)
        existing.setPassword('Emilia@2026')
        existing.setVerified(true)
        app.save(existing)
      } catch (e) {
        const user = new Record(users)
        user.set('email', account.email)
        user.set('name', account.name)
        user.set('papel', account.papel)
        user.set('ativo', true)
        user.setPassword('Emilia@2026')
        user.setVerified(true)
        app.save(user)
      }
    }
  },
  (app) => {},
)
