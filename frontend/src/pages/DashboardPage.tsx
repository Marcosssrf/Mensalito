import {useEffect, useRef, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import api from '@/services/api'

// ── tipos ──────────────────────────────────────────────────────────────────

interface DashboardData {
  expectedRevenue: number
  receivedRevenue: number
  overdueRevenue: number
  totalActiveStudents: number
  totalPendingCharges: number
  totalPaidCharges: number
  totalOverdueCharges: number
}

interface Charge {
  id: string
  studentName: string
  amount: number
  dueDate: string
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED' | 'LOST' | 'DISPUTED'
  paymentDate: string | null
  pixCode: string | null
  boletoUrl: string | null
  ticketUrl: string | null
  checkoutUrl: string | null
  createdAt: string
  manual: boolean | null
}

interface Student {
  id: string
  name: string
  email: string | null
  active: boolean
}

interface Enrollment {
  id: string
  studentName: string
  className: string
  planName: string
  amount: number
  active: boolean
}

// ── constantes ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Pendente',    color: '#d97706' },
  PAID:      { label: 'Pago',        color: '#059669' },
  OVERDUE:   { label: 'Atrasado',    color: '#dc2626' },
  CANCELLED: { label: 'Cancelado',   color: '#6b7280' },
  REFUNDED:  { label: 'Reembolsado', color: '#2563eb' },
  LOST:      { label: 'Perdido',     color: '#6b7280' },
  DISPUTED:  { label: 'Disputado',   color: '#ea580c' },
}

// ── helpers ────────────────────────────────────────────────────────────────

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

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── WAStatusBtn ────────────────────────────────────────────────────────────

function WAStatusBtn() {
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const url  = localStorage.getItem('evo_url')
    const key  = localStorage.getItem('evo_key')
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

interface StudentAutocompleteProps {
  students: Student[]
  value: Student | null
  onChange: (s: Student | null) => void
  disabled?: boolean
}

function StudentAutocomplete({ students, value, onChange, disabled }: StudentAutocompleteProps) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen]   = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value?.name ?? '') }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(value?.name ?? '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value])

  const filtered = students
      .filter((s) => s.active && s.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8)

  const handleSelect = (s: Student) => {
    onChange(s)
    setQuery(s.name)
    setOpen(false)
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setOpen(true)
    if (!e.target.value) onChange(null)
  }

  return (
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <svg
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
              disabled={disabled}
              value={query}
              onChange={handleInput}
              onFocus={() => setOpen(true)}
              placeholder="Digite o nome do aluno..."
              style={{ ...inputStyle, paddingLeft: 34 }}
              autoComplete="off"
          />
          {value && (
              <button
                  onClick={() => { onChange(null); setQuery(''); setOpen(false) }}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2,
                  }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
          )}
        </div>

        {open && filtered.length > 0 && (
            <ul style={{
              position: 'absolute', zIndex: 200, top: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', margin: 0, padding: '4px 0',
              listStyle: 'none', maxHeight: 220, overflowY: 'auto',
            }}>
              {filtered.map((s) => (
                  <li
                      key={s.id}
                      onMouseDown={() => handleSelect(s)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px', cursor: 'pointer', fontSize: 14, color: '#111827',
                        background: value?.id === s.id ? '#f9fafb' : '#fff',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = value?.id === s.id ? '#f9fafb' : '#fff')}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', background: '#f3f4f6', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#374151',
                    }}>
                      {initials(s.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                      {s.email && <div style={{ fontSize: 12, color: '#9ca3af' }}>{s.email}</div>}
                    </div>
                    {value?.id === s.id && (
                        <svg style={{ color: '#059669', flexShrink: 0 }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                    )}
                  </li>
              ))}
            </ul>
        )}

        {open && query.length > 1 && filtered.length === 0 && (
            <div style={{
              position: 'absolute', zIndex: 200, top: 'calc(100% + 4px)', left: 0, right: 0,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
              padding: '14px 16px', fontSize: 13, color: '#9ca3af', textAlign: 'center',
            }}>
              Nenhum aluno encontrado para "{query}"
            </div>
        )}
      </div>
  )
}

interface ManualChargeModalProps {
  students: Student[]
  onClose: () => void
  onSuccess: () => void
}

type ModalStep = 'student' | 'enrollment' | 'payment'

const PAYMENT_METHODS = [
  { value: 'DINHEIRO', label: 'Dinheiro', icon: '💵' },
  { value: 'CARTAO',   label: 'Cartão',   icon: '💳' },
  { value: 'PIX',      label: 'PIX',      icon: '⚡' },
]

// Methods that bypass the payment gateway — mark as PAID directly

function ManualChargeModal({ students, onClose, onSuccess }: ManualChargeModalProps) {
  const [step, setStep]               = useState<ModalStep>('student')
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loadingEnroll, setLoadingEnroll] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null)
  const [dueDate, setDueDate]         = useState(todayISO())
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  // Passo 1 → 2: buscar matrículas do aluno selecionado
  const handleNextStep = async () => {
    if (!selectedStudent) { setError('Selecione um aluno.'); return }
    setError(null)
    setLoadingEnroll(true)
    try {
      const res = await api.get<Enrollment[]>(`/enrollments/student/${selectedStudent.id}`)
      const active = (res.data ?? []).filter((e) => e.active)
      if (active.length === 0) {
        setError('Este aluno não possui matrículas ativas.')
        return
      }
      setEnrollments(active)
      setSelectedEnrollment(active.length === 1 ? active[0] : null)
      setStep('enrollment')
    } catch {
      setError('Erro ao buscar matrículas do aluno.')
    } finally {
      setLoadingEnroll(false)
    }
  }

  // Passo 2 → 3: ir para pagamento
  const handleNextToPayment = () => {
    if (!selectedEnrollment) { setError('Selecione uma matrícula.'); return }
    if (!dueDate) { setError('Informe a data de vencimento.'); return }
    setError(null)
    setStep('payment')
  }

  // Passo 3: criar cobrança manual diretamente como paga
  const handleSubmit = async () => {
    if (!selectedEnrollment) { setError('Selecione uma matrícula.'); return }
    setError(null)
    setSaving(true)
    try {
      // Cria a cobrança manual (status PENDING)
      const res = await api.post('/charges/manual', {
        enrollmentId: selectedEnrollment.id,
        dueDate,
      })
      // Confirma o pagamento imediatamente com o meio escolhido
      await api.patch(`/charges/${res.data.id}/confirm-payment`, {
        paymentMethod,
        paymentDate: dueDate,
      })
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erro ao criar cobrança.')
    } finally {
      setSaving(false)
    }
  }

  return (
      <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(2px)',
          }}
      >
        <div style={{
          background: '#fff', borderRadius: 16, width: 560, maxWidth: '92vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          padding: '28px 32px',
          animation: 'slideUp 0.18s ease',
        }}>

          {/* ── cabeçalho ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                Lançar cobrança manual
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                Cria uma cobrança avulsa vinculada a uma matrícula ativa.
              </p>
            </div>
            <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6 }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* ── stepper ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
            {/* passo 1 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: step === 'student' ? '#111827' : '#f0fdf4',
              color: step === 'student' ? '#fff' : '#059669',
            }}>
              {step !== 'student'
                  ? <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  : <span>1</span>
              }
              Aluno
            </div>
            <span style={{ color: '#d1d5db' }}>›</span>
            {/* passo 2 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: step === 'enrollment' ? '#111827' : step === 'payment' ? '#f0fdf4' : '#f3f4f6',
              color: step === 'enrollment' ? '#fff' : step === 'payment' ? '#059669' : '#9ca3af',
            }}>
              {step === 'payment'
                  ? <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                  : <span>2</span>
              }
              Matrícula &amp; Vencimento
            </div>
            <span style={{ color: '#d1d5db' }}>›</span>
            {/* passo 3 */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: step === 'payment' ? '#111827' : '#f3f4f6',
              color: step === 'payment' ? '#fff' : '#9ca3af',
            }}>
              <span>3</span>
              Pagamento
            </div>
          </div>

          {/* ── passo 1: selecionar aluno ── */}
          {step === 'student' && (
              <>
                <label style={labelStyle}>Aluno</label>
                <StudentAutocomplete
                    students={students}
                    value={selectedStudent}
                    onChange={(s) => { setSelectedStudent(s); setError(null) }}
                />

                {selectedStudent && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px',
                      background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', background: '#e5e7eb', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#374151',
                      }}>
                        {initials(selectedStudent.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{selectedStudent.name}</div>
                        {selectedStudent.email && <div style={{ fontSize: 12, color: '#6b7280' }}>{selectedStudent.email}</div>}
                      </div>
                      <svg style={{ marginLeft: 'auto', color: '#059669' }} width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                )}
              </>
          )}

          {/* ── passo 2: selecionar matrícula + data ── */}
          {step === 'enrollment' && (
              <>
                {/* breadcrumb do aluno */}
                <div style={{
                  marginBottom: 16, padding: '8px 12px',
                  background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb',
                  fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center',
                }}>
                  <span style={{ color: '#9ca3af', marginRight: 4 }}>Aluno:</span>
                  <strong>{selectedStudent?.name}</strong>
                  <button
                      onClick={() => { setStep('student'); setSelectedEnrollment(null); setError(null) }}
                      style={{ marginLeft: 'auto', fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Alterar
                  </button>
                </div>

                <label style={labelStyle}>Matrícula ativa</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {enrollments.map((e) => {
                    const selected = selectedEnrollment?.id === e.id
                    return (
                        <label
                            key={e.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                              border: `2px solid ${selected ? '#111827' : '#e5e7eb'}`,
                              borderRadius: 10, cursor: 'pointer',
                              background: selected ? '#fafafa' : '#fff',
                              transition: 'border-color 0.12s',
                            }}
                        >
                          <input
                              type="radio"
                              name="enrollment"
                              checked={selected}
                              onChange={() => { setSelectedEnrollment(e); setError(null) }}
                              style={{ accentColor: '#111827', width: 16, height: 16, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{e.className}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{e.planName}</div>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>{fmt(e.amount)}</div>
                        </label>
                    )
                  })}
                </div>

                <label style={{ ...labelStyle, marginTop: 20 }}>Data de vencimento</label>
                <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={inputStyle}
                />
              </>
          )}

          {/* ── passo 3: meio de pagamento ── */}
          {step === 'payment' && (
              <>
                {/* resumo */}
                <div style={{
                  marginBottom: 20, padding: '12px 14px',
                  background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb',
                  fontSize: 13, color: '#374151',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#9ca3af' }}>Aluno</span>
                    <strong>{selectedStudent?.name}</strong>
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

                <label style={{ ...labelStyle, marginTop: 0 }}>Como foi recebido?</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {PAYMENT_METHODS.map(m => (
                      <button
                          key={m.value}
                          onClick={() => setPaymentMethod(m.value)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                            border: paymentMethod === m.value ? '2px solid #111827' : '2px solid #e5e7eb',
                            background: paymentMethod === m.value ? '#f9fafb' : '#fff',
                            fontSize: 14, fontWeight: paymentMethod === m.value ? 600 : 400,
                            color: '#111827', transition: 'all 0.12s',
                          }}
                      >
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
                  Este pagamento será registrado manualmente e confirmado como <strong>Pago</strong> sem processar pelo gateway.
                </div>
              </>
          )}

          {/* ── erro ── */}
          {error && (
              <div style={{
                marginTop: 12, padding: '9px 13px',
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, fontSize: 13, color: '#dc2626',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
          )}

          {/* ── botões ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button onClick={onClose} style={{ ...btnStyle, color: '#374151' }}>
              Cancelar
            </button>

            {step === 'student' && (
                <button
                    onClick={handleNextStep}
                    disabled={!selectedStudent || loadingEnroll}
                    style={primaryBtnStyle(!selectedStudent || loadingEnroll)}
                >
                  {loadingEnroll
                      ? <><Spinner /> Buscando...</>
                      : 'Próximo →'
                  }
                </button>
            )}

            {step === 'enrollment' && (
                <>
                  <button onClick={() => setStep('student')} style={{ ...btnStyle, color: '#374151' }}>
                    ← Voltar
                  </button>
                  <button
                      onClick={handleNextToPayment}
                      disabled={!selectedEnrollment}
                      style={primaryBtnStyle(!selectedEnrollment)}
                  >
                    Próximo →
                  </button>
                </>
            )}

            {step === 'payment' && (
                <>
                  <button onClick={() => setStep('enrollment')} style={{ ...btnStyle, color: '#374151' }}>
                    ← Voltar
                  </button>
                  <button
                      onClick={handleSubmit}
                      disabled={saving}
                      style={primaryBtnStyle(saving)}
                  >
                    {saving
                        ? <><Spinner /> Confirmando...</>
                        : '✓ Confirmar como Pago'
                    }
                  </button>
                </>
            )}
          </div>
        </div>

        <style>{`
        @keyframes slideUp {
          from { opacity:0; transform:translateY(16px) scale(0.98); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
      `}</style>
      </div>
  )
}

function Spinner() {
  return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
  )
}

// ── DashboardPage ──────────────────────────────────────────────────────────

type Tab = 'Todos' | 'Inadimplentes' | 'Pagos'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [dash, setDash]         = useState<DashboardData | null>(null)
  const [charges, setCharges]   = useState<Charge[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>('Todos')
  const [search, setSearch]     = useState('')
  const [showModal, setShowModal] = useState(false)

  const userName = localStorage.getItem('userName') ?? 'Usuário'

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get<DashboardData>('/dashboard'),
      api.get('/charges?page=0&size=20&sort=dueDate,desc'),
      // GET /api/students — Pageable, retorna Page<StudentResponseDTO>
      api.get('/students?page=0&size=500&sort=name,asc'),
    ])
        .then(([d, c, s]) => {
          setDash(d.data)
          const rawC = c.data as any
          setCharges(Array.isArray(rawC) ? rawC : (rawC?.content ?? []))
          const rawS = s.data as any
          setStudents(Array.isArray(rawS) ? rawS : (rawS?.content ?? []))
        })
        .catch(console.error)
        .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const filtered = (Array.isArray(charges) ? charges : []).filter((c) => {
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
          : (0).toFixed(1)

  const kpis = [
    {
      label: 'RECEITA PREVISTA',
      value: loading ? '—' : fmt(dash?.expectedRevenue ?? 0),
      sub: '↗ +4,2% vs. mês anterior',
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
      sub: `${dash?.totalPendingCharges ?? 0} pendentes este mês`,
      subColor: '#6b7280',
    },
  ]

  return (
      <>
        {showModal && (
            <ManualChargeModal
                students={students}
                onClose={() => setShowModal(false)}
                onSuccess={loadData}
            />
        )}

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

            <button onClick={() => setShowModal(true)} style={btnStyle}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Lançar cobrança manual
            </button>

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
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar aluno ou turma..."
                    style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', width: 220 }}
                />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: st.color, fontWeight: 500 }}>{st.label}</span>
                      {c.manual && (
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
                            background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb',
                          }}>Manual</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.checkoutUrl && (
                          <a href={c.checkoutUrl} target="_blank" rel="noreferrer"
                             style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                            Link
                          </a>
                      )}
                      {c.pixCode && !c.pixCode.startsWith('MANUAL:') && c.status !== 'CANCELLED' && (
                          <button onClick={() => navigator.clipboard.writeText(c.pixCode!)}
                                  style={{ fontSize: 12, color: '#6b7280', padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer' }}>
                            PIX
                          </button>
                      )}
                      {c.ticketUrl && c.status !== 'CANCELLED' && (
                          <a href={c.ticketUrl} target="_blank" rel="noreferrer"
                             style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none', padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                            Boleto
                          </a>
                      )}
                    </div>
                  </div>
              )
            })}
          </div>
        </div>
      </>
  )
}

// ── estilos compartilhados ─────────────────────────────────────────────────

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '9px 16px', border: '1px solid #e5e7eb',
  borderRadius: 8, background: '#fff', cursor: 'pointer',
  fontSize: 13, fontWeight: 500, color: '#374151',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 500,
  color: '#374151', marginBottom: 6, marginTop: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: 8, fontSize: 14, color: '#111827',
  outline: 'none', background: '#fff',
}

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '9px 20px', borderRadius: 8, border: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer',
  background: disabled ? '#9ca3af' : '#111827',
  color: '#fff', fontSize: 13, fontWeight: 600,
  opacity: disabled ? 0.75 : 1,
  transition: 'opacity 0.15s',
})