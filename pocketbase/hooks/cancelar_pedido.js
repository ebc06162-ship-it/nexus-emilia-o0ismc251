routerAdd(
  'POST',
  '/backend/v1/pedidos/{id}/cancelar',
  (e) => {
    // F3-T001 (SPEC-3-001): RN-3-003/004/005 — cancelamento com alçada, retenção e idempotência.
    const auth = e.auth
    if (!auth || !auth.getBool('ativo') || auth.getString('papel') === '') {
      throw e.forbiddenError('Autenticação necessária.')
    }
    const papel = auth.getString('papel')
    const id = e.request.pathValue('id')
    const pedidos = $app.findCollectionByNameOrId('pedidos')
    const pedido = $app.findRecordById(pedidos, id)

    // RN-3-005: pedido já cancelado retorna o mesmo resultado, sem segundo evento financeiro.
    if (pedido.getString('status_comercial') === 'cancelado') {
      return e.json(200, {
        ok: true,
        id: pedido.id,
        status_comercial: 'cancelado',
        retencao_percentual: pedido.getFloat('retencao_percentual'),
        idempotente: true,
      })
    }

    const dataEvento = pedido.getString('data_evento')
    const quantidade = pedido.getInt('quantidade_snapshot')
    const total = pedido.getFloat('total_snapshot')

    // RN-3-003: sem dados confiáveis (data/quantidade/total), recusar — fail-closed.
    if (dataEvento === '' || quantidade <= 0 || total <= 0) {
      throw e.badRequestError(
        'Cancelamento recusado: pedido sem data do evento, quantidade ou total confiáveis.',
      )
    }

    const agora = new Date()
    const evento = new Date(dataEvento)
    const dias = Math.floor((evento.getTime() - agora.getTime()) / 86400000)

    let retencao = 0
    if (quantidade <= 100 && dias >= 7) {
      // RN-3-003: até 100 unidades com pelo menos 7 dias → reembolso integral.
      retencao = 0
    } else {
      // RN-3-004: fora da janela ou acima de 100 unidades → somente Administrador, retenção 20%.
      if (papel !== 'administrador') {
        throw e.forbiddenError(
          'Cancelamento fora da janela (ou acima de 100 unidades) exige Administrador; retenção de 20% será aplicada.',
        )
      }
      retencao = 20
    }

    pedido.set('status_comercial', 'cancelado')
    pedido.set('cancelado_por', auth.id)
    pedido.set('cancelado_em', agora.toISOString())
    pedido.set('retencao_percentual', retencao)
    $app.save(pedido)

    const audit = new Record($app.findCollectionByNameOrId('auditoria'))
    audit.set('ator_id', auth.id)
    audit.set('ator_nome', auth.getString('name'))
    audit.set('papel', papel)
    audit.set('objeto_tipo', 'pedidos')
    audit.set('objeto_id', pedido.id)
    audit.set('acao', 'cancelamento')
    audit.set(
      'motivo',
      'RN-3-003/004: quantidade=' + quantidade + ', dias=' + dias + ', retencao=' + retencao + '%',
    )
    audit.set('origem', e.request.url.path)
    audit.set('resultado', 'permitido')
    audit.set('trace_id', pedido.id + '-cancel-' + Date.now())
    $app.save(audit)

    return e.json(200, {
      ok: true,
      id: pedido.id,
      status_comercial: 'cancelado',
      retencao_percentual: retencao,
      idempotente: false,
    })
  },
  $apis.requireAuth(),
)
