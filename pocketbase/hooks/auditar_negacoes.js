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
