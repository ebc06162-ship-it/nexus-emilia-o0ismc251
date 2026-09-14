// F3-T004 (SPEC-3-002): configuração das jornadas especiais.
// RN-3-101..105 e CA-3-009/010/031. Parâmetros aprovados pela Champion em 14/09/2026.
migrate(
  (app) => {
    const auth = app.findCollectionByNameOrId('_pb_users_auth_')
    const oportunidades = app.findCollectionByNameOrId('oportunidades')

    const authenticated =
      '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    const adminGestao = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao")`
    const readOperational = `${authenticated} && (@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "atendimento" || @request.auth.papel = "financeiro" || @request.auth.papel = "producao")`

    // ---------- campos novos em oportunidades (variantes do mesmo registro canônico) ----------
    const add = (collection, field) => {
      if (!collection.fields.getByName(field.name)) collection.fields.add(field)
    }
    add(oportunidades, new NumberField({ name: 'qtd_adicional', onlyInt: true, min: 0 }))
    add(oportunidades, new NumberField({ name: 'frete_valor', min: 0 }))
    add(oportunidades, new DateField({ name: 'data_pedido' }))
    add(oportunidades, new DateField({ name: 'aviso_enviado_em' }))
    add(oportunidades, new DateField({ name: 'confirmacao_recebida_em' }))
    add(oportunidades, new TextField({ name: 'origem_parceiro', max: 160 }))
    app.save(oportunidades)

    // ---------- coleção config_jornadas (RN-3-105: só Administrador/Gestão altera) ----------
    let config = null
    try {
      config = app.findCollectionByNameOrId('config_jornadas')
    } catch (_) {
      config = null
    }
    if (!config) {
      config = new Collection({
        name: 'config_jornadas',
        type: 'base',
        listRule: readOperational,
        viewRule: readOperational,
        createRule: adminGestao,
        updateRule: adminGestao,
        deleteRule: null,
        fields: [
          {
            name: 'jornada',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['degustacao', 'evento', 'revendedor', 'bem_nascido'],
          },
          { name: 'campos_obrigatorios', type: 'json' },
          { name: 'regras', type: 'json' },
          { name: 'ativo', type: 'bool', required: true },
          {
            name: 'atualizado_por',
            type: 'relation',
            required: true,
            collectionId: auth.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_config_jornadas_jornada ON config_jornadas (jornada)'],
      })
      app.save(config)
    }

    // ---------- seed: parâmetros aprovados pela Champion (14/09/2026) ----------
    const admin = app.findFirstRecordByFilter(
      '_pb_users_auth_',
      'papel = "administrador" && ativo = true',
    )
    const seeds = [
      {
        jornada: 'degustacao',
        campos_obrigatorios: ['modalidade_entrega'],
        regras: {
          cortesia: 'presencial e retirada nao geram cobranca',
          frete: 'enviada (motoboy/Lalamove ou Sedex) gera cobranca de frete',
          frete_margem_lalamove: 7,
          adicional: 'bem-casados alem dos 4 de cortesia sao cobrados no mesmo registro',
          capacidade_semanal: null,
          capacidade_nota: 'sem limite definido: acompanhamento manual pela equipe',
          parceiros:
            'origem_parceiro registra o parceiro; evento de parceiro = cortesia total; permuta registrada em observacoes',
        },
        ativo: true,
      },
      {
        jornada: 'evento',
        campos_obrigatorios: [
          'data_evento',
          'qtd_bem_casados',
          'local_evento',
          'referencia_paleta',
        ],
        regras: {
          minimo: 'data, quantidade, local e personalizacao (RN-3-102)',
          falta: 'status aguardando_dados + pendencia nomeada',
        },
        ativo: true,
      },
      {
        jornada: 'revendedor',
        campos_obrigatorios: ['datas_entrega', 'data_pedido'],
        regras: {
          separacao: 'um pedido por data de entrega (RN-3-103)',
          preco:
            'preco vale pela DATA DO PEDIDO (snapshot); nova tabela so afeta pedidos novos; sem nova tabela, mantem o preco da vencida',
          vencimento_politica: null,
          vencimento_nota: 'politica de vencimento nao aprovada: conferencia manual pela equipe',
        },
        ativo: true,
      },
      {
        jornada: 'bem_nascido',
        campos_obrigatorios: ['data_estimada_parto', 'responsavel_acompanhamento'],
        regras: {
          previsao: 'data_estimada_parto e Previsao, nunca data confirmada',
          aviso: 'aviso_enviado_em registra o aviso; confirmacao_recebida_em a confirmacao',
          sla_dias: null,
          sla_nota: 'SLA nao definido: aviso manual + pendencia (RN-3-104)',
          producao: 'aviso NUNCA libera producao automaticamente',
        },
        ativo: true,
      },
    ]
    for (const s of seeds) {
      const existente = app.findFirstRecordByFilter(
        'config_jornadas',
        'jornada = "' + s.jornada + '"',
      )
      if (existente) continue
      const rec = new Record(config)
      rec.set('jornada', s.jornada)
      rec.set('campos_obrigatorios', JSON.stringify(s.campos_obrigatorios))
      rec.set('regras', JSON.stringify(s.regras))
      rec.set('ativo', true)
      rec.set('atualizado_por', admin ? admin.id : '')
      app.save(rec)
    }

    console.log('Migration 0041 completed: config_jornadas + campos de jornada')
  },
  (app) => {
    // rollback não destrutivo: remove apenas campos adicionados; mantém config
    try {
      const oportunidades = app.findCollectionByNameOrId('oportunidades')
      for (const n of [
        'qtd_adicional',
        'frete_valor',
        'data_pedido',
        'aviso_enviado_em',
        'confirmacao_recebida_em',
        'origem_parceiro',
      ]) {
        const f = oportunidades.fields.getByName(n)
        if (f) oportunidades.fields.removeByName(n)
      }
      app.save(oportunidades)
    } catch (e) {
      console.log('rollback 0041: ' + e.message)
    }
    console.log('Migration 0041 rollback: campos de jornada removidos; config_jornadas preservada')
  },
)
