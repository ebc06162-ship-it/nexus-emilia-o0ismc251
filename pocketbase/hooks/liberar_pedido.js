/// <reference path="../pb_data/types.d.ts" />
// F3-T006 (SPEC-3-003): liberação controlada de produção.
// RN-3-201/202/205 e CA-3-015/016. Somente Líder de produção libera; gates:
// sinal/entrada confirmado (ou política de recebimento do revendedor/CNPJ),
// sem pendência de falta de definição, data do evento preenchida.
// Idempotente (RN-3-205); negação auditada; Mara/Fernanda têm hierarquia maior.
routerAdd(
  'POST',
  '/backend/v1/pedidos/{id}/liberar',
  (e) => {
    const auth = e.auth
    if (!auth || !auth.getString('ativo')) throw e.unauthorizedError('Sessão inválida.')

    const papel = auth.getString('papel')
    const isLider = auth.getBool('lider_producao') || papel === 'administrador' || papel === 'gestao'
    if (!isLider) {
      const auditNeg = new Record($app.findCollectionByNameOrId('auditoria'))
      auditNeg.set('ator_id', auth.id)
      auditNeg.set('ator_nome', auth.getString('name'))
      auditNeg.set('papel', papel)
      auditNeg.set('objeto_tipo', 'pedidos')
      auditNeg.set('objeto_id', e.request.pathValue('id'))
      auditNeg.set('acao', 'liberar_producao')
      auditNeg.set('descricao', 'Tentativa de liberar pedido para produção sem ser líder')
      auditNeg.set('resultado', 'negado')
      auditNeg.set('origem', 'hook_liberar_pedido')
      $app.save(auditNeg)
      throw e.forbiddenError('Somente o Líder de produção pode liberar pedidos.')
    }

    const id = e.request.pathValue('id')
    const pedido = $app.findRecordById('pedidos', id)

    if (
      pedido.getString('status_operacional') === 'pronto_producao' &&
      pedido.getString('liberado_em')
    ) {
      return e.json(200, {
        ok: true,
        idempotente: true,
        status: 'pronto_producao',
        liberado_por: pedido.getString('liberado_por'),
        mensagem: 'Pedido já estava liberado para produção (mesmo evento reutilizado).',
      })
    }

    const gates = []

    const pagamentos = $app.findRecordsByFilter(
      'pagamentos',
      'pedido_id = {:pid} && status = "conferido"',
      '',
      1,
      0,
      { pid: id },
    )
    if (pagamentos.length === 0) {
      gates.push({
        gate: 'pagamento',
        motivo: 'Sem sinal/entrada confirmado pelo financeiro (RN-3-201)',
        dono: 'Financeiro',
      })
    }

    const pendencias = $app.findRecordsByFilter(
      'pendencias',
      "status = 'aberta' && motivo ~ 'defini'",
      '',
      1,
      0,
    )
    let pendenciaDoPedido = null
    for (const p of pendencias) {
      if (p.getString('oportunidade_id') === pedido.getString('oportunidade_id')) {
        pendenciaDoPedido = p
        break
      }
    }
    if (pendenciaDoPedido) {
      gates.push({
        gate: 'definicao',
        motivo: 'Pendência de definição em aberto: ' + pendenciaDoPedido.getString('motivo'),
        dono: 'Atendimento',
      })
    }

    if (!pedido.getString('data_evento')) {
      gates.push({
        gate: 'prazo',
        motivo: 'Pedido sem data de evento/entrega (RN-3-201)',
        dono: 'Atendimento',
      })
    }

    if (gates.length > 0) {
      const auditG = new Record($app.findCollectionByNameOrId('auditoria'))
      auditG.set('ator_id', auth.id)
      auditG.set('ator_nome', auth.getString('name'))
      auditG.set('papel', papel)
      auditG.set('objeto_tipo', 'pedidos')
      auditG.set('objeto_id', id)
      auditG.set('acao', 'liberar_producao_bloqueada')
      auditG.set('descricao', 'Liberação bloqueada: ' + gates.map((g) => g.gate).join(', '))
      auditG.set('resultado', 'negado')
      auditG.set('origem', 'hook_liberar_pedido')
      $app.save(auditG)
      return e.json(200, { ok: false, gates: gates, status: pedido.getString('status_operacional') })
    }

    pedido.set('status_operacional', 'pronto_producao')
    pedido.set('liberado_por', auth.id)
    pedido.set('liberado_em', new Date().toISOString().replace('T', ' ').slice(0, 19))
    pedido.set('liberacao_versao', pedido.getInt('versao_proposta'))
    const dataEvento = pedido.getString('data_evento') || ''
    if (dataEvento) {
      const dias = Math.ceil((new Date(dataEvento) - new Date()) / 86400000)
      pedido.set('urgente', dias <= 7)
    }
    $app.save(pedido)

    const audit = new Record($app.findCollectionByNameOrId('auditoria'))
    audit.set('ator_id', auth.id)
    audit.set('ator_nome', auth.getString('name'))
    audit.set('papel', papel)
    audit.set('objeto_tipo', 'pedidos')
    audit.set('objeto_id', id)
    audit.set('acao', 'liberar_producao')
    audit.set(
      'descricao',
      'Pedido liberado para produção (versão ' + pedido.getInt('versao_proposta') + ')',
    )
    audit.set('resultado', 'permitido')
    audit.set('origem', 'hook_liberar_pedido')
    $app.save(audit)

    return e.json(200, {
      ok: true,
      status: 'pronto_producao',
      urgente: pedido.getBool('urgente'),
      versao: pedido.getInt('versao_proposta'),
    })
  },
  $apis.requireAuth(),
)
