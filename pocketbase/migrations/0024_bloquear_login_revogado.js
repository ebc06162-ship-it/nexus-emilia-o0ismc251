migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.authRule = 'ativo = true'
    app.save(users)
    console.log('Migration 0024 completed: revoked users cannot authenticate')
  },
  (app) => {
    console.log('Migration 0024 down: auth rule must be restored explicitly')
  },
)
