migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const accounts = [
      { email: 'fernanda@emiliabemcasados.local', name: 'Fernanda' },
      { email: 'mara@emiliabemcasados.local', name: 'Mara' },
      { email: 'anie@emiliabemcasados.local', name: 'Anie' },
    ]

    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i]
      try {
        var existing = app.findAuthRecordByEmail('_pb_users_auth_', account.email)
        existing.setPassword('Emilia@2026')
        existing.setVerified(true)
        existing.set('name', account.name)
        app.save(existing)
      } catch (e) {
        var user = new Record(users)
        user.set('email', account.email)
        user.set('name', account.name)
        user.setPassword('Emilia@2026')
        user.setVerified(true)
        app.save(user)
      }
    }

    console.log('Migration 0004 completed: homologation accounts created or repaired')
  },
  (app) => {
    console.log('Migration 0004 down: accounts preserved to avoid destructive credential rollback')
  },
)
