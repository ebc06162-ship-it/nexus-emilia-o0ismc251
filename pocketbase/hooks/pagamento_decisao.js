routerAdd(
  'POST',
  '/backend/v1/pagamentos/{id}/decisao',
  (e) => {
    const auth = e.auth
    if (!auth) throw e.unauthorizedError('Sessão inválida.')
    const papel = auth.getString('papel')
    if (papel !== 'administrador' && papel !== 'gestao' && papel !== 'financeiro') {
      throw e.forbiddenError('Seu perfil não pode decidir sobre pagamentos.')
    }

    const pagamentoId = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const acao = String(body.acao || '').trim()
    const motivo = String(body.motivo || '').trim()
    if (acao !== 'conferir' && acao !== 'divergente') {
      throw e.badRequestError('A decisão deve ser conferir ou divergente.')
    }
    if (acao === 'divergente' && !motivo)
      throw e.badRequestError('Informe o motivo da divergência.')

    let pagamento
    try {
      pagamento = $app.findRecordById('pagamentos', pagamentoId)
    } catch (err) {
      throw e.notFoundError('Pagamento não encontrado.')
    }
    const statusAtual = pagamento.getString('status')
    if (statusAtual !== 'comprovante_recebido' && statusAtual !== 'em_conferencia') {
      throw e.badRequestError('O pagamento precisa ter comprovante recebido antes da decisão.')
    }

    let resultado = null
    $app.runInTransaction((txApp) => {
      const pagamentoTx = txApp.findRecordById('pagamentos', pagamentoId)
      const pedido = txApp.findRecordById('pedidos', pagamentoTx.getString('pedido_id'))
      const comprovantes = txApp.findRecordsByFilter(
        'comprovantes_pagamento',
        'pagamento_id = {:pagamento}',
        '-versao',
        1,
        0,
        { pagamento: pagamentoId },
      )
      const comprovante = comprovantes.length ? comprovantes[0] : null
      const novoStatus = acao === 'conferir' ? 'conferido' : 'divergente'
      pagamentoTx.set('status', novoStatus)
      if (acao === 'conferir') {
        pagamentoTx.set('valor_recebido', pagamentoTx.get('valor_previsto'))
        pagamentoTx.set('confirmado_por', auth.id)
        pagamentoTx.set('confirmado_em', new Date().toISOString())
        pagamentoTx.set('observacoes', 'Pagamento conferido explicitamente pelo Financeiro.')
        const demais = txApp.findRecordsByFilter(
          'pagamentos',
          'pedido_id = {:pedido} && id != {:pagamento} && status != "conferido" && status != "cancelado"',
          '',
          1,
          0,
          { pedido: pedido.id, pagamento: pagamentoId },
        )
        pedido.set('status_financeiro', demais.length ? 'parcial_em_dia' : 'pago')
      } else {
        pagamentoTx.set('observacoes', 'Pagamento marcado como divergente: ' + motivo)
        pedido.set('status_financeiro', 'divergente')
      }
      txApp.save(pagamentoTx)
      pedido.set('updated', new Date().toISOString())
      txApp.save(pedido)

      if (comprovante) {
        comprovante.set('status', acao === 'conferir' ? 'conferido' : 'divergente')
        txApp.save(comprovante)
      }

      if (acao === 'divergente') {
        const pendencia = new Record(txApp.findCollectionByNameOrId('pendencias'))
        pendencia.set('oportunidade_id', pedido.getString('oportunidade_id'))
        pendencia.set('motivo', 'Divergência no pagamento: ' + motivo)
        pendencia.set('responsavel', pedido.getString('convertido_por'))
        pendencia.set(
          'proxima_acao',
          'Atendimento deve contatar a cliente e solicitar correção do pagamento.',
        )
        pendencia.set('prazo', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString())
        pendencia.set('pending_type', 'outro')
        pendencia.set('status', 'aberta')
        pendencia.set('campo', 'pagamento_id')
        pendencia.set('valor_atual', pagamentoId)
        pendencia.set('origem', 'fila_financeira')
        txApp.save(pendencia)
      }

      const audit = new Record(txApp.findCollectionByNameOrId('auditoria_financeira'))
      audit.set('pagamento_id', pagamentoId)
      audit.set('pedido_id', pedido.id)
      if (comprovante) audit.set('comprovante_id', comprovante.id)
      audit.set('tipo_evento', acao === 'conferir' ? 'conferencia' : 'divergencia')
      audit.set('autor', auth.id)
      audit.set('versao_plano', pagamentoTx.getInt('versao_plano'))
      if (comprovante) audit.set('versao_comprovante', comprovante.getInt('versao'))
      audit.set(
        'resumo',
        acao === 'conferir'
          ? 'Pagamento conferido pelo Financeiro.'
          : 'Pagamento marcado como divergente e devolvido ao Atendimento.',
      )
      audit.set('motivo', motivo)
      audit.set('snapshot', { status_anterior: statusAtual, status_novo: novoStatus, motivo })
      txApp.save(audit)
      resultado = { pagamento: pagamentoTx, pedido, comprovante }
    })

    return e.json(200, {
      ok: true,
      pagamento_id: resultado.pagamento.id,
      status_pagamento: resultado.pagamento.getString('status'),
      status_pedido: resultado.pedido.getString('status_financeiro'),
      pendencia_criada: acao === 'divergente',
    })
  },
  $apis.requireAuth(),
)
