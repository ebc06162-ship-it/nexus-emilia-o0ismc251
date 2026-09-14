// F3-T001 (SPEC-3-001): suíte de invariantes estáticas — substitui o teste-placeholder.
// CA-3-001/003/007 no código. Roda com `node tests/invariantes.test.mjs`.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const raiz = process.cwd()
let falhas = 0
const ok = (nome) => console.log('  PASS ' + nome)
const falha = (nome, detalhe) => {
  console.error('  FAIL ' + nome + (detalhe ? ' — ' + detalhe : ''))
  falhas++
}
const teste = (nome, fn) => {
  try {
    const r = fn()
    if (r === false) falha(nome)
    else ok(nome)
  } catch (e) {
    falha(nome, e.message)
  }
}

console.log('Suíte de invariantes estáticas — F3-T001 (SPEC-3-001)')

// ---------- CA-3-001: ordinais únicos ----------
const dirMigrations = join(raiz, 'pocketbase', 'migrations')
const arquivos = readdirSync(dirMigrations).filter((f) => f.endsWith('.js'))
const ordinais = arquivos.map((f) => f.slice(0, 4))
const duplicados = ordinais.filter((o, i) => ordinais.indexOf(o) !== i)

teste('CA-3-001a: nenhum ordinal de migration duplicado', () => {
  if (duplicados.length > 0) throw new Error('ordinais duplicados: ' + duplicados.join(', '))
})
teste('CA-3-001b: migrations 0037-0039 existem', () => {
  for (const n of ['0037', '0038', '0039']) {
    if (!arquivos.some((f) => f.startsWith(n))) throw new Error('faltando ' + n)
  }
})
teste('CA-3-001c: ordinais são sequenciais e crescentes', () => {
  const unicos = [...new Set(ordinais)].sort()
  const inicio = parseInt(unicos[0], 10)
  unicos.forEach((o, i) => {
    if (parseInt(o, 10) !== inicio + i) throw new Error('sequência quebrada em ' + o)
  })
})

// ---------- CA-3-003: nenhuma senha literal no estado atual ----------
const senhaLiteral = /Emilia@2026/
const migrationsComSenha = arquivos
  .map((f) => {
    const linhas = readFileSync(join(dirMigrations, f), 'utf8')
      .split('\n')
      .filter((l) => senhaLiteral.test(l) && !l.trim().startsWith('//'))
    return linhas.length > 0 ? f : null
  })
  .filter(Boolean)
teste('CA-3-003a: nenhuma migration contém a senha literal em código executável', () => {
  if (migrationsComSenha.length > 0) throw new Error('com senha: ' + migrationsComSenha.join(', '))
})
const hooksDir = join(raiz, 'pocketbase', 'hooks')
const hooks = existsSync(hooksDir) ? readdirSync(hooksDir).filter((f) => f.endsWith('.js')) : []
const hooksComSenha = hooks.filter((f) => senhaLiteral.test(readFileSync(join(hooksDir, f), 'utf8')))
teste('CA-3-003b: nenhum hook contém a senha literal', () => {
  if (hooksComSenha.length > 0) throw new Error('com senha: ' + hooksComSenha.join(', '))
})
teste('CA-3-003c: migração 0039 referencia os cinco secrets por nome', () => {
  const conteudo = readFileSync(join(dirMigrations, '0039_credenciais_por_secrets.js'), 'utf8')
  for (const s of [
    'EMILIA_FERNANDA_PASSWORD',
    'EMILIA_MARA_PASSWORD',
    'EMILIA_ANIE_PASSWORD',
    'EMILIA_FINANCEIRO_PASSWORD',
    'EMILIA_PRODUCAO_PASSWORD',
  ]) {
    if (!conteudo.includes(s)) throw new Error('secret ausente: ' + s)
  }
})
teste('CA-3-003d: 0039 nunca loga o valor do secret', () => {
  const conteudo = readFileSync(join(dirMigrations, '0039_credenciais_por_secrets.js'), 'utf8')
  // a variável que carrega o valor (valorSecret) só pode aparecer em getenv/setPassword/comparação
  for (const linha of conteudo.split('\n')) {
    if (linha.includes('valorSecret') && !/getenv|setPassword|!== ''|if \(/.test(linha)) {
      throw new Error('uso inesperado do valor: ' + linha.trim())
    }
  }
})

// ---------- CA-3-002/004: RLS fail-closed ----------
teste('CA-3-002a: updateRule de users não permite self-update no caminho de execução', () => {
  const m38 = readFileSync(join(dirMigrations, '0038_rls_users_fail_closed.js'), 'utf8')
  const up = m38.split('(app) => {')[1].split('(app) => {')[0] // corpo do up (antes do down)
  if (/id = @request\.auth\.id/.test(up)) throw new Error('self-update presente no up da 0038')
})
teste('CA-3-002b: 0038 exige papel administrador/gestao e conta ativa', () => {
  const m38 = readFileSync(join(dirMigrations, '0038_rls_users_fail_closed.js'), 'utf8')
  if (!m38.includes('papel = "administrador"') || !m38.includes('ativo = true'))
    throw new Error('guardas ausentes')
})
teste('CA-3-004a: hook de revogação existe', () => {
  if (!existsSync(join(hooksDir, 'revogar_usuario.js'))) throw new Error('hook ausente')
})
teste('CA-3-004b: hook de cancelamento existe e é idempotente', () => {
  const conteudo = readFileSync(join(hooksDir, 'cancelar_pedido.js'), 'utf8')
  if (!conteudo.includes("status_comercial') === 'cancelado'")) throw new Error('idempotência ausente')
  if (!conteudo.includes('retencao_percentual')) throw new Error('retenção ausente')
})

// ---------- RN-3-003/004: política de cancelamento ----------
teste('RN-3-003: <=100 unidades e >=7 dias = reembolso integral (retencao 0)', () => {
  const conteudo = readFileSync(join(hooksDir, 'cancelar_pedido.js'), 'utf8')
  if (!conteudo.includes('quantidade <= 100 && dias >= 7')) throw new Error('condição ausente')
  if (!conteudo.includes('retencao = 0')) throw new Error('reembolso integral ausente')
})
teste('RN-3-004: fora da janela exige Administrador e retencao 20%', () => {
  const conteudo = readFileSync(join(hooksDir, 'cancelar_pedido.js'), 'utf8')
  if (!conteudo.includes("papel !== 'administrador'")) throw new Error('alçada ausente')
  if (!conteudo.includes('retencao = 20')) throw new Error('retenção 20% ausente')
})
teste('RN-3-003: dados ausentes recusam cancelamento (fail-closed)', () => {
  const conteudo = readFileSync(join(hooksDir, 'cancelar_pedido.js'), 'utf8')
  if (!conteudo.includes('Cancelamento recusado')) throw new Error('recusa ausente')
})

// ---------- CA-3-007: sem testes-placeholder ----------
const pkg = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'))
teste('CA-3-007a: pnpm test não é placeholder', () => {
  const t = pkg.scripts.test || ''
  if (t.includes('there are no tests')) throw new Error('placeholder ainda presente')
  if (!t.includes('tests/')) throw new Error('script test não aponta para a suíte')
})
teste('CA-3-007b: diretório tests existe com a suíte', () => {
  if (!existsSync(join(raiz, 'tests', 'invariantes.test.mjs'))) throw new Error('suíte ausente')
})

// ---------- .env não versionado ----------
teste('SEG: .env não está versionado no Git', () => {
  const gitignore = readFileSync(join(raiz, '.gitignore'), 'utf8')
  if (!/^\.env\*?$/m.test(gitignore) && !/\.env\*/.test(gitignore))
    throw new Error('.gitignore não cobre .env')
})

// ---------- Resumo ----------
console.log('')
if (falhas > 0) {
  console.error(falhas + ' invariante(s) FALHARAM')
  process.exit(1)
} else {
  console.log('Todas as invariantes passaram.')
}

// ===================== F3-T004 (SPEC-3-002) — jornadas especiais =====================
console.log('\nF3-T004 (SPEC-3-002) — jornadas especiais')

const lerArquivo = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '')

// CA-3-009: quatro jornadas reutilizam o registro canônico (mesma coleção oportunidades)
const migConfig = lerArquivo(join(dirMigrations, '0041_config_jornadas_especiais.js'))
teste('CA-3-009: config de jornadas referencia oportunidades/pedidos (sem cadastro paralelo)', () => {
  if (!migConfig) throw new Error('0041_config_jornadas_especiais.js ausente')
  if (!/oportunidades/.test(migConfig)) throw new Error('config não referencia oportunidades')
})

// CA-3-010: campos aplicáveis por tipo (matriz de campos)
teste('CA-3-010: matriz de campos por jornada definida na configuração', () => {
  if (!migConfig) throw new Error('0041 ausente')
  for (const t of ['degustacao', 'revendedor', 'bem_nascido']) {
    if (!migConfig.includes("'" + t + "'")) throw new Error('jornada ausente: ' + t)
  }
  if (!/campos_obrigatorios/.test(migConfig)) throw new Error('matriz de campos ausente')
})

// CA-3-011: degustação cortesia + bloqueio de frete/capacidade indefinidos
teste('CA-3-011: degustação preserva cortesia e bloqueia frete/capacidade indefinidos', () => {
  if (!/cortesia/.test(migConfig)) throw new Error('cortesia não registrada na config')
  const hook = lerArquivo(join(hooksDir, 'validar_minimos_jornada.js'))
  if (!hook) throw new Error('hook validar_minimos_jornada.js ausente')
  if (!/frete/.test(hook) || !/capacidade/.test(hook)) {
    throw new Error('hook não valida frete/capacidade')
  }
})

// CA-3-012: revendedor — um pedido por data, sem duplicidade
teste('CA-3-012: revendedor valida duplicidade de data de entrega', () => {
  const hook = lerArquivo(join(hooksDir, 'validar_minimos_jornada.js'))
  if (!hook) throw new Error('hook ausente')
  if (!/datas_entrega/.test(hook)) throw new Error('hook não valida datas_entrega')
  if (!/duplic/i.test(hook)) throw new Error('hook não valida duplicidade')
})

// CA-3-013: bem-nascido — Previsão + aviso + confirmação, sem produção automática
teste('CA-3-013: bem-nascido registra aviso/confirmacao e nunca libera produção', () => {
  const hook = lerArquivo(join(hooksDir, 'validar_minimos_jornada.js'))
  if (!hook) throw new Error('hook ausente')
  for (const c of ['data_estimada_parto', 'aviso', 'confirmacao']) {
    if (!hook.includes(c)) throw new Error('bem-nascido sem ' + c)
  }
  if (/producao_automatica\s*[:=]\s*true/.test(hook)) throw new Error('produção automática detectada')
})

// CA-3-014: campo/regra ausente cria pendência nomeada + histórico
teste('CA-3-014: mínimo ausente gera pendência nomeada (nunca silencioso)', () => {
  const hook = lerArquivo(join(hooksDir, 'validar_minimos_jornada.js'))
  if (!hook) throw new Error('hook ausente')
  if (!/pendencias/.test(hook)) throw new Error('hook não cria pendência')
  if (!/historico_eventos/.test(hook)) throw new Error('hook não registra histórico')
})

// CA-3-031: somente Administrador/Gestão configura; negação auditada
teste('CA-3-031: config de jornadas é admin/gestão e negação é auditada', () => {
  if (!migConfig) throw new Error('0041 ausente')
  if (!/administrador/.test(migConfig) || !/gestao/.test(migConfig)) {
    throw new Error('RLS de config não restrita a admin/gestão')
  }
  if (!/deleteRule:\s*null/.test(migConfig)) throw new Error('deleteRule deve ser null (fail-closed)')
  const hook = lerArquivo(join(hooksDir, 'auditar_negacoes.js'))
  if (!hook.includes('config_jornadas')) throw new Error('negação de config não auditada')
})
