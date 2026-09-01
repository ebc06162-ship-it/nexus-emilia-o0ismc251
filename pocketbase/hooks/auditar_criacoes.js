onRecordCreateRequest(
  (e) => {
    try {
      const record = e.record
      const collectionName = record.collection().name
      if (collectionName === 'clientes_pessoas') {
        e.next()
        return
      }
      const labels = {
        clientes: 'Criação de novo cliente',
        participantes: 'Criação de participante',
        oportunidades: 'Criação de oportunidade/pedido',
        dados_entrega: 'Criação de dados de entrega',
        cerimonialistas: 'Criação de cerimonialista',
        contatos_cerimonialistas: 'Criação de contato de cerimonialista',
        grupos_parceiros: 'Criação de grupo de parceiro',
        empresas_parceiros: 'Criação de empresa parceira',
        contatos_parceiros: 'Criação de contato de parceiro',
        unidades_parceiros: 'Criação de unidade de parceiro',
        contatos_unidades_parceiros: 'Criação de vínculo de contato e unidade',
        eventos: 'Criação de evento',
        pessoas: 'Criação de nova pessoa',
        locais_entrega: 'Criação de local de entrega',
        enderecos_pessoas: 'Criação de endereço de pessoa',
        enderecos_entrega: 'Criação de endereço de entrega',
        pendencias: 'Criação de pendência',
        catalogo_itens: 'Criação de item de catálogo',
      }
      const auth = e.requestInfo && e.requestInfo().auth ? e.requestInfo().auth : null
      const audit = new Record($app.findCollectionByNameOrId('auditoria'))
      audit.set('ator_id', auth ? auth.id : '')
      audit.set('ator_nome', auth ? auth.getString('name') || auth.email : 'sistema')
      audit.set('papel', auth ? auth.getString('papel') : 'sistema')
      audit.set('objeto_tipo', collectionName)
      audit.set('objeto_id', record.id)
      audit.set('acao', 'criacao')
      audit.set('descricao', labels[collectionName] || 'Criação em ' + collectionName)
      audit.set('origem', 'interface')
      audit.set('resultado', 'permitido')
      audit.set('trace_id', record.id + '-create')
      $app.save(audit)
    } catch (err) {
      $app.logger().error('auditoria de criação falhou', 'error', String(err))
      throw e.internalServerError(
        'A alteração foi bloqueada porque não foi possível registrar a auditoria.',
      )
    }
    e.next()
  },
  'clientes',
  'participantes',
  'oportunidades',
  'dados_entrega',
  'cerimonialistas',
  'contatos_cerimonialistas',
  'grupos_parceiros',
  'empresas_parceiros',
  'contatos_parceiros',
  'unidades_parceiros',
  'contatos_unidades_parceiros',
  'eventos',
  'pessoas',
  'locais_entrega',
  'enderecos_pessoas',
  'enderecos_entrega',
  'pendencias',
  'catalogo_itens',
)
