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

routerAdd(
  'POST',
  '/backend/v1/integracao/harness-final',
  (e) => {
    const a = e.auth
    if (!a || a.getString('ativo') !== 'true' || a.getString('papel') !== 'administrador')
      throw e.forbiddenError('Somente Administrador pode executar o harness.')
    const id = String((e.requestInfo().body || {}).fixture_id || '')
    if (!['FIX-1-401', 'FIX-1-402', 'FIX-1-403', 'FIX-1-404', 'FIX-1-405'].includes(id))
      throw e.badRequestError('Fixture não autorizada.')
    const events = $app.findCollectionByNameOrId('integration_events'),
      fallbacks = $app.findCollectionByNameOrId('integration_fallbacks'),
      clientes = $app.findCollectionByNameOrId('clientes')
    let event = {
      event_id: 'fixture-401',
      name: 'Cliente Fixture 401',
      source_ref: 'fixture:customer:401',
    }
    if (id === 'FIX-1-404')
      event = { event_id: 'fixture-404', name: '', source_ref: 'fixture:customer:404' }
    if (id === 'FIX-1-405')
      event = {
        event_id: 'fixture-405',
        name: 'Cliente Fixture 405',
        source_ref: 'fixture:customer:405',
      }
    if (id === 'FIX-1-402' || id === 'FIX-1-403') {
      if (!$app.findFirstRecordByFilter(events, 'event_id = "fixture-401"'))
        throw e.badRequestError('Execute primeiro FIX-1-401.')
      event = {
        event_id: 'fixture-401',
        name: id === 'FIX-1-403' ? 'Cliente Fixture 401 alterado' : 'Cliente Fixture 401',
        source_ref: 'fixture:customer:401',
      }
    }
    const raw = JSON.stringify(event)
    let n = 7
    for (let i = 0; i < raw.length; i++) n = (n * 33 + raw.charCodeAt(i)) >>> 0
    const hash = raw.length + '-' + n
    const prior = $app.findFirstRecordByFilter(events, 'event_id = "' + event.event_id + '"')
    const save = (status, code, next, state) => {
      const r = new Record(events)
      r.set('event_id', event.event_id)
      r.set('payload_hash', hash)
      r.set('event_type', 'customer.created')
      r.set('payload_version', '1.0')
      r.set('source_system', 'fixture')
      r.set('external_record_id', 'ext-' + event.event_id)
      r.set('source_ref', event.source_ref)
      r.set('status', status)
      r.set('error_code', code || '')
      r.set('last_confirmed_state', state || 'nenhum')
      r.set('responsible', a.id)
      r.set('next_action', next)
      r.set('trace_id', 'trace-' + event.event_id)
      r.set('test_mode', true)
      $app.save(r)
    }
    const fallback = (code, state, next) => {
      const r = new Record(fallbacks)
      r.set('event_id', event.event_id)
      r.set('source_ref', event.source_ref)
      r.set('error_code', code)
      r.set('last_confirmed_state', state)
      r.set('responsible', a.id)
      r.set('next_action', next)
      r.set('status', 'aberta')
      $app.save(r)
    }
    if (id === 'FIX-1-404') {
      save('rejected', 'schema_required_field', 'Corrigir payload e reenviar.')
      fallback('schema_required_field', 'nenhum', 'Corrigir payload e reenviar.')
      return e.json(200, { fixture_id: id, result: 'rejected', wrote_canonical: false })
    }
    if (id === 'FIX-1-405') {
      save(
        'manual_reconciliation',
        'destination_timeout',
        'Atendimento deve reconciliar por source_ref.',
      )
      fallback('destination_timeout', 'nenhum', 'Atendimento deve reconciliar por source_ref.')
      return e.json(200, {
        fixture_id: id,
        result: 'manual_reconciliation',
        wrote_canonical: false,
      })
    }
    if (prior) {
      if (prior.getString('payload_hash') === hash)
        return e.json(200, { fixture_id: id, result: 'duplicate', wrote_canonical: false })
      fallback(
        'integration_conflict',
        prior.getString('status'),
        'Gestão deve comparar os payloads.',
      )
      return e.json(200, { fixture_id: id, result: 'integration_conflict', wrote_canonical: false })
    }
    save('processed', '', 'Nenhuma; evento processado em homologação', 'processado')
    const c = new Record(clientes)
    c.set('nome', event.name)
    c.set('telefone_principal', 'não informado')
    c.set('situacao', 'ativo')
    c.set('natureza_cadastral', 'pessoa_fisica')
    c.set('classificacao_comercial', 'cliente_padrao')
    c.set('origem_cliente', 'outro')
    c.set('referencia_origem', 'fixture de homologação')
    c.set('source_ref', event.source_ref)
    $app.save(c)
    return e.json(200, { fixture_id: id, result: 'processed', wrote_canonical: true })
  },
  $apis.requireAuth(),
)
