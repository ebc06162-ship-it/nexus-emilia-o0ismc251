migrate(
  (app) => {
    // Atualiza o cadastro de clientes conforme a revisão aprovada.
    const clientes = app.findCollectionByNameOrId('clientes')
    const telefone = clientes.fields.getByName('telefone_principal')
    telefone.required = true
    const tipoCliente = clientes.fields.getByName('tipo_cliente')
    tipoCliente.values = [
      'casamento_noiva',
      'eventos_sociais',
      'maternidade',
      'corporativo',
      'cerimonialista',
      'revenda_parceiros',
      'presentes',
      'consumo_proprio',
      'outros',
    ]
    clientes.fields.removeByName('nome_noivos')
    app.save(clientes)

    // Estados iniciais: Novo, Diagnosticando e Aguardando dados.
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const status = oportunidades.fields.getByName('status')
    status.values = ['novo', 'diagnosticando', 'aguardando_dados']
    oportunidades.fields.add(
      new SelectField({
        name: 'origem_tipo',
        values: ['direto', 'cerimonialista', 'grupo_parceiro'],
        maxSelect: 1,
      }),
    )
    oportunidades.fields.add(new TextField({ name: 'tipo_evento', max: 100 }))
    oportunidades.fields.add(new TextField({ name: 'descricao_outro_evento' }))
    oportunidades.fields.add(
      new RelationField({
        name: 'cerimonialista_id',
        collectionId: 'cerimonialistas',
        maxSelect: 1,
      }),
    )
    oportunidades.fields.add(
      new RelationField({
        name: 'contato_cerimonialista_id',
        collectionId: 'contatos_cerimonialistas',
        maxSelect: 1,
      }),
    )
    oportunidades.fields.add(
      new RelationField({
        name: 'grupo_parceiro_id',
        collectionId: 'grupos_parceiros',
        maxSelect: 1,
      }),
    )
    oportunidades.fields.add(
      new RelationField({
        name: 'empresa_parceiro_id',
        collectionId: 'empresas_parceiros',
        maxSelect: 1,
      }),
    )
    oportunidades.fields.add(
      new RelationField({
        name: 'unidade_parceiro_id',
        collectionId: 'unidades_parceiros',
        maxSelect: 1,
      }),
    )
    oportunidades.fields.add(
      new RelationField({
        name: 'contato_parceiro_id',
        collectionId: 'contatos_parceiros',
        maxSelect: 1,
      }),
    )
    app.save(oportunidades)

    const baseRules = {
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
    }

    const cerimonialistas = new Collection({
      name: 'cerimonialistas',
      type: 'base',
      ...baseRules,
      fields: [
        { name: 'nome_empresa', type: 'text', required: true },
        { name: 'endereco', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cerimonialistas_empresa ON cerimonialistas (nome_empresa)'],
    })
    app.save(cerimonialistas)

    const contatosCerimonialistas = new Collection({
      name: 'contatos_cerimonialistas',
      type: 'base',
      ...baseRules,
      fields: [
        {
          name: 'cerimonialista_id',
          type: 'relation',
          collectionId: cerimonialistas.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contatos_cerimonialista ON contatos_cerimonialistas (cerimonialista_id)',
      ],
    })
    app.save(contatosCerimonialistas)

    const grupos = new Collection({
      name: 'grupos_parceiros',
      type: 'base',
      ...baseRules,
      fields: [
        { name: 'nome_grupo', type: 'text', required: true },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_grupos_parceiros_nome ON grupos_parceiros (nome_grupo)'],
    })
    app.save(grupos)

    const empresas = new Collection({
      name: 'empresas_parceiros',
      type: 'base',
      ...baseRules,
      fields: [
        {
          name: 'grupo_parceiro_id',
          type: 'relation',
          collectionId: grupos.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'razao_social', type: 'text', required: true },
        { name: 'nome_fantasia', type: 'text' },
        { name: 'cnpj', type: 'text', required: true },
        { name: 'inscricao_estadual', type: 'text' },
        { name: 'inscricao_estadual_isenta', type: 'bool' },
        { name: 'inscricao_municipal', type: 'text' },
        { name: 'inscricao_suframa', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_empresas_parceiros_grupo ON empresas_parceiros (grupo_parceiro_id)',
        'CREATE INDEX idx_empresas_parceiros_cnpj ON empresas_parceiros (cnpj)',
      ],
    })
    app.save(empresas)

    const contatosParceiros = new Collection({
      name: 'contatos_parceiros',
      type: 'base',
      ...baseRules,
      fields: [
        {
          name: 'grupo_parceiro_id',
          type: 'relation',
          collectionId: grupos.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true },
        { name: 'telefone', type: 'text', required: true },
        { name: 'email', type: 'email' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_contatos_parceiros_grupo ON contatos_parceiros (grupo_parceiro_id)',
      ],
    })
    app.save(contatosParceiros)

    const unidades = new Collection({
      name: 'unidades_parceiros',
      type: 'base',
      ...baseRules,
      fields: [
        {
          name: 'empresa_parceiro_id',
          type: 'relation',
          collectionId: empresas.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'nome_unidade', type: 'text', required: true },
        { name: 'endereco', type: 'text', required: true },
        { name: 'complemento', type: 'text' },
        { name: 'bairro', type: 'text' },
        { name: 'cep', type: 'text' },
        { name: 'cidade', type: 'text' },
        { name: 'cnpj_unidade', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_unidades_parceiros_empresa ON unidades_parceiros (empresa_parceiro_id)',
      ],
    })
    app.save(unidades)

    const contatoUnidade = new Collection({
      name: 'contatos_unidades_parceiros',
      type: 'base',
      ...baseRules,
      fields: [
        {
          name: 'contato_parceiro_id',
          type: 'relation',
          collectionId: contatosParceiros.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'unidade_parceiro_id',
          type: 'relation',
          collectionId: unidades.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_contatos_unidades_unico ON contatos_unidades_parceiros (contato_parceiro_id, unidade_parceiro_id)',
      ],
    })
    app.save(contatoUnidade)

    const eventos = new Collection({
      name: 'eventos',
      type: 'base',
      ...baseRules,
      fields: [
        {
          name: 'oportunidade_id',
          type: 'relation',
          collectionId: oportunidades.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_evento',
          type: 'select',
          values: [
            'casamento',
            'aniversario',
            'cha_bebe',
            'revelacao',
            'bodas',
            'batizado',
            'outro',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'nome_noivos', type: 'text' },
        { name: 'nome_aniversariante', type: 'text' },
        { name: 'nome_casal', type: 'text' },
        { name: 'nome_bebe', type: 'text' },
        { name: 'descricao_outro', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_eventos_oportunidade ON eventos (oportunidade_id)'],
    })
    app.save(eventos)

    console.log('Migration 0002 completed: revised customer model, partners, groups and event data')
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('eventos'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('contatos_unidades_parceiros'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('unidades_parceiros'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('contatos_parceiros'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('empresas_parceiros'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('grupos_parceiros'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('contatos_cerimonialistas'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('cerimonialistas'))
    } catch (e) {}
  },
)
