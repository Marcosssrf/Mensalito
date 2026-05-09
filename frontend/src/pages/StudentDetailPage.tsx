import {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import api from '@/services/api'

interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  active: boolean
  createdAt: string
}

interface Charge {
  id: string
  studentName: string
  amount: number
  dueDate: string
  status: string
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
  startDate: string
  endDate: string | null
  active: boolean
  createdAt: string
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  const [date] = s.split('T')
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

function fmtMonth(dueDate: string) {
  const [y, m] = dueDate.split('-')
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  return `${months[parseInt(m) - 1]}/${y}`
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: 'Pendente',  color: '#d97706', bg: '#fef3c7' },
  PAID:      { label: 'Pago',      color: '#059669', bg: '#dcfce7' },
  OVERDUE:   { label: 'Atrasado',  color: '#dc2626', bg: '#fee2e2' },
  CANCELLED: { label: 'Cancelado', color: '#6b7280', bg: '#f3f4f6' },
  REFUNDED:  { label: 'Reembolsado', color: '#2563eb', bg: '#dbeafe' },
  LOST:      { label: 'Perdido',   color: '#6b7280', bg: '#f3f4f6' },
  DISPUTED:  { label: 'Disputado', color: '#ea580c', bg: '#ffedd5' },
}

function paymentMethodLabel(charge: Charge): string {
  if (charge.pixCode) return 'PIX'
  if (charge.boletoUrl) return 'Boleto'
  if (charge.checkoutUrl) return 'Checkout'
  return 'Manual'
}

// Activity timeline item
interface ActivityItem {
  icon: 'payment' | 'whatsapp' | 'charge' | 'enrollment'
  text: string
  date: string
  color: string
  bg: string
}

function buildActivities(charges: Charge[], enrollments: Enrollment[]): ActivityItem[] {
  const items: ActivityItem[] = []

  charges.slice(0, 5).forEach(c => {
    if (c.status === 'PAID' && c.paymentDate) {
      items.push({
        icon: 'payment',
        text: `Pagamento confirmado · ${fmt(c.amount)}`,
        date: fmtDate(c.paymentDate) + ' às 00:00',
        color: '#059669',
        bg: '#dcfce7',
      })
    }
    items.push({
      icon: 'charge',
      text: `Cobrança gerada · ${fmtMonth(c.dueDate)}`,
      date: fmtDate(c.createdAt) + ' às 00:01',
      color: '#6b7280',
      bg: '#f3f4f6',
    })
  })

  enrollments.forEach(e => {
    items.push({
      icon: 'enrollment',
      text: `Matriculado em ${e.className} — ${e.planName}`,
      date: fmtDate(e.createdAt),
      color: '#7c3aed',
      bg: '#ede9fe',
    })
  })

  return items.slice(0, 8)
}

function NewChargeModal({
  studentId,
  onClose,
  onCreated,
}: {
  studentId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    enrollmentId: '',
    dueDate: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<any>('/enrollments')
      .then(r => {
        const data: Enrollment[] = Array.isArray(r.data) ? r.data : (r.data?.content ?? [])
        setEnrollments(data.filter(e => e.active))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function submit() {
    if (!form.enrollmentId) { setError('Selecione uma matrícula'); return }
    setSaving(true); setError('')
    try {
      await api.post('/charges', form)
      onCreated(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Erro ao criar cobrança')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Nova cobrança</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Crie uma cobrança avulsa para este aluno.</p>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}
        {loading ? (
          <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Carregando...</p>
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
                  <option key={e.id} value={e.id}>{e.className} — {e.planName} ({fmt(e.amount)})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Data de vencimento *</label>
              <input
                type="date" value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Cancelar</button>
          <button onClick={submit} disabled={saving || loading}
            style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Criando...' : 'Criar cobrança'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [student, setStudent] = useState<Student | null>(null)
  const [charges, setCharges] = useState<Charge[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewCharge, setShowNewCharge] = useState(false)

  function loadData() {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.get(`/students/${id}`),
      api.get(`/charges?size=20&sort=dueDate,desc`),
      api.get('/enrollments'),
    ]).then(([sRes, cRes, eRes]) => {
      setStudent(sRes.data)

      const chargesRaw = cRes.data as any
      const allCharges: Charge[] = Array.isArray(chargesRaw) ? chargesRaw : (chargesRaw?.content ?? [])
      const studentCharges = allCharges.filter(c => c.studentName === (sRes.data as Student).name)
      setCharges(studentCharges)

      const enrollmentsRaw = eRes.data as any
      const allEnrollments: Enrollment[] = Array.isArray(enrollmentsRaw) ? enrollmentsRaw : (enrollmentsRaw?.content ?? [])
      const studentEnrollments = allEnrollments.filter(e => e.studentName === (sRes.data as Student).name)
      setEnrollments(studentEnrollments)
    }).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [id])

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
  if (!student) return <div style={{ padding: 60, textAlign: 'center', color: '#dc2626' }}>Aluno não encontrado.</div>

  const totalPaid = charges.filter(c => c.status === 'PAID').reduce((s, c) => s + Number(c.amount), 0)
  const paidOnTime = charges.filter(c => c.status === 'PAID').length
  const totalCharges = charges.length
  const activeEnrollment = enrollments.find(e => e.active)
  const nextDue = activeEnrollment
    ? (() => {
        const today = new Date()
        const dueDay = charges[0]?.dueDate?.split('-')[2] ?? '05'
        const next = new Date(today.getFullYear(), today.getMonth() + 1, parseInt(dueDay))
        return `${String(next.getDate()).padStart(2, '0')}/${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`
      })()
    : '—'

  const activities = buildActivities(charges, enrollments)

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1300, margin: '0 auto' }}>
      {showNewCharge && (
        <NewChargeModal
          studentId={student.id}
          onClose={() => setShowNewCharge(false)}
          onCreated={loadData}
        />
      )}

      {/* Breadcrumb + header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => navigate('/app/students')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: 0, marginBottom: 8 }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar para alunos
        </button>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>ALUNO</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>{student.name}</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Histórico de pagamentos, contato e linha do tempo de atividades.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', border: '1px solid #e5e7eb',
                borderRadius: 8, background: '#fff', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, color: '#374151',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Mensagem
            </button>
            <button
              onClick={() => setShowNewCharge(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 16px', border: 'none',
                borderRadius: 8, background: '#111827', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, color: '#fff',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Nova cobrança
            </button>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile card */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#111827', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {initials(student.name)}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{student.name}</p>
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                  Aluno desde {fmtDate(student.createdAt)}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {student.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#374151' }}>{student.email}</span>
                </div>
              )}
              {student.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#374151' }}>{maskPhone(student.phone)}</span>
                </div>
              )}
              {activeEnrollment && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    Vencimento dia {charges[0]?.dueDate?.split('-')[2] ?? '—'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Financial summary */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 18px' }}>Resumo financeiro</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Mensalidade</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {activeEnrollment ? fmt(activeEnrollment.amount) : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Total pago ({totalCharges}m)</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{fmt(totalPaid)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Pagamentos no prazo</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  {paidOnTime}/{totalCharges}
                </span>
              </div>
              <div style={{ height: 1, background: '#f3f4f6' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Próximo vencimento</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{nextDue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Payment history */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Histórico de pagamentos</h3>
            </div>
            <div style={{ padding: '0 24px' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.8fr', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                {['MÊS', 'VALOR', 'PAGO EM', 'MÉTODO', 'STATUS'].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>{h}</span>
                ))}
              </div>
              {charges.length === 0 ? (
                <p style={{ padding: '24px 0', color: '#9ca3af', fontSize: 14, textAlign: 'center' }}>Nenhuma cobrança encontrada.</p>
              ) : charges.slice(0, 12).map((c, i) => {
                const st = STATUS_META[c.status] ?? { label: c.status, color: '#6b7280', bg: '#f3f4f6' }
                return (
                  <div key={c.id} style={{
                    display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.8fr',
                    padding: '14px 0', alignItems: 'center',
                    borderBottom: i < charges.slice(0, 12).length - 1 ? '1px solid #f9fafb' : 'none',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>{fmtMonth(c.dueDate)}</span>
                    <span style={{ fontSize: 14, color: '#374151' }}>{fmt(Number(c.amount))}</span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{c.paymentDate ? fmtDate(c.paymentDate) : '—'}</span>
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{paymentMethodLabel(c)}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                      background: st.bg, color: st.color,
                      display: 'inline-block', width: 'fit-content',
                    }}>{st.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Activity timeline */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Atividade</h3>
            </div>
            <div style={{ padding: '8px 24px 20px' }}>
              {activities.length === 0 ? (
                <p style={{ padding: '16px 0', color: '#9ca3af', fontSize: 14 }}>Nenhuma atividade registrada.</p>
              ) : activities.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < activities.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: a.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {a.icon === 'payment' && (
                      <svg width="14" height="14" fill="none" stroke={a.color} strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    )}
                    {a.icon === 'charge' && (
                      <svg width="14" height="14" fill="none" stroke={a.color} strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    )}
                    {a.icon === 'enrollment' && (
                      <svg width="14" height="14" fill="none" stroke={a.color} strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    )}
                    {a.icon === 'whatsapp' && (
                      <svg width="14" height="14" fill="none" stroke={a.color} strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{a.text}</p>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
