import {useEffect, useState} from 'react'
import api from '@/services/api'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

interface MonthlyData {
  month: string
  revenue: number
  defaultRate: number
  newEnrollments: number
  cancellations: number
  pixCount: number
  boletoCount: number
  cardCount: number
  cashCount: number
}

interface ReportData {
  mrr: number
  mrrGrowthPct: number
  avgTicket: number
  payingStudents: number
  defaultRate: number
  defaultRateChange: number
  churnRate: number
  churnCount: number
  monthlyRevenue: MonthlyData[]
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function pct(v: number) {
  return `${v.toFixed(1)}%`
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function buildMonthlyData(charges: any[], enrollments: any[]): MonthlyData[] {
  const now = new Date()
  const months: MonthlyData[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = MONTHS_PT[d.getMonth()]

    const inMonth = charges.filter((c: any) => (c.dueDate ?? '').slice(0, 7) === key)
    const paid = inMonth.filter((c: any) => c.status === 'PAID')
    const overdue = inMonth.filter((c: any) => c.status === 'OVERDUE' || (c.status === 'PENDING' && new Date(c.dueDate) < now))
    const total = inMonth.length

    const pixCount = paid.filter((c: any) => c.pixCode).length
    const boletoCount = paid.filter((c: any) => c.boletoUrl && !c.pixCode).length
    const cashCount = paid.length - pixCount - boletoCount

    const newEnrollments = enrollments.filter((e: any) => (e.createdAt ?? e.startDate ?? '').slice(0, 7) === key).length
    const cancellations = enrollments.filter((e: any) => (e.endDate ?? '').slice(0, 7) === key && e.active === false).length

    months.push({
      month: label,
      revenue: paid.reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0),
      defaultRate: total > 0 ? (overdue.length / total) * 100 : 0,
      newEnrollments,
      cancellations,
      pixCount,
      boletoCount,
      cardCount: 0,
      cashCount,
    })
  }

  return months
}

const PIE_COLORS = ['#1a7a4a', '#1e3a5f', '#4a90a4', '#b0b8c4']

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/charges?size=500&sort=dueDate,desc'),
      api.get('/enrollments'),
    ]).then(([dashRes, chargesRes, enrollRes]) => {
      const dash = dashRes.data as any
      const chargesRaw = chargesRes.data as any
      const allCharges: any[] = Array.isArray(chargesRaw) ? chargesRaw : (chargesRaw?.content ?? [])
      const allEnrollments: any[] = Array.isArray(enrollRes.data) ? enrollRes.data : []

      const monthlyData = buildMonthlyData(allCharges, allEnrollments)

      const prevRevenue = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2].revenue : 0
      const curRevenue = monthlyData.length >= 1 ? monthlyData[monthlyData.length - 1].revenue : 0
      const mrrGrowthPct = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0

      const prevDefault = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2].defaultRate : 0
      const curDefault = monthlyData.length >= 1 ? monthlyData[monthlyData.length - 1].defaultRate : 0
      const defaultRateChange = curDefault - prevDefault

      const churnedEnrollments = allEnrollments.filter((e: any) => {
        if (e.active !== false) return false
        const created = new Date(e.createdAt ?? e.startDate ?? '')
        return (new Date().getTime() - created.getTime()) > 30 * 86400000
      })
      const activeCount = allEnrollments.filter((e: any) => e.active !== false).length
      const churnRate = (activeCount + churnedEnrollments.length) > 0
        ? (churnedEnrollments.length / (activeCount + churnedEnrollments.length)) * 100
        : 0

      setReport({
        mrr: dash.receivedRevenue ?? 0,
        mrrGrowthPct,
        avgTicket: dash.totalPaidCharges > 0 ? (dash.receivedRevenue ?? 0) / dash.totalPaidCharges : 0,
        payingStudents: dash.totalActiveStudents ?? 0,
        defaultRate: (dash.totalPendingCharges + dash.totalOverdueCharges) > 0
          ? (dash.totalOverdueCharges / (dash.totalPendingCharges + dash.totalOverdueCharges)) * 100
          : curDefault,
        defaultRateChange,
        churnRate,
        churnCount: churnedEnrollments.length,
        monthlyRevenue: monthlyData,
      })
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const paymentMixData = report ? (() => {
    const last = report.monthlyRevenue[report.monthlyRevenue.length - 1]
    const total = (last?.pixCount ?? 0) + (last?.boletoCount ?? 0) + (last?.cashCount ?? 0)
    if (total === 0) return [{ name: 'PIX', value: 1, color: PIE_COLORS[0] }]
    return [
      { name: 'PIX', value: last?.pixCount ?? 0, color: PIE_COLORS[0] },
      { name: 'Boleto', value: last?.boletoCount ?? 0, color: PIE_COLORS[1] },
      { name: 'Outros', value: last?.cashCount ?? 0, color: PIE_COLORS[3] },
    ].filter(d => d.value > 0)
  })() : []

  const kpis = report ? [
    {
      label: 'MRR',
      value: fmt(report.mrr),
      sub: `${report.mrrGrowthPct >= 0 ? '+' : ''}${pct(report.mrrGrowthPct)} vs mês ant.`,
      subColor: report.mrrGrowthPct >= 0 ? '#16a34a' : '#dc2626',
    },
    {
      label: 'TICKET MÉDIO',
      value: fmt(report.avgTicket),
      sub: `${report.payingStudents} alunos pagantes`,
      subColor: '#6b7280',
    },
    {
      label: 'INADIMPLÊNCIA',
      value: pct(report.defaultRate),
      sub: `${report.defaultRateChange >= 0 ? '+' : ''}${pct(report.defaultRateChange)} p.p. vs mês ant.`,
      subColor: report.defaultRateChange <= 0 ? '#16a34a' : '#dc2626',
    },
    {
      label: 'CHURN MENSAL',
      value: pct(report.churnRate),
      sub: `${report.churnCount} cancelamento${report.churnCount !== 1 ? 's' : ''}`,
      subColor: '#6b7280',
    },
  ] : []

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>INSIGHTS</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Relatórios</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>Indicadores financeiros e operacionais dos últimos meses.</p>
        </div>
        <button
          onClick={() => { setExporting(true); setTimeout(() => { window.print(); setExporting(false) }, 300) }}
          disabled={exporting}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', border: '1px solid #e5e7eb',
            borderRadius: 8, background: '#fff', cursor: 'pointer',
            fontSize: 13, fontWeight: 500, color: '#374151',
            opacity: exporting ? 0.6 : 1,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar PDF
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Carregando relatórios...</div>
      ) : (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 1, background: '#e5e7eb',
            border: '1px solid #e5e7eb', borderRadius: 12,
            overflow: 'hidden', marginBottom: 28,
          }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ background: '#fff', padding: '24px 28px' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 12 }}>{k.label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 }}>{k.value}</p>
                <p style={{ fontSize: 13, color: k.subColor, marginTop: 6, fontWeight: 500 }}>{k.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Receita mensal</h3>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Últimos 7 meses</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={report?.monthlyRevenue ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#111827" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip formatter={(v: any) => [fmt(v), 'Receita']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Taxa de inadimplência</h3>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>% cobranças em atraso</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={report?.monthlyRevenue ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="defGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Inadimplência']}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Area type="monotone" dataKey="defaultRate" stroke="#dc2626" strokeWidth={2} fill="url(#defGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Matrículas vs cancelamentos</h3>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Movimento mensal</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={report?.monthlyRevenue.map(m => ({
                    ...m, novas: m.newEnrollments, cancelamentos: m.cancellations,
                  })) ?? []}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Legend iconType="square" iconSize={10}
                    formatter={(v) => <span style={{ fontSize: 12, color: '#6b7280' }}>{v === 'novas' ? 'Novas' : 'Cancelamentos'}</span>} />
                  <Bar dataKey="novas" fill="#111827" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="cancelamentos" fill="#d1d5db" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Mix de meios de pagamento</h3>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
                <PieChart width={180} height={180}>
                  <Pie data={paymentMixData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                    {paymentMixData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any, name: any) => [v, name]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {paymentMixData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 13, color: '#374151' }}>{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
