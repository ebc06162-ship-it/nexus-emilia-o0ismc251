onRecordAfterCreateSuccess(
  (e) => {
    try {
      const record = e.record
      const auth = e.requestInfo ? e.requestInfo().auth : null
      const audit = new Record($app.findCollectionByNameOrId('auditoria'))
      audit.set('ator_id', auth ? auth.id : '')
      audit.set('ator_nome', auth ? auth.getString('name') : 'sistema')
      audit.set('papel', auth ? auth.getString('papel') : 'sistema')
      audit.set('objeto_tipo', record.collection().name)
      audit.set('objeto_id', record.id)
      audit.set('acao', 'criacao')
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
