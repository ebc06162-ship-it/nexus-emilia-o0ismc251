migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    const eventos = new Collection({
      name: 'integration_events',
      type: 'base',
      listRule: '@request.auth.id != "" && @request.auth.papel = "administrador"',
      viewRule: '@request.auth.id != "" && @request.auth.papel = "administrador"',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'event_id', type: 'text', required: true, max: 120 },
        { name: 'payload_hash', type: 'text', required: true, max: 128 },
        { name: 'event_type', type: 'text', required: true, max: 120 },
        { name: 'payload_version', type: 'text', required: true, max: 20 },
        { name: 'source_system', type: 'text', required: true, max: 60 },
        { name: 'external_record_id', type: 'text', required: false, max: 120 },
        { name: 'source_ref', type: 'text', required: false, max: 160 },
        {
          name: 'status',
          type: 'select',
          values: [
            'processed',
            'duplicate',
            'integration_conflict',
            'rejected',
            'manual_reconciliation',
          ],
          required: true,
          maxSelect: 1,
        },
        { name: 'error_code', type: 'text', required: false, max: 80 },
        { name: 'last_confirmed_state', type: 'text', required: false, max: 120 },
        {
          name: 'responsible',
          type: 'relation',
          collectionId: users.id,
          required: false,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'next_action', type: 'text', required: false, max: 240 },
        { name: 'trace_id', type: 'text', required: true, max: 120 },
        { name: 'test_mode', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_integration_event_id ON integration_events (event_id)',
        'CREATE INDEX idx_integration_status ON integration_events (status)',
        'CREATE INDEX idx_integration_source_ref ON integration_events (source_ref)',
      ],
    })
    app.save(eventos)

    const fila = new Collection({
      name: 'integration_fallbacks',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: null,
      fields: [
        { name: 'event_id', type: 'text', required: true, max: 120 },
        { name: 'source_ref', type: 'text', required: true, max: 160 },
        { name: 'error_code', type: 'text', required: true, max: 80 },
        { name: 'last_confirmed_state', type: 'text', required: true, max: 120 },
        {
          name: 'responsible',
          type: 'relation',
          collectionId: users.id,
          required: true,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'next_action', type: 'text', required: true, max: 240 },
        {
          name: 'status',
          type: 'select',
          values: ['aberta', 'reconciliada'],
          required: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_fallback_event ON integration_fallbacks (event_id)',
        'CREATE INDEX idx_fallback_status ON integration_fallbacks (status)',
      ],
    })
    app.save(fila)
    console.log('Migration 0028 completed: integration events and reconciliable fallback queue')
  },
  (app) => {
    console.log('Migration 0028 down preserves integration evidence')
  },
)
