import {useEffect, useState} from 'react'
import api from '@/services/api'

interface Charge {
  id: string
  studentName: string
  amount: number
  dueDate: string
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED' | 'LOST' | 'DISPUTED'
  paymentDate: string | null
  pixCode: string | null
  boletoUrl: string | null
  checkoutUrl: string | null
  createdAt: string
}

interface Enrollment {
  id: string
  studentName: string
  className: string
  planName: string
  amount: number
  active: boolean
}

interface DashboardData {
  expectedRevenue: number
  receivedRevenue: number
  overdueRevenue: number
  totalActiveStudents: number
  totalPendingCharges: number
  totalPaidCharges: number
  totalOverdueCharges: number
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendente',    color: '#d97706' },
  PAID:      { label: 'Pago',        color: '#059669' },
  OVERDUE:   { label: 'Atrasado',    color: '#dc2626' },
  CANCELLED: { label: 'Cancelado',   color: '#6b7280' },
  REFUNDED:  { label: 'Reembolsado', color: '#2563eb' },
  LOST:      { label: 'Perdido',     color: '#6b7280' },
  DISPUTED:  { label: 'Disputado',   color: '#ea580c' },
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// Modal para criar cobrança manual — POST /api/charges { enrollmentId, dueDate }
function NewChargeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [form, setForm] = useState({ enrollmentId: '', dueDate: todayStr() })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Enrollment[]>('/enrollments')
        .then(r => setEnrollments(r.data.filter(e => e.active)))
        .catch(console.error)
        .finally(() => setLoadingData(false))
  }, [])

  async function submit() {
    if (!form.enrollmentId) { setError('Selecione uma matrícula'); return }
    if (!form.dueDate) { setError('Informe a data de vencimento'); return }
    setSaving(true); setError('')
    try {
      // POST /api/charges  body: ChargeRequestDTO { enrollmentId, dueDate }
      await api.post('/charges', form)
      onCreated(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao criar cobrança')
    } finally { setSaving(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Nova cobrança</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Crie uma cobrança avulsa para uma matrícula ativa.</p>

          {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>
          )}

          {loadingData ? (
              <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Carregando matrículas...</p>
          ) : (
              <>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Matrícula *</label>
                  <select
                      value={form.enrollmentId}
                      onChange={e => setForm(f => ({ ...f, enrollmentId: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }}
                  >
                    <option value="">Selecione uma matrícula...</option>
                    {enrollments.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.studentName} — {e.className} ({fmt(e.amount)})
                        </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Data de vencimento *</label>
                  <input
                      type="date"
                      value={form.dueDate}
                      min={todayStr()}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Cancelar</button>
            <button onClick={submit} disabled={saving || loadingData}
                    style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Criando...' : 'Criar cobrança'}
            </button>
          </div>
        </div>
      </div>
  )
}

type Tab = 'Todos' | 'Inadimplentes' | 'Pagos'

export default function ChargesPage() {
  const [charges, setCharges] = useState<Charge[]>([])
  const [dash, setDash] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Todos')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [generatingCharges, setGeneratingCharges] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function load() {
    setLoading(true)
    Promise.all([
      api.get<Charge[]>('/charges'),
      api.get<DashboardData>('/dashboard'),
    ])
        .then(([c, d]) => { setCharges(c.data); setDash(d.data) })
        .catch(console.error)
        .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function markPaid(id: string) {
    setUpdatingId(id)
    try {
      // PATCH /api/charges/{id}/status  body: { status: "PAID" }
      await api.patch(`/charges/${id}/status`, { status: 'PAID' })
      load()
    } finally { setUpdatingId(null) }
  }

  async function markCancelled(id: string) {
    setUpdatingId(id)
    try {
      await api.patch(`/charges/${id}/status`, { status: 'CANCELLED' })
      load()
    } finally { setUpdatingId(null) }
  }

  async function generateCharges(force: boolean) {
    setGeneratingCharges(true)
    try {
      await api.post(`/charges/generate-charges?force=${force}`)
      load()
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro ao gerar cobranças')
    } finally { setGeneratingCharges(false) }
  }

  function copyPix(id: string, code: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = charges.filter((c) => {
    const tabOk =
        tab === 'Todos' ||
        (tab === 'Inadimplentes' && (c.status === 'OVERDUE' || c.status === 'PENDING')) ||
        (tab === 'Pagos' && c.status === 'PAID')
    return tabOk && c.studentName.toLowerCase().includes(search.toLowerCase())
  })

  const kpis = [
    {
      label: 'A RECEBER',
      value: loading ? '—' : fmt(dash?.expectedRevenue ?? 0),
      sub: `${dash?.totalPendingCharges ?? 0} cobranças em aberto`,
    },
    {
      label: 'RECEBIDO NO MÊS',
      value: loading ? '—' : fmt(dash?.receivedRevenue ?? 0),
      sub: `${dash?.totalPaidCharges ?? 0} pagamentos confirmados`,
    },
    {
      label: 'EM ATRASO',
      value: loading ? '—' : fmt(dash?.overdueRevenue ?? 0),
      sub: `${dash?.totalOverdueCharges ?? 0} cobranças vencidas`,
    },
    {
      label: 'TOTAL ALUNOS ATIVOS',
      value: loading ? '—' : String(dash?.totalActiveStudents ?? 0),
      sub: 'alunos com matrícula ativa',
    },
  ]

  return (
      <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {showNewModal && <NewChargeModal onClose={() => setShowNewModal(false)} onCreated={load} />}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>FINANCEIRO</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Cobranças</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Mensalidades, baixas manuais e cobranças avulsas.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
                onClick={() => setShowNewModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nova cobrança
            </button>
            <button
                onClick={() => generateCharges(false)}
                disabled={generatingCharges}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff', opacity: generatingCharges ? 0.6 : 1 }}>
              {generatingCharges ? 'Gerando...' : 'Gerar cobranças do mês'}
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, background: '#e5e7eb',
          border: '1px solid #e5e7eb', borderRadius: 12,
          overflow: 'hidden', marginBottom: 32,
        }}>
          {kpis.map((k) => (
              <div key={k.label} style={{ background: '#fff', padding: '24px 28px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 12 }}>{k.label}</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>{k.value}</p>
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>{k.sub}</p>
              </div>
          ))}
        </div>

        {/* Tabela */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
          Cobranças de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Acompanhe pagamentos, registre baixas manuais e acesse links de pagamento.
        </p>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['Todos', 'Inadimplentes', 'Pagos'] as Tab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    background: tab === t ? '#f3f4f6' : 'transparent', color: tab === t ? '#111827' : '#6b7280',
                  }}>{t}</button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
                   width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar aluno..."
                     style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', width: 240 }} />
            </div>
          </div>

          {/* Cabeçalho tabela */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.4fr', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['ALUNO', 'VALOR', 'VENCIMENTO', 'STATUS', 'AÇÕES'].map((h) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
          ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Nenhuma cobrança encontrada.</div>
          ) : filtered.map((c, i) => {
            const st = STATUS_META[c.status] ?? { label: c.status, color: '#6b7280' }
            return (
                <div key={c.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.4fr',
                  padding: '14px 20px', alignItems: 'center', background: '#fff',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                      {initials(c.studentName)}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{c.studentName}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{fmt(c.amount)}</span>
                  <span style={{ fontSize: 14, color: '#374151' }}>{fmtDate(c.dueDate)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />
                    <span style={{ fontSize: 13, color: st.color, fontWeight: 500 }}>{st.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(c.status === 'PENDING' || c.status === 'OVERDUE') && (
                        <button onClick={() => markPaid(c.id)} disabled={updatingId === c.id}
                                style={{ fontSize: 12, padding: '4px 9px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                          {updatingId === c.id ? '...' : 'Baixa manual'}
                        </button>
                    )}
                    {(c.status === 'PENDING' || c.status === 'OVERDUE') && (
                        <button onClick={() => markCancelled(c.id)} disabled={updatingId === c.id}
                                style={{ fontSize: 12, padding: '4px 9px', border: '1px solid #fecaca', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#ef4444' }}>
                          Cancelar
                        </button>
                    )}
                    {c.checkoutUrl && (
                        <a href={c.checkoutUrl} target="_blank" rel="noreferrer"
                           style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', padding: '4px 9px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                          Link
                        </a>
                    )}
                    {c.pixCode && (
                        <button onClick={() => copyPix(c.id, c.pixCode!)}
                                title="Copiar código PIX"
                                style={{ fontSize: 12, padding: '4px 9px', border: '1px solid #e5e7eb', borderRadius: 6, background: copiedId === c.id ? '#dcfce7' : '#fff', cursor: 'pointer', color: copiedId === c.id ? '#16a34a' : '#374151' }}>
                          {copiedId === c.id ? '✓ Copiado' : 'PIX'}
                        </button>
                    )}
                    {c.boletoUrl && (
                        <a href={c.boletoUrl} target="_blank" rel="noreferrer"
                           style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', padding: '4px 9px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                          Boleto
                        </a>
                    )}
                  </div>
                </div>
            )
          })}
        </div>
      </div>
  )
}