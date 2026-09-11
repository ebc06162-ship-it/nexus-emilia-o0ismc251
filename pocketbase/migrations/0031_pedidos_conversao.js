migrate(
  (app) => {
    const auth = app.findCollectionByNameOrId('_pb_users_auth_')
    const clientes = app.findCollectionByNameOrId('clientes')
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const propostas = app.findCollectionByNameOrId('propostas')

    const pedidos = new Collection({
      name: 'pedidos',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
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
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'oportunidade_id',
          type: 'relation',
          required: true,
          collectionId: oportunidades.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'status_comercial',
          type: 'select',
          values: ['aprovado', 'cancelado', 'substituido'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'status_operacional',
          type: 'select',
          values: ['entrega', 'falta_definicao', 'em_alteracao', 'previsao_entrega', 'suspenso'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'status_financeiro',
          type: 'select',
          values: [
            'aguardando_pagamento',
            'parcial_em_dia',
            'parcial_em_atraso',
            'pago',
            'comprovante_recebido',
            'em_conferencia',
            'divergente',
            'pendente_correcao',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'versao_proposta_snapshot', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'quantidade_snapshot', type: 'number', required: false, onlyInt: true, min: 0 },
        { name: 'composicao_snapshot', type: 'json', required: true },
        { name: 'tabela_comercial_snapshot', type: 'json' },
        { name: 'condicoes_snapshot', type: 'json' },
        { name: 'subtotal_snapshot', type: 'number' },
        { name: 'desconto_snapshot', type: 'number' },
        { name: 'frete_snapshot', type: 'number' },
        { name: 'total_snapshot', type: 'number' },
        {
          name: 'convertido_por',
          type: 'relation',
          required: true,
          collectionId: auth.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'convertido_em', type: 'date', required: true },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pedidos_proposta_unica ON pedidos (proposta_id)',
        'CREATE INDEX idx_pedidos_cliente ON pedidos (cliente_id)',
        'CREATE INDEX idx_pedidos_oportunidade ON pedidos (oportunidade_id)',
        'CREATE INDEX idx_pedidos_status_operacional ON pedidos (status_operacional)',
        'CREATE INDEX idx_pedidos_status_financeiro ON pedidos (status_financeiro)',
      ],
    })
    app.save(pedidos)

    propostas.fields.add(
      new RelationField({
        name: 'pedido_id',
        collectionId: pedidos.id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    app.save(propostas)

    const auditoria = new Collection({
      name: 'auditoria_pedidos',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: null,
      updateRule: null,
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
          values: ['conversao', 'tentativa_conversao', 'bloqueio'],
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
        { name: 'versao_proposta', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'resumo', type: 'text', required: true },
        { name: 'snapshot', type: 'json' },
        { name: 'motivo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE INDEX idx_auditoria_pedidos_pedido ON auditoria_pedidos (pedido_id)',
        'CREATE INDEX idx_auditoria_pedidos_proposta ON auditoria_pedidos (proposta_id)',
        'CREATE INDEX idx_auditoria_pedidos_tipo ON auditoria_pedidos (tipo_evento)',
      ],
    })
    app.save(auditoria)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('auditoria_pedidos'))
    } catch (e) {}
    try {
      const propostas = app.findCollectionByNameOrId('propostas')
      if (propostas.fields.getByName('pedido_id')) propostas.fields.removeByName('pedido_id')
      app.save(propostas)
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('pedidos'))
    } catch (e) {}
  },
)
