routerAdd(
  'POST',
  '/backend/v1/admin/users/{id}/revoke',
  (e) => {
    const auth = e.auth
    if (!auth || !auth.getString('ativo') || auth.getString('papel') !== 'administrador') {
      throw e.forbiddenError('Somente Administrador pode revogar usuários.')
    }
    const id = e.request.pathValue('id')
    const users = $app.findCollectionByNameOrId('_pb_users_auth_')
    const target = $app.findRecordById(users, id)
    if (target.id === auth.id) {
      throw e.badRequestError('O Administrador não pode revogar a própria conta.')
    }
    target.set('ativo', false)
    $app.save(target)

    const audit = new Record($app.findCollectionByNameOrId('auditoria'))
    audit.set('ator_id', auth.id)
    audit.set('ator_nome', auth.getString('name'))
    audit.set('papel', auth.getString('papel'))
    audit.set('objeto_tipo', 'users')
    audit.set('objeto_id', target.id)
    audit.set('acao', 'revogacao')
    audit.set('motivo', 'Acesso revogado pelo Administrador')
    audit.set('origem', e.request.url.path)
    audit.set('resultado', 'permitido')
    audit.set('trace_id', target.id + '-revoke-' + Date.now())
    $app.save(audit)
    return e.json(200, { ok: true, id: target.id, ativo: false })
  },
  $apis.requireAuth(),
)
