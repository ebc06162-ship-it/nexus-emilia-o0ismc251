/// <reference path="../pb_data/types.d.ts" />
// F3-T002 (SPEC-3-001): correção do artefato do teste P7.
// Durante a prova P7 (antes da correção do guard no hook proposta_resposta), uma proposta
// já aprovada/convertida (30v9x7wmjyi30m0) recebeu recusa e devolução indevidas:
// - a recusa mutou o status para "recusada";
// - a devolução criou uma proposta de revisão k2k57syvmdq0keu (versao 2) e marcou a
//   anterior como "substituida".
// Esta migration restaura o estado canônico (aprovada), remove o artefato de teste criado
// pela prova e registra a correção na auditoria. O pedido convertido nunca foi tocado.
migrate(
  (app) => {
    const propostas = app.findCollectionByNameOrId('propostas')

    // 1. Restaurar a proposta convertida para "aprovada"
    var original = null
    try {
      original = app.findRecordById(propostas, '30v9x7wmjyi30m0')
    } catch (e) {
      original = null
    }
    if (original && original.getString('status') !== 'aprovada') {
      original.set('status', 'aprovada')
      app.save(original)
      console.log('0040: proposta 30v9x7wmjyi30m0 restaurada para aprovada')
    }

    // 2. Remover o artefato de teste criado pela devolução indevida
    // (primeiro os registros de auditoria que o referenciam — relação obrigatória)
    var artefato = null
    try {
      artefato = app.findRecordById(propostas, 'k2k57syvmdq0keu')
    } catch (e) {
      artefato = null
    }
    if (artefato) {
      // relações obrigatórias primeiro: auditoria_propostas e itens_proposta
      var auditCol = app.findCollectionByNameOrId('auditoria_propostas')
      var refsAudit = app.findRecordsByFilter(auditCol, 'proposta_id = {:pid}', '', 0, 0, {
        pid: artefato.id,
      })
      for (var r = 0; r < refsAudit.length; r++) {
        app.delete(refsAudit[r])
      }
      var itensCol = app.findCollectionByNameOrId('itens_proposta')
      var refsItens = app.findRecordsByFilter(itensCol, 'proposta_id = {:pid}', '', 0, 0, {
        pid: artefato.id,
      })
      for (var r2 = 0; r2 < refsItens.length; r2++) {
        app.delete(refsItens[r2])
      }
      app.delete(artefato)
      console.log(
        '0040: artefato k2k57syvmdq0keu removido com ' +
          refsAudit.length +
          ' auditoria(s) e ' +
          refsItens.length +
          ' item(ns)',
      )
    }

    // 3. Auditoria da correção
    const audit = new Record(app.findCollectionByNameOrId('auditoria_propostas'))
    audit.set('proposta_id', '30v9x7wmjyi30m0')
    audit.set('tipo_evento', 'recusa')
    audit.set(
      'autor',
      app.findFirstRecordByFilter(
        app.findCollectionByNameOrId('_pb_users_auth_'),
        'papel = "administrador"',
      ).id,
    )
    audit.set('versao', original ? original.getInt('versao') : 1)
    audit.set(
      'resumo',
      'F3-T002: correção pós-prova P7 — status restaurado para aprovada e artefato de teste (versao 2) removido; guard do hook proposta_resposta corrigido para negar recusa/devolução em proposta aprovada (CA-3-005).',
    )
    audit.set(
      'motivo',
      'Artefato gerado pela própria prova de segurança antes da correção do guard',
    )
    app.save(audit)

    console.log('Migration 0040 completed: estado canônico restaurado e correção auditada')
  },
  (app) => {
    // Down não destrutivo: a correção não é revertida.
    console.log('Migration 0040 down: sem acao; correção de estado é permanente')
  },
)
