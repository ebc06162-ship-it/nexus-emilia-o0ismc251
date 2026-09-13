migrate(
  (app) => {
    // F3-T001 (SPEC-3-001): senha por secret EMILIA_*_PASSWORD; sem secret, desativa a conta (RN-3-002).
    function senhaPorEmail(email) {
      var mapa = {
        'fernanda@emiliabemcasados.local': 'EMILIA_FERNANDA_PASSWORD',
        'mara@emiliabemcasados.local': 'EMILIA_MARA_PASSWORD',
        'anie@emiliabemcasados.local': 'EMILIA_ANIE_PASSWORD',
        'financeiro@emiliabemcasados.local': 'EMILIA_FINANCEIRO_PASSWORD',
        'producao@emiliabemcasados.local': 'EMILIA_PRODUCAO_PASSWORD',
      }
      return $os.getenv(mapa[email]) || ''
    }

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
        existing.setPassword(senhaPorEmail(user.getString('email')))
        existing.setVerified(true)
        existing.set('name', account.name)
        app.save(existing)
      } catch (e) {
        var user = new Record(users)
        user.set('email', account.email)
        user.set('name', account.name)
        user.setPassword(senhaPorEmail(user.getString('email')))
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
