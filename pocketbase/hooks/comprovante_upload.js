routerAdd(
  'POST',
  '/backend/v1/pagamentos/{id}/comprovantes',
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
      throw e.forbiddenError('Seu perfil não pode incluir comprovantes.')
    }

    const pagamentoId = e.request.pathValue('id')
    let pagamento
    try {
      pagamento = $app.findRecordById('pagamentos', pagamentoId)
    } catch (err) {
      throw e.notFoundError('Pagamento não encontrado.')
    }
    const pedidoId = pagamento.getString('pedido_id')
    const pedido = $app.findRecordById('pedidos', pedidoId)
    if (papel === 'atendimento' && pedido.getString('convertido_por') !== auth.id) {
      throw e.forbiddenError('Você só pode incluir comprovantes nos seus próprios pedidos.')
    }

    const arquivos = e.findUploadedFiles('arquivos')
    if (!arquivos || arquivos.length < 1 || arquivos.length > 3) {
      throw e.badRequestError('Envie de 1 a 3 arquivos por comprovante.')
    }
    const permitidos = ['application/pdf', 'image/jpeg', 'image/png']
    for (const arquivo of arquivos) {
      const nome = String(arquivo.name || arquivo.filename || '').toLowerCase()
      const tipo = String(arquivo.contentType || arquivo.mimeType || '').toLowerCase()
      if (nome && !(/\.pdf$/.test(nome) || /\.(jpg|jpeg|png)$/.test(nome))) {
        throw e.badRequestError('Formato inválido. Aceitos: PDF, JPG/JPEG e PNG.')
      }
      if (tipo && permitidos.indexOf(tipo) < 0) {
        throw e.badRequestError('Formato inválido. Aceitos: PDF, JPG/JPEG e PNG.')
      }
    }

    let resultado = null
    $app.runInTransaction((txApp) => {
      const atuais = txApp.findRecordsByFilter(
        'comprovantes_pagamento',
        'pagamento_id = {:pagamento}',
        '-versao',
        1,
        0,
        { pagamento: pagamentoId },
      )
      const anterior = atuais.length ? atuais[0] : null
      const versao = anterior ? anterior.getInt('versao') + 1 : 1
      if (anterior) {
        anterior.set('status', 'substituido')
        txApp.save(anterior)
      }

      const comprovante = new Record(txApp.findCollectionByNameOrId('comprovantes_pagamento'))
      comprovante.set('pagamento_id', pagamentoId)
      comprovante.set('pedido_id', pedidoId)
      comprovante.set('versao', versao)
      comprovante.set('arquivos', arquivos)
      if (anterior) comprovante.set('substitui_id', anterior.id)
      comprovante.set('status', 'recebido')
      comprovante.set('enviado_por', auth.id)
      comprovante.set('enviado_em', new Date().toISOString())
      comprovante.set(
        'observacoes',
        String((e.requestInfo().body || {}).observacoes || '').slice(0, 500),
      )
      txApp.save(comprovante)
      resultado = { comprovante, versao }
    })

    return e.json(201, {
      ok: true,
      comprovante_id: resultado.comprovante.id,
      versao: resultado.versao,
      status: 'recebido',
      pagamento_status: 'comprovante_recebido',
      mensagem:
        'Comprovante recebido e enviado para conferência. O pagamento não foi confirmado automaticamente.',
    })
  },
  $apis.requireAuth(),
  $apis.bodyLimit(33554432),
)
