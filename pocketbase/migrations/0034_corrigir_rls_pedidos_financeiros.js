migrate(
  (app) => {
    const active =
      '@request.auth.id != "" && @request.auth.ativo = true && @request.auth.papel != ""'
    const financial =
      '(@request.auth.papel = "administrador" || @request.auth.papel = "gestao" || @request.auth.papel = "financeiro")'
    const ownOrder = '@request.auth.papel = "atendimento" && convertido_por = @request.auth.id'
    const orders = app.findCollectionByNameOrId('pedidos')
    orders.listRule = `${active} && (${financial} || ${ownOrder})`
    orders.viewRule = orders.listRule
    app.save(orders)
  },
  (app) => {
    const orders = app.findCollectionByNameOrId('pedidos')
    orders.listRule = '@request.auth.id != ""'
    orders.viewRule = '@request.auth.id != ""'
    app.save(orders)
  },
)
