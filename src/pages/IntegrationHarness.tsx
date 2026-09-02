import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'

const fixtures = [
  ['FIX-1-401', 'Válida, novo event_id'],
  ['FIX-1-402', 'Duplicada, mesmo conteúdo'],
  ['FIX-1-403', 'Conflito, mesmo ID com conteúdo diferente'],
  ['FIX-1-404', 'Inválida, campo obrigatório ausente'],
  ['FIX-1-405', 'Timeout simulado'],
]
export default function IntegrationHarness() {
  const nav = useNavigate()
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const run = async (id) => {
    setRunning(true)
    try {
      const r = await pb.send('/backend/v1/integracao/harness-final', {
        method: 'POST',
        body: { fixture_id: id },
      })
      setResults((x) => [...x.filter((a) => a.fixture_id !== id), r])
    } catch (e) {
      setResults((x) => [...x, { fixture_id: id, result: 'erro', error: e.message }])
    } finally {
      setRunning(false)
    }
  }
  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <header className="bg-[#3D2314] text-white p-4">
        <div className="container mx-auto flex justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#DCC39E]">Nexus Emília</p>
            <h1 className="text-2xl font-semibold">Harness de integração</h1>
          </div>
          <Button variant="outline" className="text-white border-white" onClick={() => nav('/')}>
            Voltar
          </Button>
        </div>
      </header>
      <main className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Fixtures de homologação</CardTitle>
            <p className="text-sm text-gray-600">
              Somente teste_mode. Nenhuma conexão externa é ativada.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {fixtures.map(([id, label]) => (
              <div key={id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{id}</p>
                  <p className="text-sm text-gray-600">{label}</p>
                </div>
                <Button disabled={running} onClick={() => run(id)}>
                  Executar
                </Button>
              </div>
            ))}
            <div className="pt-4 space-y-2">
              {results.map((r) => (
                <div key={r.fixture_id + r.result} className="rounded border p-3">
                  <b>{r.fixture_id}</b>: {r.result}
                  {r.error && <p className="text-sm text-[#7A2E2E]">{r.error}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
