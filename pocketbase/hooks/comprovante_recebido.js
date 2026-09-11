onRecordAfterCreateSuccess((e) => {
  try {
    const comprovante = e.record
    const pagamento = $app.findRecordById('pagamentos', comprovante.getString('pagamento_id'))
    pagamento.set('status', 'comprovante_recebido')
    pagamento.set('observacoes', 'Comprovante recebido; aguarda conferência do Financeiro.')
    $app.save(pagamento)

    const audit = new Record($app.findCollectionByNameOrId('auditoria_financeira'))
    audit.set('pagamento_id', pagamento.id)
    audit.set('pedido_id', comprovante.getString('pedido_id'))
    audit.set('comprovante_id', comprovante.id)
    audit.set(
      'tipo_evento',
      comprovante.getString('substitui_id') ? 'comprovante_substituido' : 'comprovante_recebido',
    )
    audit.set('autor', comprovante.getString('enviado_por'))
    audit.set('versao_plano', pagamento.getInt('versao_plano'))
    audit.set('versao_comprovante', comprovante.getInt('versao'))
    audit.set(
      'resumo',
      comprovante.getString('substitui_id')
        ? 'Nova versão de comprovante recebida; versão anterior preservada.'
        : 'Comprovante recebido e enviado para a fila financeira.',
    )
    audit.set('snapshot', {
      pagamento_id: pagamento.id,
      comprovante_id: comprovante.id,
      versao: comprovante.getInt('versao'),
    })
    $app.save(audit)
  } catch (err) {
    $app.logger().error('pós-processamento do comprovante falhou', 'error', String(err))
  }
  e.next()
}, 'comprovantes_pagamento')
