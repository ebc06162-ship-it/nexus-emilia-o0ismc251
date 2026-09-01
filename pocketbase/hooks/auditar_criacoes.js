onRecordAfterCreateSuccess(
  (e) => {
    try {
      const record = e.record
      const collectionName = record.collection().name
      if (collectionName === 'clientes_pessoas') {
        e.next()
        return
      }
      const labels = {
        clientes: 'Cadastro de cliente',
        participantes: 'Registro de participante',
        oportunidades: 'Registro de oportunidade/pedido',
        dados_entrega: 'Dados de entrega',
        cerimonialistas: 'Cadastro de cerimonialista',
        contatos_cerimonialistas: 'Contato de cerimonialista',
        grupos_parceiros: 'Grupo de parceiro',
        empresas_parceiros: 'Empresa parceira',
        contatos_parceiros: 'Contato de parceiro',
        unidades_parceiros: 'Unidade de parceiro',
        contatos_unidades_parceiros: 'Vínculo de contato e unidade',
        eventos: 'Registro de evento',
        pessoas: 'Cadastro de pessoa',
        locais_entrega: 'Local de entrega',
        enderecos_pessoas: 'Endereço de pessoa',
        enderecos_entrega: 'Endereço de entrega',
        pendencias: 'Registro de pendência',
        catalogo_itens: 'Item de catálogo',
      }
      const auth = e.requestInfo ? e.requestInfo().auth : null
      const audit = new Record($app.findCollectionByNameOrId('auditoria'))
      audit.set('ator_id', auth ? auth.id : '')
      audit.set('ator_nome', auth ? auth.getString('name') : 'sistema')
      audit.set('papel', auth ? auth.getString('papel') : 'sistema')
      audit.set('objeto_tipo', collectionName)
      audit.set('objeto_id', record.id)
      audit.set('acao', 'criacao')
      audit.set('descricao', labels[collectionName] || 'Criação em ' + collectionName)
      audit.set('origem', 'pocketbase')
      audit.set('resultado', 'permitido')
      audit.set('trace_id', record.id + '-create')
      $app.save(audit)
    } catch (err) {
      $app.logger().error('auditoria pós-criação falhou', 'error', String(err))
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
  'clientes_pessoas',
  'locais_entrega',
  'enderecos_pessoas',
  'enderecos_entrega',
  'pendencias',
  'catalogo_itens',
)
