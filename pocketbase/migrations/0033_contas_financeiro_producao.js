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
        existing.setPassword(senhaPorEmail(user.getString('email')))
        existing.setVerified(true)
        app.save(existing)
      } catch (e) {
        const user = new Record(users)
        user.set('email', account.email)
        user.set('name', account.name)
        user.set('papel', account.papel)
        user.set('ativo', true)
        user.setPassword(senhaPorEmail(user.getString('email')))
        user.setVerified(true)
        app.save(user)
      }
    }
  },
  (app) => {},
)
