/// <reference path="../pb_data/types.d.ts" />
// F3-T005 (SPEC-3-002): borda de troca de tipo no meio do caminho.
// Alterar o tipo da oportunidade cria registro no histórico (versão auditável)
// sem apagar valores anteriores (RN: preservar origem e histórico).
onRecordUpdateRequest((e) => {
  try {
    const novo = e.record
    const original = $app.findRecordById('oportunidades', novo.id)
    const tipoNovo = novo.getString('tipo_pedido') || novo.getString('tipo_evento') || ''
    const tipoAntigo = original.getString('tipo_pedido') || original.getString('tipo_evento') || ''
    if (tipoNovo && tipoAntigo && tipoNovo !== tipoAntigo) {
      const auth = e.auth
      const hist = new Record($app.findCollectionByNameOrId('historico_eventos'))
      hist.set('oportunidade_id', novo.id)
      hist.set(
        'descricao',
        'Tipo de evento alterado de ' +
          tipoAntigo +
          ' para ' +
          tipoNovo +
          '; valores anteriores preservados.',
      )
      hist.set('tipo_evento', 'atualizacao')
      hist.set('autor', auth ? auth.id : '')
      hist.set('campo', 'tipo_evento')
      hist.set('origem', 'troca_tipo')
      hist.set('valor_anterior', tipoAntigo)
      hist.set('valor_novo', tipoNovo)
      $app.save(hist)
    }
  } catch (err) {
    console.log('registrar_troca_tipo: ' + err.message)
  }
  e.next()
}, 'oportunidades')
