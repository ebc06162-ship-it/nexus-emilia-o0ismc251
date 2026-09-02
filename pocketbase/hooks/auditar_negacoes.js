routerAdd(
  'POST',
  '/backend/v1/auditoria/negacao',
  (e) => {
    const auth = e.auth
    if (!auth || !auth.getString('ativo')) throw e.unauthorizedError('Sessão inválida.')
    const body = e.requestInfo().body || {}
    const audit = new Record($app.findCollectionByNameOrId('auditoria'))
    const labels = {
      catalogo_itens: 'Item de catálogo',
      clientes: 'Cadastro de cliente',
      oportunidades: 'Registro de oportunidade/pedido',
      historico_eventos: 'Histórico de eventos',
      auditoria: 'Auditoria',
      users: 'Usuário',
    }
    const objectLabel = labels[body.objeto_tipo] || String(body.objeto_tipo || 'desconhecido')
    const action = String(body.acao || 'acesso')
    audit.set('ator_id', auth.id)
    audit.set('ator_nome', auth.getString('name'))
    audit.set('papel', auth.getString('papel'))
    audit.set('objeto_tipo', String(body.objeto_tipo || 'desconhecido').slice(0, 120))
    audit.set('objeto_id', String(body.objeto_id || '').slice(0, 80))
    audit.set('acao', action.slice(0, 80))
    audit.set('descricao', 'Tentativa de ' + action + ' em ' + objectLabel)
    audit.set('campo', String(body.campo || '').slice(0, 120))
    audit.set('motivo', 'Ação negada pela regra de acesso')
    audit.set('origem', String(body.origem || 'interface').slice(0, 160))
    audit.set('resultado', 'negado')
    audit.set('trace_id', auth.id + '-denied-' + Date.now())
    $app.save(audit)
    return e.json(201, { ok: true })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/integracao/harness',
  (e) => {
    const auth = e.auth
    if (
      !auth ||
      auth.getString('ativo') !== 'true' ||
      auth.getString('papel') !== 'administrador'
    ) {
      throw e.forbiddenError('Somente Administrador pode executar o harness.')
    }
    const fixtureId = String((e.requestInfo().body || {}).fixture_id || '')
    const allowed = ['FIX-1-401', 'FIX-1-402', 'FIX-1-403', 'FIX-1-404', 'FIX-1-405']
    if (!allowed.includes(fixtureId)) throw e.badRequestError('Fixture não autorizada.')
    const events = $app.findCollectionByNameOrId('integration_events')
    const fallbacks = $app.findCollectionByNameOrId('integration_fallbacks')
    const clientes = $app.findCollectionByNameOrId('clientes')
    const makeEvent = (id, changed) => ({
      event_id: id,
      name: changed ? 'Cliente Fixture 401 alterado' : 'Cliente Fixture ' + id.slice(-3),
      source_ref: 'fixture:customer:' + id.slice(-3),
    })
    let event = makeEvent('fixture-401', false)
    if (fixtureId === 'FIX-1-404') event = makeEvent('fixture-404', false)
    if (fixtureId === 'FIX-1-405') event = makeEvent('fixture-405', false)
    if (fixtureId === 'FIX-1-402' || fixtureId === 'FIX-1-403') {
      const prior = $app.findFirstRecordByFilter(events, 'event_id = "fixture-401"')
      if (!prior) throw e.badRequestError('Execute primeiro FIX-1-401.')
      event = makeEvent('fixture-401', fixtureId === 'FIX-1-403')
    }
    const raw = JSON.stringify(event)
    let hashNumber = 7
    for (let i = 0; i < raw.length; i += 1) hashNumber = (hashNumber * 33 + raw.charCodeAt(i)) >>> 0
    const hash = raw.length + '-' + hashNumber
    const prior = $app.findFirstRecordByFilter(events, 'event_id = "' + event.event_id + '"')
    const saveEvent = (status, errorCode, nextAction, lastState) => {
      const record = new Record(events)
      record.set('event_id', event.event_id)
      record.set('payload_hash', hash)
      record.set('event_type', 'customer.created')
      record.set('payload_version', '1.0')
      record.set('source_system', 'fixture')
      record.set('external_record_id', 'ext-' + event.event_id)
      record.set('source_ref', event.source_ref)
      record.set('status', status)
      record.set('error_code', errorCode || '')
      record.set('last_confirmed_state', lastState || 'nenhum')
      record.set('responsible', auth.id)
      record.set('next_action', nextAction)
      record.set('trace_id', 'trace-' + event.event_id)
      record.set('test_mode', true)
      $app.save(record)
    }
    const saveFallback = (code, state, action) => {
      const record = new Record(fallbacks)
      record.set('event_id', event.event_id)
      record.set('source_ref', event.source_ref)
      record.set('error_code', code)
      record.set('last_confirmed_state', state)
      record.set('responsible', auth.id)
      record.set('next_action', action)
      record.set('status', 'aberta')
      $app.save(record)
    }
    if (fixtureId === 'FIX-1-404') {
      saveEvent('rejected', 'schema_required_field', 'Corrigir payload e reenviar.', 'nenhum')
      saveFallback('schema_required_field', 'nenhum', 'Corrigir payload e reenviar.')
      return e.json(200, { fixture_id: fixtureId, result: 'rejected', wrote_canonical: false })
    }
    if (fixtureId === 'FIX-1-405') {
      saveEvent(
        'manual_reconciliation',
        'destination_timeout',
        'Atendimento deve reconciliar por source_ref.',
        'nenhum',
      )
      saveFallback('destination_timeout', 'nenhum', 'Atendimento deve reconciliar por source_ref.')
      return e.json(200, {
        fixture_id: fixtureId,
        result: 'manual_reconciliation',
        wrote_canonical: false,
      })
    }
    if (prior) {
      if (prior.getString('payload_hash') === hash)
        return e.json(200, { fixture_id: fixtureId, result: 'duplicate', wrote_canonical: false })
      saveFallback(
        'integration_conflict',
        prior.getString('status'),
        'Gestão deve comparar os payloads.',
      )
      return e.json(200, {
        fixture_id: fixtureId,
        result: 'integration_conflict',
        wrote_canonical: false,
      })
    }
    saveEvent('processed', '', 'Nenhuma; evento processado em homologação', 'processado')
    const client = new Record(clientes)
    client.set('nome', event.name)
    client.set('telefone_principal', 'não informado')
    client.set('situacao', 'ativo')
    client.set('natureza_cadastral', 'pessoa_fisica')
    client.set('classificacao_comercial', 'cliente_padrao')
    client.set('origem_cliente', 'outro')
    client.set('referencia_origem', 'fixture de homologação')
    client.set('source_ref', event.source_ref)
    $app.save(client)
    return e.json(200, { fixture_id: fixtureId, result: 'processed', wrote_canonical: true })
  },
  $apis.requireAuth(),
)
