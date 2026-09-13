/// <reference path="../pb_data/types.d.ts" />
// F3-T001 (SPEC-3-001): credenciais por secrets (RN-3-002 / BL-03).
// Remove a senha literal 'Emilia@2026' do caminho de execução das migrations:
// - migrações antigas mantêm o histórico (não reescrevemos Git), mas 0003/0004/0022/0033
//   passam a rodar com senha vinda do secret EMILIA_*_PASSWORD;
// - 0001 é seed histórico e permanece como registro, mas o secret ausente desativa a conta
//   correspondente em vez de criar senha em Git;
// - 0039 garante o estado final: nenhuma conta conhecida usa a senha antiga.
// O valor do secret NUNCA é logado.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const contas = [
      { email: 'fernanda@emiliabemcasados.local', secret: 'EMILIA_FERNANDA_PASSWORD' },
      { email: 'mara@emiliabemcasados.local', secret: 'EMILIA_MARA_PASSWORD' },
      { email: 'anie@emiliabemcasados.local', secret: 'EMILIA_ANIE_PASSWORD' },
      { email: 'financeiro@emiliabemcasados.local', secret: 'EMILIA_FINANCEIRO_PASSWORD' },
      { email: 'producao@emiliabemcasados.local', secret: 'EMILIA_PRODUCAO_PASSWORD' },
    ]

    for (var i = 0; i < contas.length; i++) {
      const conta = contas[i]
      var rec = null
      try {
        rec = app.findFirstRecordByFilter(users, 'email = {:email}', { email: conta.email })
      } catch (e) {
        rec = null
      }
      if (!rec) {
        console.log('0039: conta ' + conta.email + ' inexistente; nada a fazer')
        continue
      }
      var valorSecret = $os.getenv(conta.secret) || ''
      if (valorSecret !== '') {
        rec.setPassword(valorSecret)
        app.save(rec)
        console.log('0039: senha de ' + conta.email + ' rotacionada via secret ' + conta.secret)
      } else {
        rec.set('ativo', false)
        app.save(rec)
        console.log(
          '0039: secret ' +
            conta.secret +
            ' ausente; conta ' +
            conta.email +
            ' desativada (RN-3-002)',
        )
      }
    }

    console.log(
      'Migration 0039 completed: credenciais por secrets; senha literal fora do caminho de execucao',
    )
  },
  (app) => {
    // Down não destrutivo: não recria senha em Git nem em código.
    console.log('Migration 0039 down: sem acao; rotacao de senha nao e revertida por seguranca')
  },
)
