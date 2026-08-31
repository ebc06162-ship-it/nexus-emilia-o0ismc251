migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const catalogo = new Collection({
      name: 'catalogo_itens',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule:
        '@request.auth.id != "" && (@request.data.review_status = "rascunho" || (@request.data.codigo != "" && @request.data.source_document != "" && @request.data.source_version != ""))',
      updateRule:
        '@request.auth.id != "" && (@request.data.review_status = "rascunho" || (@request.data.review_status = "conflito") || (@request.data.review_status = "inativo") || (@request.data.codigo != "" && @request.data.source_document != "" && @request.data.source_version != ""))',
      deleteRule: null,
      fields: [
        { name: 'codigo', type: 'text', required: false, max: 80 },
        {
          name: 'categoria',
          type: 'select',
          values: [
            'produto',
            'sabor',
            'papel',
            'cor_papel',
            'tecido',
            'fita',
            'largura_fita',
            'cor_fita',
            'modelo_laco',
            'acessorio',
            'caixinha',
            'modelo_sem_fita',
            'outro',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'nome', type: 'text', required: true, max: 160 },
        { name: 'tipo', type: 'text', required: false, max: 120 },
        { name: 'variante', type: 'text', required: false, max: 120 },
        { name: 'cor', type: 'text', required: false, max: 120 },
        { name: 'largura', type: 'text', required: false, max: 40 },
        { name: 'display_label', type: 'text', required: true, max: 300 },
        { name: 'source_document', type: 'text', required: false, max: 240 },
        { name: 'source_version', type: 'text', required: false, max: 80 },
        { name: 'source_locator', type: 'text', required: false, max: 500 },
        {
          name: 'review_status',
          type: 'select',
          values: ['rascunho', 'aprovado', 'conflito', 'inativo'],
          required: true,
          maxSelect: 1,
        },
        {
          name: 'reviewed_by',
          type: 'relation',
          required: false,
          collectionId: users.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'reviewed_at', type: 'date', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_catalogo_categoria ON catalogo_itens (categoria)',
        'CREATE UNIQUE INDEX idx_catalogo_codigo_unico ON catalogo_itens (codigo) WHERE codigo != ""',
        'CREATE INDEX idx_catalogo_status ON catalogo_itens (review_status)',
      ],
    })
    app.save(catalogo)

    const approved = new Record(catalogo, {
      codigo: 'PAP-CREP-ENC-001',
      categoria: 'papel',
      nome: 'Papel crepom encerado azul marinho',
      tipo: 'crepom encerado',
      cor: 'azul marinho',
      display_label: 'Papel crepom encerado azul marinho',
      source_document: 'CAT_LOGO_CLIENTE_-_PAPEL_E_FITA_2026.1.pdf',
      source_version: '2026.1',
      source_locator: 'Catálogo Emília 2026.1 · cores de papel',
      review_status: 'aprovado',
    })
    app.save(approved)

    const draft = new Record(catalogo, {
      codigo: '',
      categoria: 'fita',
      nome: 'Item de teste sem fonte',
      tipo: 'cetim',
      cor: 'amarelo canário',
      largura: 'nº02 (10 mm)',
      display_label: 'Item de teste sem fonte',
      source_document: '',
      source_version: '',
      source_locator: '',
      review_status: 'rascunho',
    })
    app.save(draft)

    console.log('Migration 0015 completed: versioned catalog with approved and draft fixtures')
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('catalogo_itens'))
    } catch (e) {}
    console.log('Migration 0015 rolled back: catalog records removed')
  },
)
