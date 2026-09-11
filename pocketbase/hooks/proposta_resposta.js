routerAdd(
  'POST',
  '/backend/v1/propostas/{id}/resposta',
  (e) => {
    const auth = e.auth
    if (!auth) throw e.unauthorizedError('Sessão inválida.')
    const papel = auth.getString('papel')
    if (papel !== 'administrador' && papel !== 'gestao' && papel !== 'atendimento') {
      throw e.forbiddenError('Seu perfil não pode responder ou converter propostas.')
    }

    const propostaId = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const acao = String(body.acao || '').trim()
    if (acao !== 'aprovar' && acao !== 'recusar' && acao !== 'devolver') {
      throw e.badRequestError('A ação deve ser aprovar, recusar ou devolver.')
    }

    let proposta
    try {
      proposta = $app.findRecordById('propostas', propostaId)
    } catch (err) {
      throw e.notFoundError('Proposta não encontrada.')
    }

    const statusAtual = proposta.getString('status')
    if (
      statusAtual === 'substituida' ||
      statusAtual === 'expirada' ||
      statusAtual === 'bloqueada'
    ) {
      throw e.badRequestError(
        'Esta proposta não pode receber resposta porque está ' + statusAtual + '.',
      )
    }

    const validade = proposta.getString('validade_ate')
    if (validade && Date.parse(validade) < Date.now() && statusAtual !== 'aprovada') {
      throw e.badRequestError('A proposta está expirada.')
    }

    if (acao === 'recusar' || acao === 'devolver') {
      const novoStatus = acao === 'recusar' ? 'recusada' : 'em_revisao'
      proposta.set('status', novoStatus)
      $app.save(proposta)
      const auditoriaProposta = new Record($app.findCollectionByNameOrId('auditoria_propostas'))
      auditoriaProposta.set('proposta_id', proposta.id)
      auditoriaProposta.set('tipo_evento', acao === 'recusar' ? 'recusa' : 'alteracao')
      auditoriaProposta.set('autor', auth.id)
      auditoriaProposta.set('versao', proposta.getInt('versao'))
      auditoriaProposta.set(
        'resumo',
        acao === 'recusar' ? 'Proposta recusada.' : 'Proposta devolvida para alteração.',
      )
      auditoriaProposta.set('motivo', String(body.motivo || '').slice(0, 500))
      $app.save(auditoriaProposta)
      return e.json(200, {
        ok: true,
        proposta_id: proposta.id,
        status: novoStatus,
        convertido: false,
      })
    }

    const politicaId = proposta.getString('politica_id')
    if (!politicaId) {
      throw e.badRequestError('A proposta não pode ser aprovada sem política comercial aprovada.')
    }
    let politica
    try {
      politica = $app.findRecordById('politicas_comerciais', politicaId)
    } catch (err) {
      throw e.badRequestError('A política comercial da proposta não foi encontrada.')
    }
    if (politica.getString('estado') !== 'aprovada') {
      throw e.badRequestError('A política comercial da proposta não está aprovada.')
    }
    const hoje = Date.now()
    const inicio = politica.getString('vigencia_inicio')
    const fim = politica.getString('vigencia_fim')
    const politicaVersao = politica.getString('versao').trim()
    const fonte = politica.getString('fonte').trim()
    const aprovador = politica.getString('aprovador').trim()
    const alcada = politica.getString('alcada').trim()
    if (!politicaVersao || !fonte || !aprovador || !inicio || !fim || !alcada) {
      throw e.badRequestError(
        'A política comercial está incompleta: exige versão, fonte, aprovador, vigência e alçada.',
      )
    }
    if (inicio && Date.parse(inicio) > hoje) {
      throw e.badRequestError('A política comercial ainda não está vigente.')
    }
    if (fim && Date.parse(fim) < hoje) {
      throw e.badRequestError('A política comercial está expirada.')
    }

    let resposta = null
    $app.runInTransaction((txApp) => {
      const propostaTx = txApp.findRecordById('propostas', propostaId)
      let pedidoExistente = null
      try {
        pedidoExistente = txApp.findFirstRecordByData('pedidos', 'proposta_id', propostaId)
      } catch (err) {}

      if (pedidoExistente) {
        const auditoria = new Record(txApp.findCollectionByNameOrId('auditoria_pedidos'))
        auditoria.set('pedido_id', pedidoExistente.id)
        auditoria.set('proposta_id', propostaId)
        auditoria.set('tipo_evento', 'tentativa_conversao')
        auditoria.set('autor', auth.id)
        auditoria.set('versao_proposta', propostaTx.getInt('versao'))
        auditoria.set('resumo', 'Tentativa repetida de conversão; pedido existente reutilizado.')
        auditoria.set('motivo', String(body.motivo || 'Conversão repetida').slice(0, 500))
        auditoria.set('snapshot', { pedido_id: pedidoExistente.id, proposta_id: propostaId })
        txApp.save(auditoria)
        resposta = { pedido: pedidoExistente, idempotente: true, status: 'aprovada' }
        return
      }

      const itens = txApp.findRecordsByFilter(
        'itens_proposta',
        'proposta_id = {:proposta}',
        'ordem',
        0,
        0,
        { proposta: propostaId },
      )
      const itensSnapshot = []
      for (const item of itens) {
        itensSnapshot.push({
          id: item.id,
          catalogo_item_id: item.getString('catalogo_item_id'),
          codigo_snapshot: item.getString('codigo_snapshot'),
          label_snapshot: item.getString('label_snapshot'),
          catalogo_versao_snapshot: item.getString('catalogo_versao_snapshot'),
          quantidade: item.getInt('quantidade'),
          preco_unitario_snapshot: item.get('preco_unitario_snapshot'),
          tipo: item.getString('tipo'),
          grupo_alternativa: item.getString('grupo_alternativa'),
          ordem: item.getInt('ordem'),
          composicao_snapshot: item.get('composicao_snapshot'),
        })
      }

      const pedido = new Record(txApp.findCollectionByNameOrId('pedidos'))
      pedido.set('proposta_id', propostaTx.id)
      pedido.set('cliente_id', propostaTx.getString('cliente_id'))
      pedido.set('oportunidade_id', propostaTx.getString('oportunidade_id'))
      pedido.set('status_comercial', 'aprovado')
      pedido.set('status_operacional', 'entrega')
      pedido.set('status_financeiro', 'aguardando_pagamento')
      pedido.set('versao_proposta_snapshot', propostaTx.getInt('versao'))
      pedido.set('composicao_snapshot', { itens: itensSnapshot })
      pedido.set('tabela_comercial_snapshot', propostaTx.get('tabela_comercial_snapshot'))
      pedido.set('condicoes_snapshot', propostaTx.get('condicoes_snapshot'))
      pedido.set('subtotal_snapshot', propostaTx.get('subtotal_snapshot'))
      pedido.set('desconto_snapshot', propostaTx.get('desconto_snapshot'))
      pedido.set('frete_snapshot', propostaTx.get('frete_snapshot'))
      pedido.set('total_snapshot', propostaTx.get('total_snapshot'))
      pedido.set('convertido_por', auth.id)
      pedido.set('convertido_em', new Date().toISOString())
      pedido.set(
        'observacoes',
        'Pedido convertido a partir da proposta aprovada; sem liberação automática de produção.',
      )
      txApp.save(pedido)

      propostaTx.set('status', 'aprovada')
      propostaTx.set('aprovada_em', new Date().toISOString())
      propostaTx.set('pedido_id', pedido.id)
      txApp.save(propostaTx)

      const auditoriaProposta = new Record(txApp.findCollectionByNameOrId('auditoria_propostas'))
      auditoriaProposta.set('proposta_id', propostaTx.id)
      auditoriaProposta.set('tipo_evento', 'aprovacao')
      auditoriaProposta.set('autor', auth.id)
      auditoriaProposta.set('versao', propostaTx.getInt('versao'))
      auditoriaProposta.set('resumo', 'Proposta aprovada e convertida em pedido.')
      auditoriaProposta.set('depois_snapshot', { proposta_id: propostaTx.id, pedido_id: pedido.id })
      txApp.save(auditoriaProposta)

      const auditoria = new Record(txApp.findCollectionByNameOrId('auditoria_pedidos'))
      auditoria.set('pedido_id', pedido.id)
      auditoria.set('proposta_id', propostaTx.id)
      auditoria.set('tipo_evento', 'conversao')
      auditoria.set('autor', auth.id)
      auditoria.set('versao_proposta', propostaTx.getInt('versao'))
      auditoria.set('resumo', 'Proposta aprovada e convertida em pedido operacional.')
      auditoria.set('snapshot', {
        proposta_id: propostaTx.id,
        pedido_id: pedido.id,
        itens: itensSnapshot,
      })
      txApp.save(auditoria)
      resposta = { pedido, idempotente: false, status: 'aprovada' }
    })

    return e.json(resposta.idempotente ? 200 : 201, {
      ok: true,
      idempotente: resposta.idempotente,
      proposta_id: propostaId,
      pedido_id: resposta.pedido.id,
      status: resposta.status,
      status_operacional: resposta.pedido.getString('status_operacional'),
      status_financeiro: resposta.pedido.getString('status_financeiro'),
    })
  },
  $apis.requireAuth(),
)
