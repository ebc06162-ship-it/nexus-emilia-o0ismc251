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

    if (acao === 'recusar') {
      proposta.set('status', 'recusada')
      $app.save(proposta)
      const auditoriaProposta = new Record($app.findCollectionByNameOrId('auditoria_propostas'))
      auditoriaProposta.set('proposta_id', proposta.id)
      auditoriaProposta.set('tipo_evento', 'recusa')
      auditoriaProposta.set('autor', auth.id)
      auditoriaProposta.set('versao', proposta.getInt('versao'))
      auditoriaProposta.set('resumo', 'Proposta recusada.')
      auditoriaProposta.set('motivo', String(body.motivo || '').slice(0, 500))
      $app.save(auditoriaProposta)
      return e.json(200, {
        ok: true,
        proposta_id: proposta.id,
        status: 'recusada',
        convertido: false,
      })
    }

    if (acao === 'devolver') {
      let respostaAlteracao = null
      $app.runInTransaction((txApp) => {
        const propostaAnterior = txApp.findRecordById('propostas', propostaId)
        const itensAnteriores = txApp.findRecordsByFilter(
          'itens_proposta',
          'proposta_id = {:proposta}',
          'ordem',
          0,
          0,
          { proposta: propostaId },
        )
        const propostasCollection = txApp.findCollectionByNameOrId('propostas')
        const novaProposta = new Record(propostasCollection)
        novaProposta.set('oportunidade_id', propostaAnterior.getString('oportunidade_id'))
        novaProposta.set('cliente_id', propostaAnterior.getString('cliente_id'))
        novaProposta.set('versao', propostaAnterior.getInt('versao') + 1)
        novaProposta.set('status', 'em_revisao')
        novaProposta.set('moeda', propostaAnterior.getString('moeda'))
        novaProposta.set('subtotal_snapshot', propostaAnterior.get('subtotal_snapshot'))
        novaProposta.set('desconto_snapshot', propostaAnterior.get('desconto_snapshot'))
        novaProposta.set('frete_snapshot', propostaAnterior.get('frete_snapshot'))
        novaProposta.set('total_snapshot', propostaAnterior.get('total_snapshot'))
        novaProposta.set('validade_ate', propostaAnterior.getString('validade_ate'))
        novaProposta.set('politica_id', propostaAnterior.getString('politica_id'))
        novaProposta.set(
          'politica_versao_snapshot',
          propostaAnterior.getString('politica_versao_snapshot'),
        )
        novaProposta.set(
          'tabela_comercial_snapshot',
          propostaAnterior.get('tabela_comercial_snapshot'),
        )
        novaProposta.set('condicoes_snapshot', propostaAnterior.get('condicoes_snapshot'))
        novaProposta.set('criada_por', auth.id)
        novaProposta.set('observacoes', propostaAnterior.getString('observacoes'))
        novaProposta.set('versao_anterior_id', propostaAnterior.id)
        txApp.save(novaProposta)

        const itensCollection = txApp.findCollectionByNameOrId('itens_proposta')
        const itensSnapshot = []
        for (const itemAnterior of itensAnteriores) {
          const novoItem = new Record(itensCollection)
          novoItem.set('proposta_id', novaProposta.id)
          const catalogoItemId = itemAnterior.getString('catalogo_item_id')
          if (catalogoItemId) novoItem.set('catalogo_item_id', catalogoItemId)
          novoItem.set('codigo_snapshot', itemAnterior.getString('codigo_snapshot'))
          novoItem.set('label_snapshot', itemAnterior.getString('label_snapshot'))
          novoItem.set(
            'catalogo_versao_snapshot',
            itemAnterior.getString('catalogo_versao_snapshot'),
          )
          novoItem.set('quantidade', itemAnterior.getInt('quantidade'))
          novoItem.set('preco_unitario_snapshot', itemAnterior.get('preco_unitario_snapshot'))
          novoItem.set('tipo', itemAnterior.getString('tipo'))
          novoItem.set('grupo_alternativa', itemAnterior.getString('grupo_alternativa'))
          novoItem.set('ordem', itemAnterior.getInt('ordem'))
          novoItem.set('composicao_snapshot', itemAnterior.get('composicao_snapshot'))
          txApp.save(novoItem)
          itensSnapshot.push({
            id: novoItem.id,
            codigo_snapshot: novoItem.getString('codigo_snapshot'),
            label_snapshot: novoItem.getString('label_snapshot'),
            catalogo_versao_snapshot: novoItem.getString('catalogo_versao_snapshot'),
            quantidade: novoItem.getInt('quantidade'),
            tipo: novoItem.getString('tipo'),
            grupo_alternativa: novoItem.getString('grupo_alternativa'),
            ordem: novoItem.getInt('ordem'),
            composicao_snapshot: novoItem.get('composicao_snapshot'),
          })
        }

        propostaAnterior.set('status', 'substituida')
        txApp.save(propostaAnterior)

        const auditoriaAnterior = new Record(txApp.findCollectionByNameOrId('auditoria_propostas'))
        auditoriaAnterior.set('proposta_id', propostaAnterior.id)
        auditoriaAnterior.set('tipo_evento', 'substituicao')
        auditoriaAnterior.set('autor', auth.id)
        auditoriaAnterior.set('versao', propostaAnterior.getInt('versao'))
        auditoriaAnterior.set('resumo', 'Versão substituída por devolução para alteração.')
        auditoriaAnterior.set('motivo', String(body.motivo || '').slice(0, 500))
        auditoriaAnterior.set('depois_snapshot', {
          proposta_id: propostaAnterior.id,
          nova_proposta_id: novaProposta.id,
          nova_versao: novaProposta.getInt('versao'),
        })
        txApp.save(auditoriaAnterior)

        const auditoriaNova = new Record(txApp.findCollectionByNameOrId('auditoria_propostas'))
        auditoriaNova.set('proposta_id', novaProposta.id)
        auditoriaNova.set('tipo_evento', 'alteracao')
        auditoriaNova.set('autor', auth.id)
        auditoriaNova.set('versao', novaProposta.getInt('versao'))
        auditoriaNova.set('resumo', 'Nova versão criada para alteração do orçamento.')
        auditoriaNova.set('motivo', String(body.motivo || '').slice(0, 500))
        auditoriaNova.set('antes_snapshot', {
          proposta_id: propostaAnterior.id,
          versao: propostaAnterior.getInt('versao'),
          itens: itensSnapshot,
        })
        txApp.save(auditoriaNova)
        respostaAlteracao = { proposta: novaProposta }
      })

      return e.json(200, {
        ok: true,
        proposta_id: respostaAlteracao.proposta.id,
        proposta_anterior_id: propostaId,
        versao: respostaAlteracao.proposta.getInt('versao'),
        status: 'em_revisao',
        convertido: false,
      })
    }

    let pedidoExistenteAntesDaPolitica = null
    try {
      pedidoExistenteAntesDaPolitica = $app.findFirstRecordByData(
        'pedidos',
        'proposta_id',
        propostaId,
      )
    } catch (err) {}

    if (pedidoExistenteAntesDaPolitica) {
      const auditoriaRepeticao = new Record($app.findCollectionByNameOrId('auditoria_pedidos'))
      auditoriaRepeticao.set('pedido_id', pedidoExistenteAntesDaPolitica.id)
      auditoriaRepeticao.set('proposta_id', propostaId)
      auditoriaRepeticao.set('tipo_evento', 'tentativa_conversao')
      auditoriaRepeticao.set('autor', auth.id)
      auditoriaRepeticao.set('versao_proposta', proposta.getInt('versao'))
      auditoriaRepeticao.set(
        'resumo',
        'Tentativa repetida de conversão; pedido existente reutilizado.',
      )
      auditoriaRepeticao.set('motivo', String(body.motivo || 'Conversão repetida').slice(0, 500))
      auditoriaRepeticao.set('snapshot', {
        pedido_id: pedidoExistenteAntesDaPolitica.id,
        proposta_id: propostaId,
      })
      $app.save(auditoriaRepeticao)
      return e.json(200, {
        ok: true,
        idempotente: true,
        proposta_id: propostaId,
        pedido_id: pedidoExistenteAntesDaPolitica.id,
        status: 'aprovada',
        status_operacional: pedidoExistenteAntesDaPolitica.getString('status_operacional'),
        status_financeiro: pedidoExistenteAntesDaPolitica.getString('status_financeiro'),
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
    const agora = new Date()
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()
    const diaDaData = (valor) => {
      const texto = String(valor || '').slice(0, 10)
      const partes = texto.split('-').map((parte) => Number(parte))
      if (partes.length !== 3 || partes.some((parte) => !Number.isFinite(parte))) return NaN
      return new Date(partes[0], partes[1] - 1, partes[2]).getTime()
    }
    const inicioDia = diaDaData(inicio)
    const fimDia = diaDaData(fim)
    if (!Number.isFinite(inicioDia) || !Number.isFinite(fimDia)) {
      throw e.badRequestError('A vigência da política comercial não é uma data válida.')
    }
    if (inicioDia > hoje) {
      throw e.badRequestError('A política comercial ainda não está vigente.')
    }
    if (fimDia < hoje) {
      throw e.badRequestError('A política comercial está expirada.')
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
