/// <reference path="../pb_data/types.d.ts" />
// F3-T006 (SPEC-3-003): registro de andamento da produção.
// RN-3-203/204 e CA-3-018. Produção registra início/andamento/conclusão sem
// alterar preço/pagamento; falta de material ou impossibilidade = ocorrência
// com dono e próxima ação (nunca marca concluído).
routerAdd(
  'POST',
  '/backend/v1/pedidos/{id}/andamento',
  (e) => {
    const auth = e.auth
    if (!auth || !auth.getString('ativo')) throw e.unauthorizedError('Sessão inválida.')
    const papel = auth.getString('papel')
    if (papel !== 'producao' && papel !== 'administrador' && papel !== 'gestao') {
      throw e.forbiddenError('Seu perfil não pode registrar andamento de produção.')
    }

    const id = e.request.pathValue('id')
    const pedido = $app.findRecordById('pedidos', id)
    const body = e.requestInfo().body || {}
    const acao = String(body.acao || '').trim()
    const validas = ['iniciar', 'andamento', 'concluir', 'falta_material', 'impossibilidade']
    if (!validas.includes(acao)) {
      throw e.badRequestError('Ação inválida. Use: ' + validas.join(', '))
    }

    if (acao === 'iniciar') {
      if (pedido.getString('status_operacional') !== 'pronto_producao') {
        throw e.badRequestError('Pedido não está liberado para produção.')
      }
      pedido.set('status_operacional', 'em_producao')
    } else if (acao === 'andamento') {
      if (pedido.getString('status_operacional') !== 'em_producao') {
        throw e.badRequestError('Pedido não está em produção.')
      }
    } else if (acao === 'concluir') {
      if (pedido.getString('status_operacional') !== 'em_producao') {
        throw e.badRequestError('Pedido não está em produção.')
      }
      pedido.set('status_operacional', 'pronto_expedicao')
    } else {
      const motivo = String(body.motivo || '').trim()
      if (!motivo) throw e.badRequestError('Informe o motivo da ocorrência.')
      const proximaAcao = String(body.proxima_acao || '').trim()
      if (!proximaAcao) throw e.badRequestError('Informe a próxima ação da ocorrência.')

      const ocorrencia = new Record($app.findCollectionByNameOrId('ocorrencias_producao'))
      ocorrencia.set('pedido_id', id)
      ocorrencia.set('tipo', acao === 'falta_material' ? 'falta_material' : 'impossibilidade')
      ocorrencia.set('motivo', motivo)
      ocorrencia.set('dono', auth.id)
      ocorrencia.set('proxima_acao', proximaAcao)
      ocorrencia.set('status', 'aberta')
      ocorrencia.set('registrado_por', auth.id)
      $app.save(ocorrencia)

      pedido.set('status_operacional', 'ocorrencia')
    }

    $app.save(pedido)

    const audit = new Record($app.findCollectionByNameOrId('auditoria'))
    audit.set('ator_id', auth.id)
    audit.set('ator_nome', auth.getString('name'))
    audit.set('papel', papel)
    audit.set('objeto_tipo', 'pedidos')
    audit.set('objeto_id', id)
    audit.set('acao', 'producao_' + acao)
    audit.set('descricao', 'Produção: ' + acao)
    audit.set('resultado', 'permitido')
    audit.set('origem', 'hook_andamento_producao')
    $app.save(audit)

    return e.json(200, { ok: true, acao: acao, status: pedido.getString('status_operacional') })
  },
  $apis.requireAuth(),
)
