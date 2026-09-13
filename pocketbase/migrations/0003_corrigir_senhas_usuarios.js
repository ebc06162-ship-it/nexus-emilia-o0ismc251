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
    const emails = [
      'fernanda@emiliabemcasados.local',
      'mara@emiliabemcasados.local',
      'anie@emiliabemcasados.local',
    ]

    for (var i = 0; i < emails.length; i++) {
      try {
        const user = app.findAuthRecordByEmail('_pb_users_auth_', emails[i])
        user.setPassword(senhaPorEmail(user.getString('email')))
        user.setVerified(true)
        app.save(user)
      } catch (e) {
        console.log('user not found: ' + emails[i])
      }
    }

    console.log('Migration 0003 completed: seed user passwords corrected')
  },
  (app) => {
    console.log('Migration 0003 down: no destructive rollback for password hashes')
  },
)
