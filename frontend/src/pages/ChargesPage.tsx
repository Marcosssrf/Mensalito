import {useEffect, useState} from 'react'
import api from '@/services/api'
import type {Page} from '@/types'

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

// Mapa de tab -> parâmetro de query para o backend
const TAB_PARAM: Record<Tab, string> = {
  Todos:         '',
  Inadimplentes: '&status=OVERDUE',
  Pagos:         '&status=PAID',
}

const PAGE_SIZE = 20

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

const PAYMENT_METHODS = [
  { value: 'PIX',      label: 'PIX',      icon: '⚡' },
  { value: 'BOLETO',   label: 'Boleto',   icon: '📄' },
  { value: 'CARTAO',   label: 'Cartão',   icon: '💳' },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
  { value: 'OUTROS',   label: 'Outros',   icon: '🔄' },
]

function ManualPaymentModal({
                              chargeId,
                              studentName,
                              amount,
                              onClose,
                              onPaid,
                            }: {
  chargeId: string
  studentName: string
  amount: number
  onClose: () => void
  onPaid: () => void
}) {
  const [method, setMethod] = useState('PIX')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function confirm() {
    setSaving(true); setError('')
    try {
      // For non-gateway payments: just mark as PAID directly
      await api.patch(`/charges/${chargeId}/status`, { status: 'PAID' })
      onPaid(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao confirmar pagamento')
    } finally { setSaving(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Confirmar pagamento</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            Registrar baixa manual para <strong>{studentName}</strong> · {fmt(amount)}
          </p>

          {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>
          )}

          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Meio de pagamento</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
            {PAYMENT_METHODS.map(m => (
                <button
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                      border: method === m.value ? '2px solid #111827' : '2px solid #e5e7eb',
                      background: method === m.value ? '#f9fafb' : '#fff',
                      fontSize: 13, fontWeight: method === m.value ? 600 : 400,
                      color: '#111827', transition: 'all 0.15s',
                    }}
                >
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  {m.label}
                </button>
            ))}
          </div>

          {(method === 'PIX' || method === 'BOLETO' || method === 'CARTAO') && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: 8, padding: '10px 14px', fontSize: 12,
                color: '#166534', marginBottom: 20,
              }}>
                Pagamento registrado manualmente — não será processado pelo gateway.
              </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Cancelar</button>
            <button onClick={confirm} disabled={saving}
                    style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#059669', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Confirmando...' : '✓ Confirmar como Pago'}
            </button>
          </div>
        </div>
      </div>
  )
}

const CHARGE_PAYMENT_METHODS = [
  { value: 'PIX',      label: 'PIX',      icon: '⚡' },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
  { value: 'CARTAO',   label: 'Cartão',   icon: '💳' },
  { value: 'BOLETO',   label: 'Boleto',   icon: '📄' },
  { value: 'OUTROS',   label: 'Outros',   icon: '🔄' },
]

type NewChargeStep = 'enrollment' | 'payment'

function NewChargeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState<NewChargeStep>('enrollment')
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null)
  const [dueDate, setDueDate] = useState(todayStr())
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Enrollment[]>('/enrollments')
        .then(r => {
          const data = Array.isArray(r.data) ? r.data : (r.data as any).content ?? []
          setEnrollments(data.filter((e: Enrollment) => e.active))
        })
        .catch(console.error)
        .finally(() => setLoadingData(false))
  }, [])

  function handleNextToPayment() {
    if (!selectedEnrollment) { setError('Selecione uma matrícula'); return }
    if (!dueDate) { setError('Informe a data de vencimento'); return }
    setError('')
    setStep('payment')
  }

  async function handleSubmit() {
    if (!selectedEnrollment) { setError('Selecione uma matrícula'); return }
    setSaving(true); setError('')
    try {
      const res = await api.post('/charges', { enrollmentId: selectedEnrollment.id, dueDate })
      const charge = res.data as any
      // Todos os meios manuais: confirma como pago diretamente
      await api.patch(`/charges/${charge.id}/status`, { status: 'PAID' })
      onCreated(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao criar cobrança')
    } finally { setSaving(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 520, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Nova cobrança</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Crie uma cobrança avulsa para uma matrícula ativa.</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: step === 'enrollment' ? '#111827' : '#f0fdf4',
              color: step === 'enrollment' ? '#fff' : '#059669',
            }}>
              {step === 'payment'
                  ? <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  : <span>1</span>
              }
              Matrícula &amp; Vencimento
            </div>
            <span style={{ color: '#d1d5db' }}>›</span>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: step === 'payment' ? '#111827' : '#f3f4f6',
              color: step === 'payment' ? '#fff' : '#9ca3af',
            }}>
              <span>2</span>
              Pagamento
            </div>
          </div>

          {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16, display: 'flex', gap: 8 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
          )}

          {/* Passo 1: matrícula + data */}
          {step === 'enrollment' && (
              <>
                {loadingData ? (
                    <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Carregando matrículas...</p>
                ) : (
                    <>
                      <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 8 }}>Matrícula ativa *</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
                        {enrollments.length === 0 ? (
                            <p style={{ color: '#9ca3af', fontSize: 13, padding: 8 }}>Nenhuma matrícula ativa encontrada.</p>
                        ) : enrollments.map(e => {
                          const selected = selectedEnrollment?.id === e.id
                          return (
                              <label key={e.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                                border: `2px solid ${selected ? '#111827' : '#e5e7eb'}`,
                                borderRadius: 10, cursor: 'pointer',
                                background: selected ? '#fafafa' : '#fff',
                                transition: 'border-color 0.12s',
                              }}>
                                <input type="radio" name="enroll" checked={selected}
                                       onChange={() => { setSelectedEnrollment(e); setError('') }}
                                       style={{ accentColor: '#111827', width: 16, height: 16, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{e.studentName}</div>
                                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{e.className} · {e.planName}</div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>{fmt(e.amount)}</div>
                              </label>
                          )
                        })}
                      </div>

                      <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Data de vencimento *</label>
                      <input type="date" value={dueDate}
                             onChange={e => setDueDate(e.target.value)}
                             style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                      />
                    </>
                )}
              </>
          )}

          {/* Passo 2: pagamento */}
          {step === 'payment' && (
              <>
                {/* Resumo */}
                <div style={{
                  marginBottom: 20, padding: '12px 14px',
                  background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#9ca3af' }}>Aluno</span>
                    <strong>{selectedEnrollment?.studentName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#9ca3af' }}>Turma</span>
                    <span>{selectedEnrollment?.className}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#9ca3af' }}>Vencimento</span>
                    <span>{dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4, borderTop: '1px solid #e5e7eb' }}>
                    <span style={{ color: '#9ca3af' }}>Valor</span>
                    <strong style={{ color: '#059669', fontSize: 15 }}>{fmt(selectedEnrollment?.amount ?? 0)}</strong>
                  </div>
                </div>

                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 10 }}>Como foi recebido?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {CHARGE_PAYMENT_METHODS.map(m => (
                      <button key={m.value} onClick={() => setPaymentMethod(m.value)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                                border: paymentMethod === m.value ? '2px solid #111827' : '2px solid #e5e7eb',
                                background: paymentMethod === m.value ? '#f9fafb' : '#fff',
                                fontSize: 14, fontWeight: paymentMethod === m.value ? 600 : 400,
                                color: '#111827', transition: 'all 0.12s',
                              }}>
                        <span style={{ fontSize: 18 }}>{m.icon}</span>
                        {m.label}
                        {paymentMethod === m.value && (
                            <svg style={{ marginLeft: 'auto', color: '#059669' }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                      </button>
                  ))}
                </div>

                <div style={{
                  marginTop: 14, padding: '10px 14px', borderRadius: 8,
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  fontSize: 12, color: '#065f46',
                }}>
                  Pagamento registrado manualmente — confirmado como <strong>Pago</strong> sem processar pelo gateway.
                </div>
              </>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={onClose} style={{ padding: '9px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
              Cancelar
            </button>
            {step === 'enrollment' && (
                <button onClick={handleNextToPayment} disabled={!selectedEnrollment || loadingData}
                        style={{
                          padding: '9px 20px', borderRadius: 8, border: 'none', cursor: !selectedEnrollment || loadingData ? 'not-allowed' : 'pointer',
                          background: !selectedEnrollment || loadingData ? '#9ca3af' : '#111827',
                          color: '#fff', fontSize: 13, fontWeight: 600,
                        }}>
                  Próximo →
                </button>
            )}
            {step === 'payment' && (
                <>
                  <button onClick={() => setStep('enrollment')} style={{ padding: '9px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
                    ← Voltar
                  </button>
                  <button onClick={handleSubmit} disabled={saving}
                          style={{
                            padding: '9px 20px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                            background: saving ? '#9ca3af' : '#059669',
                            color: '#fff', fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1,
                          }}>
                    {saving ? 'Confirmando...' : '✓ Confirmar como Pago'}
                  </button>
                </>
            )}
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
  const [manualPayCharge, setManualPayCharge] = useState<Charge | null>(null)

  // Paginação
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  function load(p = page, currentTab = tab) {
    setLoading(true)
    const statusParam = TAB_PARAM[currentTab]
    Promise.all([
      api.get<Page<Charge>>(`/charges?page=${p}&size=${PAGE_SIZE}&sort=dueDate,desc${statusParam}`),
      api.get<DashboardData>('/dashboard'),
    ])
        .then(([c, d]) => {
          // Garante que sempre temos um array, independente do formato da resposta
          const raw = c.data as any
          const content: Charge[] = Array.isArray(raw) ? raw : (raw?.content ?? [])
          setCharges(content)
          setTotalPages(raw?.totalPages ?? 1)
          setTotalElements(raw?.totalElements ?? content.length)
          setPage(raw?.number ?? p)
          setDash(d.data)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
  }

  useEffect(() => {
    setPage(0)
    load(0, tab)
  }, [tab])

  function openManualPay(c: Charge) {
    setManualPayCharge(c)
  }

  async function markCancelled(id: string) {
    setUpdatingId(id)
    try {
      await api.patch(`/charges/${id}/status`, { status: 'CANCELLED' })
      load(page)
    } finally { setUpdatingId(null) }
  }

  async function generateCharges(force: boolean) {
    setGeneratingCharges(true)
    try {
      await api.post(`/charges/generate-charges?force=${force}`)
      load(0)
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Erro ao gerar cobranças')
    } finally { setGeneratingCharges(false) }
  }

  function copyPix(id: string, code: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function goToPage(p: number) {
    if (p < 0 || p >= totalPages) return
    load(p)
  }

  // Filtro local de busca (dentro da página atual) — guard defensivo caso charges não seja array
  const filtered = (Array.isArray(charges) ? charges : []).filter((c) =>
      c.studentName.toLowerCase().includes(search.toLowerCase())
  )

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
        {showNewModal && <NewChargeModal onClose={() => setShowNewModal(false)} onCreated={() => load(0)} />}
        {manualPayCharge && (
            <ManualPaymentModal
                chargeId={manualPayCharge.id}
                studentName={manualPayCharge.studentName}
                amount={Number(manualPayCharge.amount)}
                onClose={() => setManualPayCharge(null)}
                onPaid={() => { setManualPayCharge(null); load(page) }}
            />
        )}

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
                        <button onClick={() => openManualPay(c)} disabled={updatingId === c.id}
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

          {/* Paginação */}
          {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Página {page + 1} de {totalPages} · {totalElements} cobranças
              </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => goToPage(page - 1)} disabled={page === 0}
                          style={{ padding: '5px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', fontSize: 13, color: page === 0 ? '#d1d5db' : '#374151' }}>
                    ← Anterior
                  </button>
                  <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
                          style={{ padding: '5px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', fontSize: 13, color: page >= totalPages - 1 ? '#d1d5db' : '#374151' }}>
                    Próximo →
                  </button>
                </div>
              </div>
          )}
        </div>
      </div>
  )
}