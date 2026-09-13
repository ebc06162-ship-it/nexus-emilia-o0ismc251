/// <reference path="../pb_data/types.d.ts" />
// F3-T001 (SPEC-3-001): RLS fail-closed na coleção users.
// RN-3-001 (BL-02): nenhum usuário altera o próprio papel, ativo ou verified.
// A autoelevação existia porque 0021 permitia `id = @request.auth.id` no updateRule.
// A partir daqui, o próprio usuário não passa nem para editar o próprio perfil;
// autoatendimento de perfil passa a exigir alçada de Administrador/Gestão.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const adminGestao =
      '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != "" && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")'
    users.listRule = adminGestao
    users.viewRule = adminGestao
    users.createRule = adminGestao
    users.updateRule = adminGestao
    users.deleteRule = null
    app.save(users)

    console.log(
      'Migration 0038 completed: users fail-closed; autoelevacao e self-update bloqueados',
    )
  },
  (app) => {
    // Down não destrutivo: restaura as regras de 0021 (estado anterior conhecido).
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const authenticated = '@request.auth.id != "" && @request.auth.papel != ""'
    const adminOrManagement = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")`
    users.listRule = adminOrManagement
    users.viewRule = adminOrManagement
    users.createRule = adminOrManagement
    users.updateRule = `${adminOrManagement} || id = @request.auth.id`
    users.deleteRule = null
    app.save(users)

    console.log('Migration 0038 down: regras de 0021 restauradas')
  },
)
