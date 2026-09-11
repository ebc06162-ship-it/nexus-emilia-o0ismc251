routerAdd(
  'POST',
  '/backend/v1/pedidos/{id}/pagamentos',
  (e) => {
    const auth = e.auth
    if (!auth) throw e.unauthorizedError('Sessão inválida.')
    const papel = auth.getString('papel')
    if (
      papel !== 'administrador' &&
      papel !== 'gestao' &&
      papel !== 'financeiro' &&
      papel !== 'atendimento'
    ) {
      throw e.forbiddenError('Seu perfil não pode preparar pagamentos.')
    }

    const pedidoId = e.request.pathValue('id')
    const body = e.requestInfo().body || {}
    const forma = String(body.forma_pagamento || '').trim()
    const valor = Number(body.valor_previsto)
    const vencimento = String(body.vencimento || '').trim()
    const formas = ['pix', 'cartao', 'transferencia', 'dinheiro', 'outro']
    if (formas.indexOf(forma) < 0) throw e.badRequestError('Forma de pagamento inválida.')
    if (!Number.isFinite(valor) || valor <= 0)
      throw e.badRequestError('Informe um valor previsto maior que zero.')
    if (!vencimento || Number.isNaN(Date.parse(vencimento)))
      throw e.badRequestError('Informe um vencimento válido.')

    let pedido
    try {
      pedido = $app.findRecordById('pedidos', pedidoId)
    } catch (err) {
      throw e.notFoundError('Pedido não encontrado.')
    }
    if (pedido.getString('status_comercial') !== 'aprovado') {
      throw e.badRequestError('Só é possível preparar pagamento para pedido aprovado.')
    }
    if (papel === 'atendimento' && pedido.getString('convertido_por') !== auth.id) {
      throw e.forbiddenError('Você só pode preparar pagamento dos seus próprios pedidos.')
    }

    let resultado = null
    $app.runInTransaction((txApp) => {
      const planos = txApp.findRecordsByFilter(
        'planos_pagamento',
        'pedido_id = {:pedido}',
        '-versao',
        1,
        0,
        { pedido: pedidoId },
      )
      const ultimo = planos.length ? planos[0] : null
      const versao = ultimo ? ultimo.getInt('versao') + 1 : 1
      if (ultimo && ultimo.getString('status') === 'ativo') {
        ultimo.set('status', 'substituido')
        txApp.save(ultimo)
      }

      const plano = new Record(txApp.findCollectionByNameOrId('planos_pagamento'))
      plano.set('pedido_id', pedidoId)
      plano.set('versao', versao)
      plano.set('status', 'ativo')
      plano.set('total_previsto', valor)
      plano.set('moeda', 'BRL')
      plano.set('condicoes_snapshot', {
        forma_pagamento: forma,
        vencimento,
        origem: 'fila_financeira_f2_t008',
      })
      plano.set('criado_por', auth.id)
      plano.set(
        'motivo',
        String(
          body.motivo ||
            (versao > 1 ? 'Nova versão do plano de pagamento.' : 'Plano de pagamento criado.'),
        ).slice(0, 500),
      )
      txApp.save(plano)

      const pagamento = new Record(txApp.findCollectionByNameOrId('pagamentos'))
      pagamento.set('plano_id', plano.id)
      pagamento.set('pedido_id', pedidoId)
      pagamento.set('versao_plano', versao)
      pagamento.set('sequencia', 1)
      pagamento.set('forma_pagamento', forma)
      pagamento.set('valor_previsto', valor)
      pagamento.set('valor_recebido', 0)
      pagamento.set('vencimento', vencimento)
      pagamento.set('status', 'aguardando_pagamento')
      pagamento.set('observacoes', 'Pagamento preparado sem confirmação financeira.')
      txApp.save(pagamento)

      const audit = new Record(txApp.findCollectionByNameOrId('auditoria_financeira'))
      audit.set('pagamento_id', pagamento.id)
      audit.set('pedido_id', pedidoId)
      audit.set('tipo_evento', versao > 1 ? 'plano_substituido' : 'plano_criado')
      audit.set('autor', auth.id)
      audit.set('versao_plano', versao)
      audit.set(
        'resumo',
        versao > 1 ? 'Nova versão do plano de pagamento criada.' : 'Plano de pagamento criado.',
      )
      audit.set('motivo', plano.getString('motivo'))
      audit.set('snapshot', { forma_pagamento: forma, valor_previsto: valor, vencimento, versao })
      txApp.save(audit)
      resultado = { plano, pagamento, versao }
    })

    return e.json(201, {
      ok: true,
      plano_id: resultado.plano.id,
      pagamento_id: resultado.pagamento.id,
      versao: resultado.versao,
      status: resultado.pagamento.getString('status'),
    })
  },
  $apis.requireAuth(),
)
