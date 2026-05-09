import {useEffect, useMemo, useState} from 'react'
import api from '@/services/api'

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type EventType = 'Todos' | 'Pagamento' | 'WhatsApp' | 'Cadastro' | 'Cobrança' | 'Alerta' | 'Sistema'

interface ActivityEvent {
  id: string
  type: EventType
  title: string
  subtitle: string
  timeLabel: string
  sortDate: Date
  actor: string
  iconType: 'payment' | 'message' | 'person' | 'charge' | 'alert' | 'settings' | 'whatsapp'
}

function timeLabelFn(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins} min`
  if (hours < 24) return `há ${hours}h`
  if (days === 1) return 'Ontem'
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${h}:${m}`
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function EventIcon({ type }: { type: ActivityEvent['iconType'] }) {
  const style: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
  if (type === 'payment') return (
    <div style={{ ...style, background: '#dcfce7' }}>
      <svg width="15" height="15" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    </div>
  )
  if (type === 'message' || type === 'whatsapp') return (
    <div style={{ ...style, background: '#dcfce7' }}>
      <svg width="15" height="15" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    </div>
  )
  if (type === 'person') return (
    <div style={{ ...style, background: '#eff6ff' }}>
      <svg width="15" height="15" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <polyline points="16,11 18,13 22,9" />
      </svg>
    </div>
  )
  if (type === 'charge') return (
    <div style={{ ...style, background: '#faf5ff' }}>
      <svg width="15" height="15" fill="none" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    </div>
  )
  if (type === 'alert') return (
    <div style={{ ...style, background: '#fef9c3' }}>
      <svg width="15" height="15" fill="none" stroke="#ca8a04" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </div>
  )
  return (
    <div style={{ ...style, background: '#f3f4f6' }}>
      <svg width="15" height="15" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </div>
  )
}

const TYPE_COLORS: Record<EventType, { bg: string; color: string }> = {
  Todos:     { bg: '#f3f4f6', color: '#374151' },
  Pagamento: { bg: '#dcfce7', color: '#15803d' },
  WhatsApp:  { bg: '#dcfce7', color: '#15803d' },
  Cadastro:  { bg: '#dbeafe', color: '#1d4ed8' },
  Cobrança:  { bg: '#ede9fe', color: '#6d28d9' },
  Alerta:    { bg: '#fef9c3', color: '#a16207' },
  Sistema:   { bg: '#f3f4f6', color: '#6b7280' },
}

const TABS: EventType[] = ['Todos', 'Pagamento', 'Cobrança', 'Cadastro', 'Alerta', 'Sistema']

function groupByDate(events: ActivityEvent[]): { label: string; items: ActivityEvent[] }[] {
  const today = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
  const groups: Record<string, ActivityEvent[]> = {}
  for (const evt of events) {
    const d = new Date(evt.sortDate); d.setHours(0,0,0,0)
    let label: string
    if (d.getTime() === today.getTime()) label = 'Hoje'
    else if (d.getTime() === yesterday.getTime()) label = 'Ontem'
    else label = `${d.getDate().toString().padStart(2,'0')} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`
    if (!groups[label]) groups[label] = []
    groups[label].push(evt)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<EventType>('Todos')
  const [search, setSearch] = useState('')
  const [exportLoading, setExportLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get('/charges?size=200&sort=createdAt,desc'),
      api.get('/enrollments'),
    ]).then(([chargesRes, enrollRes]) => {
      const charges: any[] = Array.isArray(chargesRes.data)
        ? chargesRes.data
        : (chargesRes.data?.content ?? [])
      const enrollments: any[] = Array.isArray(enrollRes.data)
        ? enrollRes.data
        : (enrollRes.data?.content ?? [])

      const built: ActivityEvent[] = []

      // Pagamentos confirmados
      charges.filter((c: any) => c.status === 'PAID' && c.studentName).forEach((c: any) => {
        const method = c.pixCode ? 'PIX' : c.boletoUrl ? 'Boleto' : 'Manual'
        const dateStr = c.paymentDate ?? c.createdAt
        built.push({
          id: `pay-${c.id}`, type: 'Pagamento',
          title: `${c.studentName} pagou ${fmt(Number(c.amount))} via ${method}`,
          subtitle: `Fatura #${c.id?.toString().slice(-8).toUpperCase()} · venc. ${c.dueDate ? c.dueDate.split('-').reverse().join('/') : '—'}`,
          timeLabel: dateStr ? timeLabelFn(dateStr) : '—',
          sortDate: new Date(dateStr ?? c.createdAt),
          actor: 'Sistema', iconType: 'payment',
        })
      })

      // Cobranças canceladas
      charges.filter((c: any) => c.status === 'CANCELLED' && c.studentName).forEach((c: any) => {
        built.push({
          id: `cancel-${c.id}`, type: 'Cobrança',
          title: `Cobrança de ${c.studentName} cancelada`,
          subtitle: `${fmt(Number(c.amount))} · Fatura #${c.id?.toString().slice(-8).toUpperCase()}`,
          timeLabel: timeLabelFn(c.createdAt),
          sortDate: new Date(c.createdAt),
          actor: 'Usuário', iconType: 'charge',
        })
      })

      // Alertas de atraso
      charges.filter((c: any) => c.status === 'OVERDUE' && c.studentName).slice(0, 15).forEach((c: any) => {
        built.push({
          id: `overdue-${c.id}`, type: 'Alerta',
          title: `Cobrança de ${c.studentName} em atraso`,
          subtitle: `${fmt(Number(c.amount))} · venceu em ${c.dueDate ? c.dueDate.split('-').reverse().join('/') : '—'}`,
          timeLabel: c.dueDate ? timeLabelFn(c.dueDate + 'T09:00:00') : '—',
          sortDate: new Date((c.dueDate ?? c.createdAt) + 'T09:00:00'),
          actor: 'Sistema', iconType: 'alert',
        })
      })

      // Cobranças pendentes geradas
      charges.filter((c: any) => c.status === 'PENDING' && c.studentName).slice(0, 30).forEach((c: any) => {
        built.push({
          id: `pending-${c.id}`, type: 'Cobrança',
          title: `Cobrança gerada para ${c.studentName}`,
          subtitle: `${fmt(Number(c.amount))} · vence em ${c.dueDate ? c.dueDate.split('-').reverse().join('/') : '—'}`,
          timeLabel: timeLabelFn(c.createdAt),
          sortDate: new Date(c.createdAt),
          actor: 'Automação', iconType: 'charge',
        })
      })

      // Matrículas ativas
      enrollments.filter((e: any) => e.active).slice(0, 30).forEach((e: any) => {
        built.push({
          id: `enroll-${e.id}`, type: 'Cadastro',
          title: `${e.studentName} matriculado em ${e.className}`,
          subtitle: `Plano ${e.planName} · ${fmt(Number(e.amount))}/mês`,
          timeLabel: e.createdAt ? timeLabelFn(e.createdAt) : '—',
          sortDate: new Date(e.createdAt ?? Date.now()),
          actor: 'Usuário', iconType: 'person',
        })
      })

      // Matrículas encerradas
      enrollments.filter((e: any) => !e.active).slice(0, 10).forEach((e: any) => {
        built.push({
          id: `enroll-end-${e.id}`, type: 'Sistema',
          title: `Matrícula de ${e.studentName} encerrada`,
          subtitle: `Turma ${e.className} · plano ${e.planName}`,
          timeLabel: e.updatedAt ? timeLabelFn(e.updatedAt) : '—',
          sortDate: new Date(e.updatedAt ?? e.createdAt ?? Date.now()),
          actor: 'Sistema', iconType: 'settings',
        })
      })

      built.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
      setEvents(built)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => events.filter(e => {
    const matchTab = activeTab === 'Todos' || e.type === activeTab
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.subtitle.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  }), [events, activeTab, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  function exportCSV() {
    setExportLoading(true)
    try {
      const rows = [
        ['Tipo', 'Evento', 'Detalhe', 'Quando', 'Responsável'],
        ...filtered.map(e => [e.type, e.title, e.subtitle, e.timeLabel, e.actor])
      ]
      const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `auditoria-${new Date().toISOString().slice(0,10)}.csv`
      a.click(); URL.revokeObjectURL(url)
    } finally { setExportLoading(false) }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '9px 14px', border: 'none', background: 'none',
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? '#111827' : '#6b7280',
    borderBottom: active ? '2px solid #111827' : '2px solid transparent',
    transition: 'all 0.15s', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>AUDITORIA</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Histórico de Atividade</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Registro completo de pagamentos, cobranças, matrículas e alertas.
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={exportLoading || filtered.length === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', border: '1px solid #e5e7eb', borderRadius: 8,
            background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            color: '#374151', opacity: exportLoading ? 0.6 : 1,
          }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Stat cards */}
      {!loading && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, background: '#e5e7eb', border: '1px solid #e5e7eb',
          borderRadius: 12, overflow: 'hidden', marginBottom: 28,
        }}>
          {[
            { label: 'TOTAL DE EVENTOS', value: events.length },
            { label: 'PAGAMENTOS', value: events.filter(e => e.type === 'Pagamento').length },
            { label: 'COBRANÇAS', value: events.filter(e => e.type === 'Cobrança').length },
            { label: 'ALERTAS', value: events.filter(e => e.type === 'Alerta').length },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', padding: '20px 24px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 8px' }}>{s.label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Events list */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
        {/* Tabs + search */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>
                {tab}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', flexShrink: 0, marginLeft: 8 }}>
            <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                padding: '8px 12px 8px 32px', border: '1px solid #e5e7eb',
                borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', width: 180,
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Carregando atividades...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Nenhum evento encontrado.
          </div>
        ) : (
          grouped.map(({ label, items }) => (
            <div key={label}>
              <div style={{
                padding: '9px 24px', background: '#f9fafb',
                borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em' }}>
                  {label.toUpperCase()}
                </span>
              </div>
              {items.map((evt, i) => {
                const tc = TYPE_COLORS[evt.type]
                return (
                  <div
                    key={evt.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 24px',
                      borderBottom: i < items.length - 1 ? '1px solid #f9fafb' : 'none',
                      cursor: 'default',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <EventIcon type={evt.iconType} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {evt.title}
                      </p>
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0' }}>{evt.subtitle}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '3px 10px',
                        borderRadius: 20, background: tc.bg, color: tc.color,
                      }}>
                        {evt.type}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{evt.timeLabel}</p>
                        <p style={{ fontSize: 11, color: '#d1d5db', margin: '2px 0 0' }}>por {evt.actor}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {!loading && (
        <p style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', marginTop: 16 }}>
          {filtered.length} evento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
