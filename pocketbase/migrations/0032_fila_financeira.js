migrate(
  (app) => {
    const auth = app.findCollectionByNameOrId('_pb_users_auth_')
    const pedidos = app.findCollectionByNameOrId('pedidos')

    const active =
      '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    const financialRoles =
      '(@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "financeiro")'
    const ownOrder = 'pedido_id.convertido_por = @request.auth.id'
    const financialRead = `${active} && (${financialRoles} || (@request.auth.papel = "atendimento" && ${ownOrder}))`
    const operationalWrite = `${active} && (${financialRoles} || (@request.auth.papel = "atendimento" && ${ownOrder}))`
    const pedidosFinancialRead = `${active} && (${financialRoles} || (@request.auth.papel = "atendimento" && convertido_por = @request.auth.id))`

    const planos = new Collection({
      name: 'planos_pagamento',
      type: 'base',
      listRule: financialRead,
      viewRule: financialRead,
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
        { name: 'versao', type: 'number', required: true, onlyInt: true, min: 1 },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'substituido', 'cancelado'],
          required: true,
          maxSelect: 1,
        },
        { name: 'total_previsto', type: 'number', required: true, min: 0 },
        { name: 'moeda', type: 'text', required: true },
        { name: 'condicoes_snapshot', type: 'json' },
        {
          name: 'criado_por',
          type: 'relation',
          required: true,
          collectionId: auth.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'motivo', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_planos_pedido_versao ON planos_pagamento (pedido_id, versao)',
        'CREATE INDEX idx_planos_pedido_status ON planos_pagamento (pedido_id, status)',
      ],
    })
    app.save(planos)

    const pagamentos = new Collection({
      name: 'pagamentos',
      type: 'base',
      listRule: financialRead,
      viewRule: financialRead,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'plano_id',
          type: 'relation',
          required: true,
          collectionId: planos.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'pedido_id',
          type: 'relation',
          required: true,
          collectionId: pedidos.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'versao_plano', type: 'number', required: true, onlyInt: true, min: 1 },
        { name: 'sequencia', type: 'number', required: true, onlyInt: true, min: 1 },
        {
          name: 'forma_pagamento',
          type: 'select',
          values: ['pix', 'cartao', 'transferencia', 'dinheiro', 'outro'],
          required: true,
          maxSelect: 1,
        },
        { name: 'valor_previsto', type: 'number', required: true, min: 0 },
        { name: 'valor_recebido', type: 'number', min: 0 },
        { name: 'vencimento', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          values: [
            'aguardando_pagamento',
            'comprovante_recebido',
            'em_conferencia',
            'conferido',
            'divergente',
            'cancelado',
          ],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'confirmado_por',
          type: 'relation',
          collectionId: auth.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'confirmado_em', type: 'date' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_pagamentos_plano_sequencia ON pagamentos (plano_id, sequencia)',
        'CREATE INDEX idx_pagamentos_pedido_status ON pagamentos (pedido_id, status)',
        'CREATE INDEX idx_pagamentos_vencimento ON pagamentos (vencimento)',
      ],
    })
    app.save(pagamentos)

    const comprovantes = new Collection({
      name: 'comprovantes_pagamento',
      type: 'base',
      listRule: financialRead,
      viewRule: financialRead,
      createRule: operationalWrite,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'pagamento_id',
          type: 'relation',
          required: true,
          collectionId: pagamentos.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'pedido_id',
          type: 'relation',
          required: true,
          collectionId: pedidos.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'versao', type: 'number', required: true, onlyInt: true, min: 1 },
        {
          name: 'arquivos',
          type: 'file',
          required: true,
          maxSelect: 3,
          maxSize: 10485760,
          mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
          protected: true,
        },
        {
          name: 'status',
          type: 'select',
          values: ['recebido', 'conferido', 'divergente', 'substituido'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'enviado_por',
          type: 'relation',
          required: true,
          collectionId: auth.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'enviado_em', type: 'date', required: true },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_comprovantes_pagamento_versao ON comprovantes_pagamento (pagamento_id, versao)',
        'CREATE INDEX idx_comprovantes_pedido ON comprovantes_pagamento (pedido_id)',
        'CREATE INDEX idx_comprovantes_status ON comprovantes_pagamento (status)',
      ],
    })
    app.save(comprovantes)
    comprovantes.fields.add(
      new RelationField({
        name: 'substitui_id',
        collectionId: comprovantes.id,
        cascadeDelete: false,
        maxSelect: 1,
      }),
    )
    app.save(comprovantes)

    const auditoria = new Collection({
      name: 'auditoria_financeira',
      type: 'base',
      listRule: `${active} && ${financialRoles}`,
      viewRule: `${active} && ${financialRoles}`,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'pagamento_id',
          type: 'relation',
          required: true,
          collectionId: pagamentos.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'pedido_id',
          type: 'relation',
          required: true,
          collectionId: pedidos.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'comprovante_id',
          type: 'relation',
          collectionId: comprovantes.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'tipo_evento',
          type: 'select',
          values: [
            'plano_criado',
            'plano_substituido',
            'comprovante_recebido',
            'comprovante_substituido',
            'conferencia',
            'divergencia',
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
        { name: 'versao_plano', type: 'number', onlyInt: true, min: 1 },
        { name: 'versao_comprovante', type: 'number', onlyInt: true, min: 1 },
        { name: 'resumo', type: 'text', required: true },
        { name: 'motivo', type: 'text' },
        { name: 'snapshot', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE INDEX idx_auditoria_financeira_pagamento ON auditoria_financeira (pagamento_id)',
        'CREATE INDEX idx_auditoria_financeira_pedido ON auditoria_financeira (pedido_id)',
        'CREATE INDEX idx_auditoria_financeira_tipo ON auditoria_financeira (tipo_evento)',
      ],
    })
    app.save(auditoria)

    const pedidosExistentes = app.findCollectionByNameOrId('pedidos')
    pedidosExistentes.listRule = pedidosFinancialRead
    pedidosExistentes.viewRule = pedidosFinancialRead
    app.save(pedidosExistentes)

    const auditoriaPedidos = app.findCollectionByNameOrId('auditoria_pedidos')
    auditoriaPedidos.listRule = `${active} && ${financialRoles}`
    auditoriaPedidos.viewRule = auditoriaPedidos.listRule
    app.save(auditoriaPedidos)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('auditoria_financeira'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('comprovantes_pagamento'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('pagamentos'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('planos_pagamento'))
    } catch (e) {}
  },
)
