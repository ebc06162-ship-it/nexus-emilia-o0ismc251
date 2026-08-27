migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')
    const addClienteField = (field) => {
      if (!clientes.fields.getByName(field.name)) clientes.fields.add(field)
    }
    addClienteField(
      new SelectField({
        name: 'situacao',
        values: ['ativo', 'inativo'],
        required: false,
        maxSelect: 1,
      }),
    )
    addClienteField(
      new SelectField({
        name: 'natureza_cadastral',
        values: ['pessoa_fisica', 'pessoa_juridica'],
        required: false,
        maxSelect: 1,
      }),
    )
    addClienteField(
      new SelectField({
        name: 'classificacao_comercial',
        values: ['cliente_padrao', 'cerimonialista', 'revendedor', 'parceiro_comercial'],
        required: false,
        maxSelect: 1,
      }),
    )
    addClienteField(
      new SelectField({
        name: 'origem_cliente',
        values: [
          'instagram',
          'google',
          'tiktok',
          'indicacao',
          'cerimonialista',
          'parceiro_comercial',
          'ifood',
          'outro',
        ],
        maxSelect: 1,
      }),
    )
    addClienteField(
      new SelectField({
        name: 'categoria_indicacao',
        values: [
          'profissional_mercado',
          'outra_noiva_cliente',
          'parente',
          'amigo_conhecido',
          'outro',
          'nao_informado',
        ],
        maxSelect: 1,
      }),
    )
    addClienteField(new TextField({ name: 'referencia_origem' }))
    addClienteField(new TextField({ name: 'meta_whatsapp_id' }))
    addClienteField(new TextField({ name: 'instagram_handle' }))
    addClienteField(new TextField({ name: 'data_nascimento' }))
    const tipoAntigo = clientes.fields.getByName('tipo_cliente')
    if (tipoAntigo) tipoAntigo.required = false
    app.save(clientes)

    const antigos = app.findRecordsByFilter(
      clientes,
      'situacao = "" || natureza_cadastral = "" || classificacao_comercial = ""',
    )
    for (var i = 0; i < antigos.length; i++) {
      const r = antigos[i]
      if (!r.get('situacao')) r.set('situacao', 'ativo')
      if (!r.get('natureza_cadastral')) r.set('natureza_cadastral', 'pessoa_fisica')
      if (!r.get('classificacao_comercial')) r.set('classificacao_comercial', 'cliente_padrao')
      app.save(r)
    }
    const situacao = clientes.fields.getByName('situacao')
    const natureza = clientes.fields.getByName('natureza_cadastral')
    const classificacao = clientes.fields.getByName('classificacao_comercial')
    situacao.required = true
    natureza.required = true
    classificacao.required = true
    app.save(clientes)

    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    if (!oportunidades.fields.getByName('canal_pedido'))
      oportunidades.fields.add(
        new SelectField({
          name: 'canal_pedido',
          values: ['whatsapp', 'telefone', 'email', 'site', 'presencial', 'ifood', 'outro'],
          maxSelect: 1,
        }),
      )
    app.save(oportunidades)

    const pessoas = new Collection({
      name: 'pessoas',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone_principal', type: 'text', required: true },
        { name: 'telefone_secundario', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'cpf', type: 'text' },
        { name: 'data_nascimento', type: 'date' },
        { name: 'meta_whatsapp_id', type: 'text' },
        { name: 'instagram_handle', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pessoas_telefone ON pessoas (telefone_principal)',
        'CREATE INDEX idx_pessoas_instagram ON pessoas (instagram_handle)',
      ],
    })
    app.save(pessoas)

    const clientePessoa = new Collection({
      name: 'clientes_pessoas',
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
          collectionId: clientes.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'pessoa_id',
          type: 'relation',
          collectionId: pessoas.id,
          required: true,
          cascadeDelete: false,
          maxSelect: 1,
        },
        {
          name: 'papel',
          type: 'select',
          values: ['titular', 'contato', 'coordenador', 'funcionaria', 'indicador', 'outro'],
          required: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_cliente_pessoa_papel ON clientes_pessoas (cliente_id, pessoa_id, papel)',
      ],
    })
    app.save(clientePessoa)

    const locais = new Collection({
      name: 'locais_entrega',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        { name: 'nome_local', type: 'text', required: true },
        { name: 'cep', type: 'text' },
        { name: 'logradouro', type: 'text' },
        { name: 'numero', type: 'text' },
        { name: 'complemento', type: 'text' },
        { name: 'bairro', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'uf', type: 'text' },
        { name: 'referencia', type: 'text' },
        { name: 'place_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_locais_entrega_nome ON locais_entrega (nome_local)',
        'CREATE INDEX idx_locais_entrega_place ON locais_entrega (place_id)',
      ],
    })
    app.save(locais)

    const enderecos = new Collection({
      name: 'enderecos_pessoas',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        {
          name: 'pessoa_id',
          type: 'relation',
          collectionId: pessoas.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_endereco',
          type: 'select',
          values: ['residencial', 'comercial'],
          required: true,
          maxSelect: 1,
        },
        { name: 'nome_local_empresa', type: 'text' },
        { name: 'cep', type: 'text' },
        { name: 'logradouro', type: 'text' },
        { name: 'numero', type: 'text' },
        { name: 'complemento', type: 'text' },
        { name: 'bairro', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'uf', type: 'text' },
        { name: 'referencia', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_enderecos_pessoas_pessoa ON enderecos_pessoas (pessoa_id)'],
    })
    app.save(enderecos)

    const entregas = new Collection({
      name: 'enderecos_entrega',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        {
          name: 'pessoa_id',
          type: 'relation',
          collectionId: pessoas.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'local_id',
          type: 'relation',
          collectionId: locais.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'identificacao', type: 'text', required: true },
        { name: 'cep', type: 'text' },
        { name: 'logradouro', type: 'text' },
        { name: 'numero', type: 'text' },
        { name: 'complemento', type: 'text' },
        { name: 'bairro', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'uf', type: 'text' },
        { name: 'referencia', type: 'text' },
        { name: 'usar_endereco_cadastral', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_enderecos_entrega_pessoa ON enderecos_entrega (pessoa_id)',
        'CREATE INDEX idx_enderecos_entrega_local ON enderecos_entrega (local_id)',
      ],
    })
    app.save(entregas)
    console.log(
      'Migration 0009 completed: people, progressive origins, addresses and order channel',
    )
  },
  (app) => {
    console.log('Migration 0009 rollback preserves existing records')
  },
)
