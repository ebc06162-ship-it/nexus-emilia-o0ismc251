migrate(
  (app) => {
    // ========== COLLECTION: clientes ==========
    const clientes = new Collection({
      name: 'clientes',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone_principal', type: 'text', required: false },
        { name: 'telefone_secundario', type: 'text', required: false },
        { name: 'email', type: 'email', required: false },
        {
          name: 'tipo_cliente',
          type: 'select',
          values: ['noiva', 'cerimonialista', 'corporativo', 'outro'],
          required: false,
          maxSelect: 1,
        },
        { name: 'cpf_cnpj', type: 'text', required: false },
        {
          name: 'origem_contato',
          type: 'select',
          values: [
            'whatsapp',
            'telefone',
            'email',
            'presencial',
            'indicacao',
            'instagram',
            'site',
            'outro',
          ],
          required: false,
          maxSelect: 1,
        },
        { name: 'nome_noivos', type: 'text', required: false },
        { name: 'source_ref', type: 'text', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_clientes_telefone ON clientes (telefone_principal)',
        'CREATE INDEX idx_clientes_source_ref ON clientes (source_ref)',
      ],
    })
    app.save(clientes)

    // ========== COLLECTION: participantes ==========
    const participantes = new Collection({
      name: 'participantes',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        {
          name: 'papel',
          type: 'select',
          values: [
            'noivo',
            'noiva',
            'padrinho',
            'madrinha',
            'mae_noiva',
            'mae_noivo',
            'pai_noiva',
            'pai_noivo',
            'cerimonialista',
            'outro',
          ],
          required: false,
          maxSelect: 1,
        },
        { name: 'telefone', type: 'text', required: false },
        { name: 'email', type: 'email', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_participantes_cliente ON participantes (cliente_id)'],
    })
    app.save(participantes)

    // ========== COLLECTION: oportunidades ==========
    const oportunidades = new Collection({
      name: 'oportunidades',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_pedido',
          type: 'select',
          values: [
            'casamento',
            'batizado',
            'aniversario',
            'corporativo',
            'maternidade',
            'bodas',
            'outro',
          ],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: [
            'novo',
            'em_briefing',
            'aguardando_dados',
            'em_proposta',
            'fechado',
            'perdido',
            'cancelado',
          ],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'responsavel_atual',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'proxima_acao', type: 'text', required: false },
        { name: 'prazo_proxima_acao', type: 'date', required: false },
        { name: 'source_ref', type: 'text', required: false },
        { name: 'valor_estimado', type: 'number', required: false },
        { name: 'data_evento', type: 'date', required: false },
        { name: 'local_evento', type: 'text', required: false },
        { name: 'qtd_convidados', type: 'number', required: false, onlyInt: true },
        { name: 'qtd_bem_casados', type: 'number', required: false, onlyInt: true },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_oportunidades_cliente ON oportunidades (cliente_id)',
        'CREATE INDEX idx_oportunidades_responsavel ON oportunidades (responsavel_atual)',
        'CREATE INDEX idx_oportunidades_status ON oportunidades (status)',
        'CREATE INDEX idx_oportunidades_source_ref ON oportunidades (source_ref)',
      ],
    })
    app.save(oportunidades)

    // ========== COLLECTION: pendencias ==========
    const pendencias = new Collection({
      name: 'pendencias',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        {
          name: 'oportunidade_id',
          type: 'relation',
          required: true,
          collectionId: oportunidades.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'motivo', type: 'text', required: true },
        {
          name: 'responsavel',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'proxima_acao', type: 'text', required: true },
        { name: 'prazo', type: 'date', required: true },
        {
          name: 'pending_type',
          type: 'select',
          values: [
            'campo_ausente',
            'identity_conflict',
            'decisao_gestao',
            'aguardando_cliente',
            'outro',
          ],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['aberta', 'resolvida'],
          required: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pendencias_oportunidade ON pendencias (oportunidade_id)',
        'CREATE INDEX idx_pendencias_responsavel ON pendencias (responsavel)',
        'CREATE INDEX idx_pendencias_status ON pendencias (status)',
      ],
    })
    app.save(pendencias)

    // ========== COLLECTION: historico_eventos ==========
    const historico = new Collection({
      name: 'historico_eventos',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'oportunidade_id',
          type: 'relation',
          required: true,
          collectionId: oportunidades.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'descricao', type: 'text', required: true },
        {
          name: 'tipo_evento',
          type: 'select',
          values: ['criacao', 'atualizacao', 'transicao_status', 'contato', 'nota', 'erro'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'autor',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: ['CREATE INDEX idx_historico_oportunidade ON historico_eventos (oportunidade_id)'],
    })
    app.save(historico)

    // ========== COLLECTION: dados_entrega ==========
    const dadosEntrega = new Collection({
      name: 'dados_entrega',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        {
          name: 'oportunidade_id',
          type: 'relation',
          required: true,
          collectionId: oportunidades.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'local_entrega', type: 'text', required: false },
        { name: 'endereco_entrega', type: 'text', required: false },
        { name: 'complemento', type: 'text', required: false },
        { name: 'bairro_entrega', type: 'text', required: false },
        { name: 'cep_entrega', type: 'text', required: false },
        { name: 'cidade_entrega', type: 'text', required: false },
        { name: 'ref_endereco', type: 'text', required: false },
        { name: 'horario_evento', type: 'text', required: false },
        { name: 'responsavel_receber', type: 'text', required: false },
        { name: 'hor_previsto_entrega', type: 'text', required: false },
        { name: 'pedido_ifood', type: 'text', required: false },
        { name: 'situacao_pedido', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_dados_entrega_oportunidade ON dados_entrega (oportunidade_id)'],
    })
    app.save(dadosEntrega)

    // ========== SEED: usuarios de teste ==========
    // F3-T001 (SPEC-3-001): senha vem do secret EMILIA_*_PASSWORD; sem secret,
    // a conta nasce com senha aleatória não registrada e desativada (RN-3-002).
    function senhaPorSecret(email) {
      var mapa = {
        'fernanda@emiliabemcasados.local': 'EMILIA_FERNANDA_PASSWORD',
        'mara@emiliabemcasados.local': 'EMILIA_MARA_PASSWORD',
        'anie@emiliabemcasados.local': 'EMILIA_ANIE_PASSWORD',
      }
      var s = $os.getenv(mapa[email]) || ''
      if (s !== '') return { senha: s, ativa: true }
      return { senha: $security.randomString(24), ativa: false }
    }

    var users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      var cred = senhaPorSecret('fernanda@emiliabemcasados.local')
      var fernanda = new Record(users, {
        email: 'fernanda@emiliabemcasados.local',
        name: 'Fernanda',
        password: cred.senha,
        passwordConfirm: cred.senha,
      })
      fernanda.set('ativo', cred.ativa)
      app.save(fernanda)
    } catch (e) {
      console.log('fernanda already exists')
    }

    try {
      var cred = senhaPorSecret('mara@emiliabemcasados.local')
      var mara = new Record(users, {
        email: 'mara@emiliabemcasados.local',
        name: 'Mara',
        password: cred.senha,
        passwordConfirm: cred.senha,
      })
      mara.set('ativo', cred.ativa)
      app.save(mara)
    } catch (e) {
      console.log('mara already exists')
    }

    try {
      var cred = senhaPorSecret('anie@emiliabemcasados.local')
      var anie = new Record(users, {
        email: 'anie@emiliabemcasados.local',
        name: 'Anie',
        password: cred.senha,
        passwordConfirm: cred.senha,
      })
      anie.set('ativo', cred.ativa)
      app.save(anie)
    } catch (e) {
      console.log('anie already exists')
    }

    console.log('Migration 0001 completed: 6 collections created and 3 seed users added')
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('dados_entrega'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('historico_eventos'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('pendencias'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('oportunidades'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('participantes'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('clientes'))
    } catch (e) {}
    console.log('Migration 0001 rolled back')
  },
)
