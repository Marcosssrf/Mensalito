import {useEffect, useMemo, useState} from 'react'
import api from '@/services/api'
import type {AuditAction, AuditLog, Page} from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────────

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function timeLabelFn(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const diff = now.getTime() - d.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)  return 'agora'
  if (mins < 60) return `há ${mins} min`
  if (hours < 24) return `há ${hours}h`
  if (days === 1) return 'Ontem'
  const h = d.getHours().toString().padStart(2,'0')
  const m = d.getMinutes().toString().padStart(2,'0')
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${h}:${m}`
}

// ─── categoria visual ────────────────────────────────────────────────────────

type Category = 'Todos' | 'Pagamento' | 'Cobrança' | 'Cadastro' | 'Plano' | 'Turma' | 'Usuário' | 'Sistema'

const ACTION_TO_CATEGORY: Record<AuditAction, Category> = {
  CHARGE_PAID_MANUAL:      'Pagamento',
  CHARGE_PAID_WEBHOOK:     'Pagamento',
  CHARGE_CREATED:          'Cobrança',
  CHARGE_MANUAL_CREATED:   'Cobrança',
  CHARGE_CANCELLED:        'Cobrança',
  CHARGE_STATUS_UPDATED:   'Cobrança',
  CHARGE_WHATSAPP_RESENT:  'Cobrança',
  CHARGE_EXPIRED_WEBHOOK:  'Cobrança',
  STUDENT_CREATED:         'Cadastro',
  STUDENT_UPDATED:         'Cadastro',
  STUDENT_DEACTIVATED:     'Cadastro',
  STUDENT_REACTIVATED:     'Cadastro',
  ENROLLMENT_CREATED:      'Cadastro',
  ENROLLMENT_DEACTIVATED:  'Cadastro',
  PLAN_CREATED:            'Plano',
  PLAN_UPDATED:            'Plano',
  PLAN_DEACTIVATED:        'Plano',
  PLAN_REACTIVATED:        'Plano',
  CLASS_CREATED:           'Turma',
  CLASS_UPDATED:           'Turma',
  CLASS_DEACTIVATED:       'Turma',
  CLASS_REACTIVATED:       'Turma',
  USER_INVITED:            'Usuário',
  USER_REGISTERED:         'Usuário',
  USER_PROFILE_UPDATED:    'Usuário',
  USER_PASSWORD_CHANGED:   'Usuário',
  USER_DEACTIVATED:        'Usuário',
  USER_REACTIVATED:        'Usuário',
}

const CATEGORY_COLORS: Record<Category, { bg: string; color: string }> = {
  Todos:     { bg: '#f3f4f6', color: '#374151' },
  Pagamento: { bg: '#dcfce7', color: '#15803d' },
  Cobrança:  { bg: '#ede9fe', color: '#6d28d9' },
  Cadastro:  { bg: '#dbeafe', color: '#1d4ed8' },
  Plano:     { bg: '#fef9c3', color: '#a16207' },
  Turma:     { bg: '#fce7f3', color: '#9d174d' },
  Usuário:   { bg: '#ffedd5', color: '#c2410c' },
  Sistema:   { bg: '#f3f4f6', color: '#6b7280' },
}

const TABS: Category[] = ['Todos','Pagamento','Cobrança','Cadastro','Plano','Turma','Usuário']

// ─── ícones ──────────────────────────────────────────────────────────────────

type IconType = 'payment' | 'charge' | 'person' | 'plan' | 'class' | 'user' | 'settings'

function categoryToIcon(cat: Category): IconType {
  if (cat === 'Pagamento') return 'payment'
  if (cat === 'Cobrança')  return 'charge'
  if (cat === 'Cadastro')  return 'person'
  if (cat === 'Plano')     return 'plan'
  if (cat === 'Turma')     return 'class'
  if (cat === 'Usuário')   return 'user'
  return 'settings'
}

function EventIcon({ type }: { type: IconType }) {
  const s: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
  if (type === 'payment') return (
    <div style={{ ...s, background: '#dcfce7' }}>
      <svg width="15" height="15" fill="none" stroke="#16a34a" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    </div>
  )
  if (type === 'charge') return (
    <div style={{ ...s, background: '#ede9fe' }}>
      <svg width="15" height="15" fill="none" stroke="#7c3aed" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    </div>
  )
  if (type === 'person') return (
    <div style={{ ...s, background: '#dbeafe' }}>
      <svg width="15" height="15" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <polyline points="16,11 18,13 22,9"/>
      </svg>
    </div>
  )
  if (type === 'plan') return (
    <div style={{ ...s, background: '#fef9c3' }}>
      <svg width="15" height="15" fill="none" stroke="#ca8a04" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    </div>
  )
  if (type === 'class') return (
    <div style={{ ...s, background: '#fce7f3' }}>
      <svg width="15" height="15" fill="none" stroke="#db2777" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
    </div>
  )
  if (type === 'user') return (
    <div style={{ ...s, background: '#ffedd5' }}>
      <svg width="15" height="15" fill="none" stroke="#ea580c" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    </div>
  )
  return (
    <div style={{ ...s, background: '#f3f4f6' }}>
      <svg width="15" height="15" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    </div>
  )
}

// ─── agrupamento por data ────────────────────────────────────────────────────

function groupByDate(items: AuditLog[]): { label: string; items: AuditLog[] }[] {
  const today     = new Date(); today.setHours(0,0,0,0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1)
  const groups: Record<string, AuditLog[]> = {}
  for (const log of items) {
    const d = new Date(log.createdAt); d.setHours(0,0,0,0)
    let label: string
    if (d.getTime() === today.getTime())     label = 'Hoje'
    else if (d.getTime() === yesterday.getTime()) label = 'Ontem'
    else label = `${d.getDate().toString().padStart(2,'0')} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`
    if (!groups[label]) groups[label] = []
    groups[label].push(log)
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

// ─── componente principal ────────────────────────────────────────────────────

export default function ActivityPage() {
  const [logs,         setLogs]         = useState<AuditLog[]>([])
  const [totalElements,setTotalElements]= useState(0)
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [page,         setPage]         = useState(0)
  const [hasMore,      setHasMore]      = useState(false)
  const [activeTab,    setActiveTab]    = useState<Category>('Todos')
  const [search,       setSearch]       = useState('')
  const [exportLoading,setExportLoading]= useState(false)

  // filtros de data
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')

  const PAGE_SIZE = 50

  function buildParams(p: number, _tab: Category, from: string, to: string) {
    const params: Record<string,string> = {
      size: String(PAGE_SIZE),
      page: String(p),
      sort: 'createdAt,desc',
    }
    // Filtro de categoria é feito no cliente (uma categoria mapeia N actions)
    if (from) params.from = from
    if (to)   params.to   = to
    return new URLSearchParams(params).toString()
  }

  async function loadPage(p: number, replace: boolean) {
    if (p === 0) setLoading(true); else setLoadingMore(true)
    try {
      const qs = buildParams(p, activeTab, fromDate, toDate)
      const res = await api.get<Page<AuditLog>>(`/audit?${qs}`)
      const data = res.data
      setTotalElements(data.totalElements)
      setHasMore(!data.last)
      if (replace) {
        setLogs(data.content)
      } else {
        setLogs(prev => [...prev, ...data.content])
      }
      setPage(p)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // carrega ao montar e ao mudar filtros de data
  useEffect(() => {
    loadPage(0, true)
  }, [fromDate, toDate])

  // filtro de tab e busca são client-side (já temos os dados paginados)
  const filtered = useMemo(() => {
    return logs.filter(log => {
      const cat = ACTION_TO_CATEGORY[log.action] ?? 'Sistema' as Category
      const matchTab = activeTab === 'Todos' || cat === activeTab
      const matchSearch = !search ||
        log.description.toLowerCase().includes(search.toLowerCase()) ||
        (log.userEmail ?? '').toLowerCase().includes(search.toLowerCase()) ||
        log.entityType.toLowerCase().includes(search.toLowerCase())
      return matchTab && matchSearch
    })
  }, [logs, activeTab, search])

  const grouped = useMemo(() => groupByDate(filtered), [filtered])

  // contadores por categoria
  const counts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {}
    for (const log of logs) {
      const cat = ACTION_TO_CATEGORY[log.action] ?? 'Sistema' as Category
      c[cat] = (c[cat] ?? 0) + 1
    }
    return c
  }, [logs])

  function exportCSV() {
    setExportLoading(true)
    try {
      const rows = [
        ['Categoria','Ação','Entidade','ID Entidade','Descrição','Usuário','Data/Hora'],
        ...filtered.map(l => {
          const cat = ACTION_TO_CATEGORY[l.action] ?? 'Sistema'
          return [
            cat,
            l.action,
            l.entityType,
            l.entityId ?? '',
            l.description,
            l.userEmail ?? 'sistema',
            timeLabelFn(l.createdAt),
          ]
        }),
      ]
      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
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

  const inputStyle: React.CSSProperties = {
    padding: '7px 11px', border: '1px solid #e5e7eb', borderRadius: 7,
    fontSize: 13, color: '#374151', outline: 'none', background: '#fff',
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1050, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>AUDITORIA</p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Histórico de Atividade</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>
            Registro completo de todas as ações realizadas no sistema.
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportar CSV
        </button>
      </div>

      {/* Stat cards */}
      {!loading && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 1, background: '#e5e7eb', border: '1px solid #e5e7eb',
          borderRadius: 12, overflow: 'hidden', marginBottom: 24,
        }}>
          {([
            { label: 'TOTAL CARREGADO', value: logs.length, sub: totalElements > logs.length ? `de ${totalElements}` : undefined },
            { label: 'PAGAMENTOS',      value: counts['Pagamento'] ?? 0 },
            { label: 'COBRANÇAS',       value: counts['Cobrança']  ?? 0 },
            { label: 'CADASTROS',       value: counts['Cadastro']  ?? 0 },
            { label: 'USUÁRIOS',        value: counts['Usuário']   ?? 0 },
          ] as { label: string; value: number; sub?: string }[]).map(s => (
            <div key={s.label} style={{ background: '#fff', padding: '18px 20px' }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 6px' }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>{s.value}</p>
              {s.sub && <p style={{ fontSize: 11, color: '#d1d5db', margin: '2px 0 0' }}>{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Filtros de data */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>Período:</span>
        <input
          type="date" value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          style={inputStyle}
        />
        <span style={{ fontSize: 13, color: '#9ca3af' }}>até</span>
        <input
          type="date" value={toDate}
          onChange={e => setToDate(e.target.value)}
          style={inputStyle}
        />
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate('') }}
            style={{
              fontSize: 12, color: '#6b7280', background: 'none',
              border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px', cursor: 'pointer',
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Lista */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>

        {/* Tabs + busca */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>
                {tab}
                {tab !== 'Todos' && counts[tab] ? (
                  <span style={{
                    marginLeft: 5, fontSize: 10, fontWeight: 700,
                    background: activeTab === tab ? '#111827' : '#e5e7eb',
                    color: activeTab === tab ? '#fff' : '#6b7280',
                    padding: '1px 6px', borderRadius: 10,
                  }}>
                    {counts[tab]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', flexShrink: 0, marginLeft: 8 }}>
            <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{ ...inputStyle, paddingLeft: 32, width: 180 }}
            />
          </div>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Carregando registros de auditoria...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Nenhum evento encontrado.
          </div>
        ) : (
          <>
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <div style={{
                  padding: '9px 24px', background: '#f9fafb',
                  borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em' }}>
                    {label.toUpperCase()}
                  </span>
                </div>
                {items.map((log, i) => {
                  const cat  = ACTION_TO_CATEGORY[log.action] ?? 'Sistema' as Category
                  const tc   = CATEGORY_COLORS[cat]
                  const icon = categoryToIcon(cat)
                  const isSystem = !log.userEmail || log.userEmail === 'system'
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 24px',
                        borderBottom: i < items.length - 1 ? '1px solid #f9fafb' : 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <EventIcon type={icon} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 500, color: '#111827',
                          margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {log.description}
                        </p>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0' }}>
                          {log.entityType}
                          {log.entityId && (
                            <span style={{ color: '#d1d5db' }}> · #{log.entityId.slice(-8).toUpperCase()}</span>
                          )}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '3px 10px',
                          borderRadius: 20, background: tc.bg, color: tc.color,
                        }}>
                          {cat}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{timeLabelFn(log.createdAt)}</p>
                          <p style={{ fontSize: 11, color: '#d1d5db', margin: '2px 0 0' }}>
                            {isSystem ? 'sistema' : log.userEmail}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {/* Carregar mais */}
            {hasMore && (
              <div style={{ padding: '20px 24px', textAlign: 'center', borderTop: '1px solid #f3f4f6' }}>
                <button
                  onClick={() => loadPage(page + 1, false)}
                  disabled={loadingMore}
                  style={{
                    padding: '9px 20px', border: '1px solid #e5e7eb', borderRadius: 8,
                    background: '#fff', cursor: loadingMore ? 'default' : 'pointer',
                    fontSize: 13, fontWeight: 500, color: '#374151',
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? 'Carregando...' : `Carregar mais (${totalElements - logs.length} restantes)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!loading && (
        <p style={{ fontSize: 12, color: '#d1d5db', textAlign: 'center', marginTop: 16 }}>
          {filtered.length} evento{filtered.length !== 1 ? 's' : ''} exibido{filtered.length !== 1 ? 's' : ''}
          {totalElements > logs.length && ` · ${totalElements} no total`}
        </p>
      )}
    </div>
  )
}
