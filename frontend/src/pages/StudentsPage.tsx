import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import api from '@/services/api'

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

function maskZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

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

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function fmtDate(s: string | null) {
  if (!s) return '—'
  const [date] = s.split('T')
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

type Tab = 'Todos' | 'Ativos' | 'Inativos'

interface StudentFormData {
  name: string
  email: string
  phone: string
  document: string
  address: Address
  paymentPreference: 'PIX' | 'BOLETO' | ''
}

const emptyAddress: Address = {
  zipCode: '', street: '', number: '', complement: '',
  neighborhood: '', city: '', state: '',
}

const PAGE_SIZE = 20

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5,
}

function StudentModal({
                        initial,
                        onClose,
                        onSaved,
                      }: {
  initial?: Student
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<StudentFormData>({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    document: initial?.document ?? '',
    address: initial?.address ?? { ...emptyAddress },
    paymentPreference: initial?.paymentPreference ?? '',
  })
  const [loadingCep, setLoadingCep] = useState(false)
  const [cepError, setCepError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initial

  function setAddr(field: keyof Address, value: string) {
    setForm(f => ({ ...f, address: { ...f.address, [field]: value } }))
  }

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 8) { setCepError(''); return }
    setLoadingCep(true)
    setCepError('')
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
            zipCode: `${digits.slice(0,5)}-${digits.slice(5)}`,
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
      const payload = {
        ...form,
        address: hasAddress ? form.address : null,
        paymentPreference: form.paymentPreference || null,
      }
      if (isEdit) {
        await api.patch(`/students/${initial!.id}`, payload)
      } else {
        await api.post('/students', payload)
      }
      onSaved(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erro ao salvar aluno')
    } finally { setLoading(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 560, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            {isEdit ? 'Editar aluno' : 'Adicionar aluno'}
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            {isEdit ? 'Atualize os dados do aluno.' : 'Preencha os dados do novo aluno.'}
          </p>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}

          {/* ── Dados pessoais ── */}
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
                   placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18} style={inp} />
          </div>

          {/* ── Endereço ── */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20, marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 12 }}>ENDEREÇO</p>

            {/* CEP */}
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>CEP</label>
                <input
                    type="text"
                    value={form.address.zipCode}
                    onChange={e => {
                      const v = maskZip(e.target.value)
                      setAddr('zipCode', v)
                      lookupCep(v)
                    }}
                    placeholder="00000-000"
                    maxLength={9}
                    style={{ ...inp, borderColor: cepError && !loadingCep ? '#fca5a5' : '#e5e7eb' }}
                />
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

            {/* Rua + número */}
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

            {/* Complemento */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Complemento</label>
              <input type="text" value={form.address.complement}
                     onChange={e => setAddr('complement', e.target.value)}
                     placeholder="Apto 42, Bloco B..." style={inp} />
            </div>

            {/* Cidade + Estado */}
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
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </div>
      </div>
  )
}

export default function StudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Todos')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; student?: Student }>({ open: false })

  // Paginação
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)

  function load(p = page) {
    setLoading(true)
    api.get(`/students?page=${p}&size=${PAGE_SIZE}&sort=name,asc`)
        .then((r) => {
          const raw = r.data as any
          const content: Student[] = Array.isArray(raw) ? raw : (raw?.content ?? [])
          setStudents(content)
          setTotalPages(raw?.totalPages ?? 1)
          setTotalElements(raw?.totalElements ?? content.length)
          setPage(raw?.number ?? p)
        })
        .catch(console.error)
        .finally(() => setLoading(false))
  }

  useEffect(() => { load(0) }, [])

  async function deactivate(id: string) {
    await api.patch(`/students/${id}/deactivate`)
    load(page)
  }

  async function reactivate(id: string) {
    await api.patch(`/students/${id}/reactivate`)
    load(page)
  }

  const filtered = (Array.isArray(students) ? students : []).filter((s) => {
    const tabOk = tab === 'Todos' || (tab === 'Ativos' && s.active) || (tab === 'Inativos' && !s.active)
    const q = search.toLowerCase()
    return tabOk && (s.name.toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q))
  })

  function goToPage(p: number) {
    if (p < 0 || p >= totalPages) return
    load(p)
  }

  return (
      <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {modal.open && (
            <StudentModal
                initial={modal.student}
                onClose={() => setModal({ open: false })}
                onSaved={() => load(page)}
            />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>CADASTRO</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Alunos</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>{totalElements} aluno{totalElements !== 1 ? 's' : ''} no total</p>
          </div>
          <button onClick={() => setModal({ open: true })}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#111827', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Adicionar aluno
          </button>
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['Todos', 'Ativos', 'Inativos'] as Tab[]).map((t) => (
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nome, e-mail..."
                     style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', width: 240 }} />
            </div>
          </div>

          {/* Cabeçalho */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 0.8fr', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {['ALUNO', 'CONTATO', 'CADASTRO', 'STATUS', 'AÇÕES'].map((h) => (
                <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
          ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Nenhum aluno encontrado.</div>
          ) : filtered.map((s, i) => (
              <div key={s.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 0.8fr',
                padding: '16px 20px', alignItems: 'center', background: '#fff',
                borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                    {initials(s.name)}
                  </div>
                  <span
                      onClick={() => navigate(`/app/students/${s.id}`)}
                      style={{ fontSize: 14, fontWeight: 600, color: '#111827', cursor: 'pointer', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                  >{s.name}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {s.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{s.email}</span>
                      </div>
                  )}
                  {s.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.08 6.08l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{maskPhone(s.phone)}</span>
                      </div>
                  )}
                  {s.address && (s.address.city || s.address.state) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                          {[s.address.city, s.address.state].filter(Boolean).join(' — ')}
                        </span>
                      </div>
                  )}
                </div>

                <span style={{ fontSize: 13, color: '#6b7280' }}>{fmtDate(s.createdAt)}</span>

                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: s.active ? '#dcfce7' : '#f3f4f6',
                  color: s.active ? '#16a34a' : '#9ca3af',
                  display: 'inline-block', width: 'fit-content',
                }}>
              {s.active ? 'Ativo' : 'Inativo'}
            </span>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setModal({ open: true, student: s })}
                          style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                    Editar
                  </button>
                  {s.active ? (
                      <button onClick={() => deactivate(s.id)}
                              style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #fecaca', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#ef4444' }}>
                        Desativar
                      </button>
                  ) : (
                      <button onClick={() => reactivate(s.id)}
                              style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #bbf7d0', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#16a34a' }}>
                        Reativar
                      </button>
                  )}
                </div>
              </div>
          ))}

          {/* Paginação */}
          {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#fff' }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                Página {page + 1} de {totalPages} · {totalElements} alunos
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