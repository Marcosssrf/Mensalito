import React, {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import api from '@/services/api'

interface Address {
  zipCode: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

interface Student {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  active: boolean
  createdAt: string
  address: Address | null
  paymentPreference: 'PIX' | 'BOLETO' | null
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

function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5,
}

const emptyAddress: Address = {
  zipCode: '', street: '', number: '', complement: '',
  neighborhood: '', city: '', state: '',
}

interface StudentFormData {
  name: string
  email: string
  phone: string
  document: string
  address: Address
  paymentPreference: 'PIX' | 'BOLETO' | ''
}

function StudentEditModal({
                            student,
                            onClose,
                            onSaved,
                          }: {
  student: Student
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<StudentFormData>({
    name: student.name,
    email: student.email ?? '',
    phone: student.phone ?? '',
    document: student.document ?? '',
    address: student.address ?? { ...emptyAddress },
    paymentPreference: student.paymentPreference ?? '',
  })
  const [loadingCep, setLoadingCep] = useState(false)
  const [cepError, setCepError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setAddr(field: keyof Address, value: string) {
    setForm(f => ({ ...f, address: { ...f.address, [field]: value } }))
  }

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 8) { setCepError(''); return }
    setLoadingCep(true); setCepError('')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        setCepError('CEP não encontrado')
      } else {
        setForm(f => ({
          ...f,
          address: {
            ...f.address,
            zipCode: `${digits.slice(0, 5)}-${digits.slice(5)}`,
            street: data.logradouro ?? f.address.street,
            neighborhood: data.bairro ?? f.address.neighborhood,
            city: data.localidade ?? f.address.city,
            state: data.uf ?? f.address.state,
          },
        }))
      }
    } catch { setCepError('Erro ao buscar CEP') } finally { setLoadingCep(false) }
  }

  async function submit() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      const hasAddress = Object.values(form.address).some(v => v.trim() !== '')
      const payload = { ...form, address: hasAddress ? form.address : null, paymentPreference: form.paymentPreference || null }
      await api.patch(`/students/${student.id}`, payload)
      onSaved(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erro ao salvar aluno')
    } finally { setLoading(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 560, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Editar aluno</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Atualize os dados do aluno.</p>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

          <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 12 }}>DADOS PESSOAIS</p>

          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Nome completo *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                   placeholder="Ex: João da Silva" style={inp} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={lbl}>E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                     placeholder="joao@email.com" style={inp} />
            </div>
            <div>
              <label style={lbl}>Telefone</label>
              <input type="text" value={form.phone}
                     onChange={e => setForm(f => ({ ...f, phone: maskPhone(e.target.value) }))}
                     placeholder="(21) 99999-9999" maxLength={15} style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>CPF / Documento</label>
            <input type="text" value={form.document}
                   onChange={e => setForm(f => ({ ...f, document: maskDocument(e.target.value) }))}
                   placeholder="000.000.000-00" maxLength={18} style={inp} />
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 12 }}>ENDEREÇO</p>

            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>CEP</label>
                <input type="text" value={form.address.zipCode}
                       onChange={e => { const v = maskZip(e.target.value); setAddr('zipCode', v); lookupCep(v) }}
                       placeholder="00000-000" maxLength={9}
                       style={{ ...inp, borderColor: cepError && !loadingCep ? '#fca5a5' : '#e5e7eb' }} />
                {loadingCep && <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>Buscando...</span>}
                {cepError && !loadingCep && <span style={{ fontSize: 11, color: '#ef4444', marginTop: 4, display: 'block' }}>{cepError}</span>}
              </div>
              <div>
                <label style={lbl}>Bairro</label>
                <input type="text" value={form.address.neighborhood}
                       onChange={e => setAddr('neighborhood', e.target.value)}
                       placeholder="Bairro" style={inp} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Rua / Logradouro</label>
                <input type="text" value={form.address.street}
                       onChange={e => setAddr('street', e.target.value)}
                       placeholder="Rua das Flores" style={inp} />
              </div>
              <div>
                <label style={lbl}>Número</label>
                <input type="text" value={form.address.number}
                       onChange={e => setAddr('number', e.target.value)}
                       placeholder="123" style={inp} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Complemento</label>
              <input type="text" value={form.address.complement}
                     onChange={e => setAddr('complement', e.target.value)}
                     placeholder="Apto 42, Bloco B..." style={inp} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
              <div>
                <label style={lbl}>Cidade</label>
                <input type="text" value={form.address.city}
                       onChange={e => setAddr('city', e.target.value)}
                       placeholder="São Paulo" style={inp} />
              </div>
              <div>
                <label style={lbl}>UF</label>
                <input type="text" value={form.address.state}
                       onChange={e => setAddr('state', e.target.value.toUpperCase().slice(0, 2))}
                       placeholder="SP" maxLength={2} style={inp} />
              </div>
            </div>
          </div>

          {/* ── Preferência de pagamento ── */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 12 }}>PREFERÊNCIA DE PAGAMENTO</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {([['', 'Sem preferência'], ['PIX', 'PIX'], ['BOLETO', 'Boleto']] as const).map(([val, label]) => {
                const selected = form.paymentPreference === val
                return (
                    <button
                        key={val}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, paymentPreference: val }))}
                        style={{
                          padding: '10px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          border: selected ? '2px solid #111827' : '1.5px solid #e5e7eb',
                          background: selected ? '#111827' : '#fff',
                          color: selected ? '#fff' : '#6b7280',
                          transition: 'all 0.15s',
                        }}
                    >
                      {val === 'PIX' && <span style={{ marginRight: 5 }}>⚡</span>}
                      {val === 'BOLETO' && <span style={{ marginRight: 5 }}>🏦</span>}
                      {label}
                    </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Cancelar</button>
            <button onClick={submit} disabled={loading}
                    style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600 }}>
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
  )
}

function NewChargeModal({
                          studentId: _studentId,
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
  const [showEdit, setShowEdit] = useState(false)

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
        {showEdit && (
            <StudentEditModal
                student={student}
                onClose={() => setShowEdit(false)}
                onSaved={loadData}
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
                  onClick={() => setShowEdit(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', border: '1px solid #e5e7eb',
                    borderRadius: 8, background: '#fff', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, color: '#374151',
                  }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Editar
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
                {student.document && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/>
                        <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/>
                      </svg>
                      <span style={{ fontSize: 13, color: '#374151' }}>{student.document}</span>
                    </div>
                )}
                {student.paymentPreference && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                        background: student.paymentPreference === 'PIX' ? '#ede9fe' : '#dbeafe',
                        color: student.paymentPreference === 'PIX' ? '#7c3aed' : '#2563eb',
                        display: 'inline-block',
                      }}>
                    {student.paymentPreference === 'PIX' ? '⚡ PIX' : '🏦 Boleto'}
                  </span>
                    </div>
                )}
                {student.address && (student.address.street || student.address.city) && (
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, marginTop: 4 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 8 }}>ENDEREÇO</p>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24" style={{ marginTop: 2, flexShrink: 0 }}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {student.address.street && (
                              <span style={{ fontSize: 13, color: '#374151' }}>
                          {student.address.street}{student.address.number ? `, ${student.address.number}` : ''}
                                {student.address.complement ? ` — ${student.address.complement}` : ''}
                        </span>
                          )}
                          {student.address.neighborhood && (
                              <span style={{ fontSize: 12, color: '#6b7280' }}>{student.address.neighborhood}</span>
                          )}
                          {(student.address.city || student.address.state) && (
                              <span style={{ fontSize: 12, color: '#6b7280' }}>
                          {[student.address.city, student.address.state].filter(Boolean).join(' — ')}
                                {student.address.zipCode ? ` · ${student.address.zipCode}` : ''}
                        </span>
                          )}
                        </div>
                      </div>
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