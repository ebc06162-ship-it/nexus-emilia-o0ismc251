migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const emails = [
      'fernanda@emiliabemcasados.local',
      'mara@emiliabemcasados.local',
      'anie@emiliabemcasados.local',
    ]

    for (var i = 0; i < emails.length; i++) {
      try {
        const user = app.findAuthRecordByEmail('_pb_users_auth_', emails[i])
        user.setPassword('Emilia@2026')
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
