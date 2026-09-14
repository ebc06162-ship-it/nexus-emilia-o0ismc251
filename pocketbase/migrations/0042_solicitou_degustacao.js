// F3-T004 (ajuste pós-teste humano): degustação não é tipo de evento.
// A solicitação de degustação passa a ser um marcador da oportunidade, válido
// para qualquer tipo de evento (decisão da Champion em 14/09/2026).
migrate(
  (app) => {
    const oportunidades = app.findCollectionByNameOrId('oportunidades')
    if (!oportunidades.fields.getByName('solicitou_degustacao')) {
      oportunidades.fields.add(new BoolField({ name: 'solicitou_degustacao' }))
    }
    app.save(oportunidades)
    console.log('Migration 0042 completed: solicitou_degustacao em oportunidades')
  },
  (app) => {
    try {
      const oportunidades = app.findCollectionByNameOrId('oportunidades')
      const f = oportunidades.fields.getByName('solicitou_degustacao')
      if (f) oportunidades.fields.removeByName('solicitou_degustacao')
      app.save(oportunidades)
    } catch (e) {
      console.log('rollback 0042: ' + e.message)
    }
    console.log('Migration 0042 rollback: campo removido')
  },
)
