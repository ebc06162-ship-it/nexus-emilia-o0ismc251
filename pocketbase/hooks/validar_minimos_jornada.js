/// <reference path="../pb_data/types.d.ts" />
// F3-T004 (SPEC-3-002): validação dos mínimos por jornada no avanço de status.
// RN-3-101..104 e CA-3-010/011/012/013/014. Falta de mínimo = pendência nomeada + histórico,
// nunca avanço silencioso. Nenhuma jornada libera produção automaticamente.
routerAdd(
  'POST',
  '/backend/v1/oportunidades/{id}/avancar',
  (e) => {
    const auth = e.auth
    if (!auth || !auth.getString('ativo')) throw e.unauthorizedError('Sessão inválida.')
    const papel = auth.getString('papel')
    if (papel !== 'administrador' && papel !== 'gestao' && papel !== 'atendimento') {
      throw e.forbiddenError('Seu perfil não pode avançar jornadas.')
    }

    const id = e.request.pathValue('id')
    const oportunidade = $app.findRecordById('oportunidades', id)
    const tipo =
      oportunidade.getString('tipo_pedido') || oportunidade.getString('tipo_evento') || ''
    const body = e.requestInfo().body || {}
    const novoStatus = String(body.status || '').trim()
    if (!novoStatus) throw e.badRequestError('Informe o novo status.')

    // carregar configuração da jornada (fonte única de mínimos)
    // tipos de evento sociais/corporativos usam a configuração "evento" (RN-3-102)
    let jornadaKey = tipo
    if (
      tipo === 'aniversario' ||
      tipo === 'batizado' ||
      tipo === 'bodas' ||
      tipo === 'formatura' ||
      tipo === 'corporativo' ||
      tipo === 'cha_bebe' ||
      tipo === 'revelacao' ||
      tipo === 'presente' ||
      tipo === 'outros'
    ) {
      jornadaKey = 'evento'
    }
    let config = null
    try {
      config = $app.findFirstRecordByFilter('config_jornadas', 'jornada = {:j}', { j: jornadaKey })
    } catch (err) {
      config = null
    }
    if (!config || !config.getBool('ativo')) {
      // jornada sem configuração: segue o fluxo do núcleo (casamento etc.)
      oportunidade.set('status', novoStatus)
      $app.save(oportunidade)
      return e.json(200, { ok: true, jornada: tipo || 'nucleo', pendencias_criadas: 0 })
    }

    const campos = JSON.parse(config.getString('campos_obrigatorios') || '[]')
    const regras = JSON.parse(config.getString('regras') || '{}')

    // ---------- validar mínimos (CA-3-010) ----------
    const faltando = []
    for (const campo of campos) {
      const v = oportunidade.getString(campo)
      if (!v || !String(v).trim()) faltando.push(campo)
    }

    // ---------- regras específicas por jornada ----------
    const extras = []

    if (tipo === 'degustacao') {
      // RN-3-101: cortesia presencial/retirada; frete no envio; adicional cobrado no mesmo registro
      const modalidade = String(oportunidade.getString('modalidade_entrega') || '').toLowerCase()
      if (
        modalidade.includes('envi') ||
        modalidade.includes('sedex') ||
        modalidade.includes('motoboy') ||
        modalidade.includes('lalamove')
      ) {
        const frete = oportunidade.getInt('frete_valor')
        if (!frete || frete <= 0) {
          extras.push({
            campo: 'frete_valor',
            motivo: 'Degustação enviada exige valor de frete (RN-3-101); cotação pendente',
            proxima_acao: 'Cotar frete (Lalamove/Sedex) e registrar o valor',
          })
        }
      }
      // capacidade semanal sem limite definido: acompanhamento manual (parâmetro aprovado 14/09)
      if (!('capacidade_semanal' in regras) || regras.capacidade_semanal === null) {
        // sem limite configurado: não bloqueia
      }
      const adicional = oportunidade.getInt('qtd_adicional')
      if (adicional > 0) {
        // adicional cobrado no mesmo registro (decisão Champion 14/09) — a cobrança acompanha a própria degustação
      }
    }

    if (tipo === 'revendedor') {
      // RN-3-103: um pedido por data de entrega, sem duplicidade
      const datas = String(oportunidade.getString('datas_entrega') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (datas.length === 0) {
        extras.push({
          campo: 'datas_entrega',
          motivo: 'Revendedor exige ao menos uma data de entrega (RN-3-103)',
          proxima_acao: 'Definir as datas de entrega com o revendedor',
        })
      } else {
        const vistos = {}
        for (const d of datas) {
          if (vistos[d]) {
            extras.push({
              campo: 'datas_entrega',
              motivo: 'Data de entrega duplicada: ' + d + ' (RN-3-103: um pedido por data)',
              proxima_acao: 'Corrigir as datas de entrega antes de avançar',
            })
            break
          }
          vistos[d] = true
        }
        // preço vale pela data do pedido (snapshot); nova tabela só afeta pedidos novos
        if (!oportunidade.getString('data_pedido')) {
          extras.push({
            campo: 'data_pedido',
            motivo: 'Revendedor exige a data do pedido para fixar o preço da tabela vigente',
            proxima_acao: 'Registrar a data do pedido',
          })
        }
      }
      // vencimento por política não aprovado: conferência manual (parâmetro aprovado 14/09)
    }

    if (tipo === 'bem_nascido') {
      // RN-3-104: Previsão + aviso + confirmação; SLA não definido = manual + pendência
      const previsao = oportunidade.getString('data_estimada_parto')
      if (!previsao) {
        extras.push({
          campo: 'data_estimada_parto',
          motivo: 'Bem-nascido exige a previsão de parto (RN-3-104)',
          proxima_acao: 'Solicitar a data estimada do parto',
        })
      }
      if (!oportunidade.getString('aviso_enviado_em')) {
        extras.push({
          campo: 'aviso_enviado_em',
          motivo:
            'Aviso do bem-nascido ainda não registrado (SLA não definido: acompanhamento manual)',
          proxima_acao: 'Enviar/registar o aviso e a data de envio',
        })
      }
      if (!oportunidade.getString('confirmacao_recebida_em')) {
        extras.push({
          campo: 'confirmacao_recebida_em',
          motivo:
            'Confirmação do bem-nascido ainda não registrada (RN-3-104: Previsão + aviso + confirmação)',
          proxima_acao: 'Registrar a confirmação recebida da cliente',
        })
      }
      // produção NUNCA é liberada automaticamente (regra da SPEC)
    }

    // ---------- faltando + extras → pendências nomeadas + histórico (CA-3-014) ----------
    const pendenciasCriadas = []
    if (faltando.length > 0 || extras.length > 0) {
      var admin = null
      try {
        admin = $app.findFirstRecordByFilter(
          '_pb_users_auth_',
          'papel = "administrador" && ativo = true',
        )
      } catch (eAdmin) {
        admin = null
      }
      const responsavel = admin ? admin.id : auth.id
      const prazo = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

      for (const campo of faltando) {
        pendenciasCriadas.push({
          campo: campo,
          motivo: 'Campo obrigatório da jornada ' + tipo + ' ausente: ' + campo,
          proxima_acao: 'Completar ' + campo + ' com a cliente',
        })
      }
      for (const x of extras) {
        pendenciasCriadas.push(x)
      }

      oportunidade.set('status', 'aguardando_dados')
      $app.save(oportunidade)

      for (const p of pendenciasCriadas) {
        const pend = new Record($app.findCollectionByNameOrId('pendencias'))
        pend.set('oportunidade_id', oportunidade.id)
        pend.set('campo', p.campo)
        pend.set('valor_atual', '')
        pend.set('origem', 'jornada_' + tipo)
        pend.set('motivo', p.motivo)
        pend.set('responsavel', responsavel)
        pend.set('proxima_acao', p.proxima_acao)
        pend.set('prazo', prazo)
        pend.set('pending_type', 'campo_ausente')
        pend.set('status', 'aberta')
        $app.save(pend)

        const hist = new Record($app.findCollectionByNameOrId('historico_eventos'))
        hist.set('oportunidade_id', oportunidade.id)
        hist.set('descricao', 'Pendência registrada: ' + p.motivo)
        hist.set('tipo_evento', 'atualizacao')
        hist.set('autor', auth.id)
        hist.set('campo', p.campo)
        hist.set('origem', 'jornada_' + tipo)
        hist.set('valor_novo', '')
        $app.save(hist)
      }

      return e.json(200, {
        ok: false,
        jornada: tipo,
        status: 'aguardando_dados',
        pendencias_criadas: pendenciasCriadas.length,
        pendencias: pendenciasCriadas,
      })
    }

    // ---------- tudo presente: avança ----------
    oportunidade.set('status', novoStatus)
    $app.save(oportunidade)
    return e.json(200, { ok: true, jornada: tipo, status: novoStatus, pendencias_criadas: 0 })
  },
  $apis.requireAuth(),
)
