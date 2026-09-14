// F3-T006 (SPEC-3-003): fila e liberação controlada de produção.
// RN-3-201..205 e CA-3-015/016/019. Parâmetros G3-OPS-01 aprovados pela Champion em 14/09/2026.
// NOTA: no Skip esta migration pode ser aplicada com ordinal deslocado (offset documentado);
// no repo mantém 0043 para a sequência local.
migrate(
  (app) => {
    const auth = app.findCollectionByNameOrId('_pb_users_auth_')
    const pedidos = app.findCollectionByNameOrId('pedidos')

    const authenticated =
      '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    const readOperational = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento" || @request.auth.papel = "financeiro" || @request.auth.papel = "producao")`
    const writeOperational = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "producao")`

    // ---------- 1. novos estados de produção em pedidos (aditivo) ----------
    const so = pedidos.fields.getByName('status_operacional')
    if (so && so.type === 'select') {
      const novos = ['pronto_producao', 'em_producao', 'pronto_expedicao', 'ocorrencia']
      for (const v of novos) {
        if (!so.values.includes(v)) so.values.push(v)
      }
    }
    const addField = (field) => {
      if (!pedidos.fields.getByName(field.name)) pedidos.fields.add(field)
    }
    addField(new Field({ name: 'liberado_por', type: 'relation', collectionId: auth.id }))
    addField(new Field({ name: 'liberado_em', type: 'date' }))
    addField(new Field({ name: 'liberacao_versao', type: 'number' }))
    addField(new Field({ name: 'data_fechada_por', type: 'relation', collectionId: auth.id }))
    addField(new Field({ name: 'urgente', type: 'bool' }))
    app.save(pedidos)

    // ---------- 2. coleção ocorrencias_producao (RN-3-203/204) ----------
    let ocorrencias = null
    try {
      ocorrencias = app.findCollectionByNameOrId('ocorrencias_producao')
    } catch (_) {
      ocorrencias = null
    }
    if (!ocorrencias) {
      ocorrencias = new Collection({
        name: 'ocorrencias_producao',
        type: 'base',
        listRule: readOperational,
        viewRule: readOperational,
        createRule: writeOperational,
        updateRule: writeOperational,
        deleteRule: null,
        fields: [
          {
            name: 'pedido_id',
            type: 'relation',
            required: true,
            collectionId: pedidos.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['falta_material', 'impossibilidade', 'alteracao_tardia'],
          },
          { name: 'motivo', type: 'text', required: true },
          {
            name: 'dono',
            type: 'relation',
            required: true,
            collectionId: auth.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'proxima_acao', type: 'text', required: true },
          { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['aberta', 'resolvida'] },
          {
            name: 'registrado_por',
            type: 'relation',
            required: true,
            collectionId: auth.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ocorrencias_pedido ON ocorrencias_producao (pedido_id)',
          'CREATE INDEX idx_ocorrencias_status ON ocorrencias_producao (status)',
        ],
      })
      app.save(ocorrencias)
    }

    // ---------- 3. marcação de líder de produção nos usuários ----------
    if (!auth.fields.getByName('lider_producao')) {
      auth.fields.add(new Field({ name: 'lider_producao', type: 'bool' }))
    }
    if (!auth.fields.getByName('hierarquia_maior')) {
      auth.fields.add(new Field({ name: 'hierarquia_maior', type: 'bool' }))
    }
    app.save(auth)

    // seed: líderes nominais aprovados (G3-OPS-01) — por nome, se existirem
    const lideres = [
      { nome: 'Fernanda', hierarquia: true },
      { nome: 'Mara', hierarquia: true },
      { nome: 'Ivanete', hierarquia: false },
      { nome: 'Elaine', hierarquia: false },
      { nome: 'Vitória', hierarquia: false },
    ]
    for (const l of lideres) {
      var u = null
      try {
        u = app.findFirstRecordByFilter('_pb_users_auth_', 'name = "' + l.nome + '"')
      } catch (eL) {
        u = null
      }
      if (u) {
        u.set('lider_producao', true)
        u.set('hierarquia_maior', l.hierarquia)
        app.save(u)
      }
    }

    console.log('Migration 0043 completed: fila de produção (estados, ocorrências, líderes)')
  },
  (app) => {
    try {
      const pedidos = app.findCollectionByNameOrId('pedidos')
      for (const n of ['liberado_por', 'liberado_em', 'liberacao_versao', 'data_fechada_por', 'urgente']) {
        const f = pedidos.fields.getByName(n)
        if (f) pedidos.fields.removeByName(n)
      }
      app.save(pedidos)
    } catch (e) {
      console.log('rollback 0043 pedidos: ' + e.message)
    }
    try {
      const ocorrencias = app.findCollectionByNameOrId('ocorrencias_producao')
      app.delete(ocorrencias)
    } catch (e2) {
      console.log('rollback 0043 ocorrencias: ' + e2.message)
    }
    console.log('Migration 0043 rollback concluído')
  },
)
