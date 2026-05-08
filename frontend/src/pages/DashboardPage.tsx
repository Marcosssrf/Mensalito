import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import api from '@/services/api'

// Espelha exatamente DashboardResponseDTO do backend
interface DashboardData {
  expectedRevenue: number
  receivedRevenue: number
  overdueRevenue: number
  totalActiveStudents: number
  totalPendingCharges: number
  totalPaidCharges: number
  totalOverdueCharges: number
}

// Espelha exatamente ChargeResponseDTO do backend
interface Charge {
  id: string
  studentName: string
  amount: number        // BigDecimal → number (ex: 280.00, já em reais)
  dueDate: string       // LocalDate → "2026-05-05"
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED' | 'LOST' | 'DISPUTED'
  paymentDate: string | null
  pixCode: string | null
  boletoUrl: string | null
  checkoutUrl: string | null
  createdAt: string
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

// LocalDate vem como "2026-05-05" → "05/05"
function fmtDate(d: string | null) {
  if (!d) return '—'
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function monthLabel() {
  return new Date()
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .toUpperCase()
}

type Tab = 'Todos' | 'Inadimplentes' | 'Pagos'

// Checa status do WhatsApp direto na Evolution API (sem backend)
function WAStatusBtn() {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const url = localStorage.getItem('evo_url')
    const key = localStorage.getItem('evo_key')
    const inst = localStorage.getItem('evo_instance')
    if (!url || !key || !inst) { setOnline(false); return }
    fetch(`${url}/instance/connectionState/${inst}`, { headers: { apikey: key } })
      .then((r) => r.json())
      .then((d) => setOnline(d?.instance?.state === 'open' || d?.state === 'open'))
      .catch(() => setOnline(false))
  }, [])

  return (
    <button style={btnStyle}>
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Status do WhatsApp
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: online === null ? '#d1d5db' : online ? '#10b981' : '#ef4444',
      }} />
    </button>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [dash, setDash] = useState<DashboardData | null>(null)
  const [charges, setCharges] = useState<Charge[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Todos')
  const [search, setSearch] = useState('')

  const userName = localStorage.getItem('userName') ?? 'Usuário'

  useEffect(() => {
    // baseURL já é http://localhost:8080/api → chamar sem /api
    Promise.all([
      api.get<DashboardData>('/dashboard'),
      api.get<Charge[]>('/charges'),
    ])
      .then(([d, c]) => {
        setDash(d.data)
        setCharges(c.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = charges.filter((c) => {
    const tabOk =
      tab === 'Todos' ||
      (tab === 'Inadimplentes' && (c.status === 'OVERDUE' || c.status === 'PENDING')) ||
      (tab === 'Pagos' && c.status === 'PAID')
    return tabOk && c.studentName.toLowerCase().includes(search.toLowerCase())
  })

  const receivedPct =
    dash && dash.expectedRevenue > 0
      ? ((dash.receivedRevenue / dash.expectedRevenue) * 100).toFixed(1)
      : '0'

  const inadimplPct =
    dash && dash.expectedRevenue > 0
      ? ((dash.overdueRevenue / dash.expectedRevenue) * 100).toFixed(1)
      : '0,0'

  const kpis = [
    {
      label: 'RECEITA PREVISTA',
      value: loading ? '—' : fmt(dash?.expectedRevenue ?? 0),
      sub: `↗ +4,2% vs. mês anterior`,
      subColor: '#10b981',
    },
    {
      label: 'RECEITA RECEBIDA',
      value: loading ? '—' : fmt(dash?.receivedRevenue ?? 0),
      sub: `↗ ${receivedPct}% do previsto`,
      subColor: '#10b981',
    },
    {
      label: 'INADIMPLÊNCIA',
      value: loading ? '—' : `${inadimplPct}%`,
      sub: `${dash?.totalOverdueCharges ?? 0} cobranças vencidas`,
      subColor: '#f59e0b',
    },
    {
      label: 'TOTAL DE ALUNOS',
      value: loading ? '—' : String(dash?.totalActiveStudents ?? 0),
      sub: `${dash?.totalPendingCharges ?? 0} pendentes`,
      subColor: '#6b7280',
    },
  ]

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>
          VISÃO GERAL · {monthLabel()}
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>
          {greeting()}, {userName.split(' ')[0]}.
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 6 }}>
          Acompanhe a saúde financeira da escola e tome ações em segundos.
        </p>
      </div>

      {/* KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1, background: '#e5e7eb',
        border: '1px solid #e5e7eb', borderRadius: 12,
        overflow: 'hidden', marginBottom: 28,
      }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: '#fff', padding: '24px 28px' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 12 }}>
              {k.label}
            </p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 }}>{k.value}</p>
            <p style={{ fontSize: 13, color: k.subColor, marginTop: 6 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Botões de ação */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/app/students')} style={btnStyle}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Adicionar aluno
        </button>
        <button onClick={() => navigate('/app/charges')} style={btnStyle}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Lançar pagamento manual
        </button>
        <WAStatusBtn />
      </div>

      {/* Tabela de cobranças */}
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
        Cobranças de {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
      </h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
        Acompanhe pagamentos, envie lembretes e registre baixas manuais.
      </p>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['Todos', 'Inadimplentes', 'Pagos'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500,
                background: tab === t ? '#f3f4f6' : 'transparent',
                color: tab === t ? '#111827' : '#6b7280',
              }}>{t}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno ou turma..."
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', width: 220 }} />
          </div>
        </div>

        {/* Header da tabela */}
        <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 0.8fr', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          {['ALUNO', 'VALOR', 'VENCIMENTO', 'STATUS', 'AÇÕES'].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {/* Linhas */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Nenhuma cobrança encontrada.</div>
        ) : filtered.map((c, i) => {
          const st = STATUS_META[c.status] ?? { label: c.status, color: '#6b7280' }
          return (
            <div key={c.id} style={{
              display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 0.8fr',
              padding: '14px 20px', alignItems: 'center', background: '#fff',
              borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                  {initials(c.studentName)}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{c.studentName}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{fmt(c.amount)}</span>
              <span style={{ fontSize: 14, color: '#374151' }}>{fmtDate(c.dueDate)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color }} />
                <span style={{ fontSize: 13, color: st.color, fontWeight: 500 }}>{st.label}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {c.checkoutUrl && (
                  <a href={c.checkoutUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                    Link
                  </a>
                )}
                {c.pixCode && (
                  <button onClick={() => navigator.clipboard.writeText(c.pixCode!)}
                    style={{ fontSize: 12, color: '#6b7280', padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
                    PIX
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '9px 16px', border: '1px solid #e5e7eb',
  borderRadius: 8, background: '#fff', cursor: 'pointer',
  fontSize: 13, fontWeight: 500, color: '#374151',
}
