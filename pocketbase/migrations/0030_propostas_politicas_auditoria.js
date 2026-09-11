migrate(
  (app) => {
    const auth = app.findCollectionByNameOrId('_pb_users_auth_')
    const clientes = app.findCollectionByNameOrId('clientes')
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const catalogo = app.findCollectionByNameOrId('catalogo_itens')

    const politicas = new Collection({
      name: 'politicas_comerciais',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          values: [
            'tabela_comercial',
            'frete',
            'desconto',
            'adicional',
            'validade',
            'pagamento',
            'termo',
            'outro',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'versao', type: 'text', required: true },
        { name: 'moeda', type: 'text' },
        { name: 'vigencia_inicio', type: 'date' },
        { name: 'vigencia_fim', type: 'date' },
        { name: 'fonte', type: 'text' },
        {
          name: 'aprovador',
          type: 'relation',
          collectionId: auth.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'estado',
          type: 'select',
          values: ['rascunho', 'pendente_aprovacao', 'aprovada', 'inativa', 'bloqueada'],
          required: true,
          maxSelect: 1,
        },
        { name: 'alcada', type: 'text' },
        { name: 'precedencia', type: 'number', onlyInt: true },
        { name: 'formula_ou_valor', type: 'json' },
        {
          name: 'vinculo_tipo',
          type: 'select',
          values: ['base', 'cliente', 'grupo', 'parceiro', 'outro'],
          maxSelect: 1,
        },
        {
          name: 'vinculo_cliente',
          type: 'relation',
          collectionId: clientes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'vinculo_referencia', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_politicas_tipo_estado ON politicas_comerciais (tipo, estado)',
        'CREATE INDEX idx_politicas_vigencia ON politicas_comerciais (vigencia_inicio, vigencia_fim)',
        'CREATE INDEX idx_politicas_cliente ON politicas_comerciais (vinculo_cliente)',
      ],
    })
    app.save(politicas)

    const propostas = new Collection({
      name: 'propostas',
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
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'versao', type: 'number', required: true, onlyInt: true, min: 1 },
        {
          name: 'status',
          type: 'select',
          values: [
            'rascunho',
            'em_revisao',
            'enviada',
            'aprovada',
            'recusada',
            'expirada',
            'substituida',
            'bloqueada',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'moeda', type: 'text', required: true },
        { name: 'subtotal_snapshot', type: 'number' },
        { name: 'desconto_snapshot', type: 'number' },
        { name: 'frete_snapshot', type: 'number' },
        { name: 'total_snapshot', type: 'number' },
        { name: 'validade_ate', type: 'date' },
        {
          name: 'politica_id',
          type: 'relation',
          collectionId: politicas.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'politica_versao_snapshot', type: 'text' },
        { name: 'tabela_comercial_snapshot', type: 'json' },
        { name: 'condicoes_snapshot', type: 'json' },
        {
          name: 'criada_por',
          type: 'relation',
          required: true,
          collectionId: auth.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'enviada_em', type: 'date' },
        { name: 'aprovada_em', type: 'date' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_propostas_oportunidade ON propostas (oportunidade_id)',
        'CREATE INDEX idx_propostas_cliente ON propostas (cliente_id)',
        'CREATE INDEX idx_propostas_status ON propostas (status)',
      ],
    })
    app.save(propostas)
    propostas.fields.add(
      new RelationField({
        name: 'versao_anterior_id',
        collectionId: propostas.id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    app.save(propostas)

    const itens = new Collection({
      name: 'itens_proposta',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        {
          name: 'proposta_id',
          type: 'relation',
          required: true,
          collectionId: propostas.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'catalogo_item_id',
          type: 'relation',
          collectionId: catalogo.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'codigo_snapshot', type: 'text' },
        { name: 'label_snapshot', type: 'text', required: true },
        { name: 'catalogo_versao_snapshot', type: 'text' },
        { name: 'quantidade', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'preco_unitario_snapshot', type: 'number' },
        {
          name: 'tipo',
          type: 'select',
          values: ['cumulativo', 'alternativa', 'servico', 'observacao'],
          required: true,
          maxSelect: 1,
        },
        { name: 'grupo_alternativa', type: 'text' },
        { name: 'ordem', type: 'number', required: true, onlyInt: true, min: 0 },
        { name: 'composicao_snapshot', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_itens_proposta_proposta ON itens_proposta (proposta_id)',
        'CREATE INDEX idx_itens_proposta_grupo ON itens_proposta (proposta_id, grupo_alternativa)',
        'CREATE INDEX idx_itens_proposta_catalogo ON itens_proposta (catalogo_item_id)',
      ],
    })
    app.save(itens)

    const auditoria = new Collection({
      name: 'auditoria_propostas',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'proposta_id',
          type: 'relation',
          required: true,
          collectionId: propostas.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo_evento',
          type: 'select',
          values: [
            'criacao',
            'alteracao',
            'envio',
            'aprovacao',
            'recusa',
            'expiracao',
            'substituicao',
            'bloqueio',
            'excecao',
          ],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'autor',
          type: 'relation',
          required: true,
          collectionId: auth.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'versao', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'resumo', type: 'text', required: true },
        { name: 'antes_snapshot', type: 'json' },
        { name: 'depois_snapshot', type: 'json' },
        { name: 'motivo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE INDEX idx_auditoria_propostas_proposta ON auditoria_propostas (proposta_id)',
        'CREATE INDEX idx_auditoria_propostas_tipo ON auditoria_propostas (tipo_evento)',
      ],
    })
    app.save(auditoria)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('auditoria_propostas'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('itens_proposta'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('propostas'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('politicas_comerciais'))
    } catch (e) {}
  },
)
