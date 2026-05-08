import {useEffect, useState} from 'react'
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
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initial

  async function submit() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      if (isEdit) {
        // PATCH /api/students/{id}  body: StudentRequestDTO { name, email, phone, document }
        await api.patch(`/students/${initial!.id}`, form)
      } else {
        // POST /api/students
        await api.post('/students', form)
      }
      onSaved(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erro ao salvar aluno')
    } finally { setLoading(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            {isEdit ? 'Editar aluno' : 'Adicionar aluno'}
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            {isEdit ? 'Atualize os dados do aluno.' : 'Preencha os dados do novo aluno.'}
          </p>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}
          {[
            { label: 'Nome completo *', key: 'name' as const, placeholder: 'Ex: João da Silva', type: 'text' },
            { label: 'E-mail', key: 'email' as const, placeholder: 'joao@email.com', type: 'email' },
            { label: 'Telefone', key: 'phone' as const, placeholder: '(21) 99999-9999', type: 'text' },
            { label: 'CPF / Documento', key: 'document' as const, placeholder: '000.000.000-00', type: 'text' },
          ].map(({ label, key, placeholder, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>{label}</label>
                <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                       placeholder={placeholder}
                       style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box' }} />
              </div>
          ))}
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
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Todos')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<{ open: boolean; student?: Student }>({ open: false })

  function load() {
    setLoading(true)
    api.get<Student[]>('/students')
        .then((r) => setStudents(r.data))
        .catch(console.error)
        .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function deactivate(id: string) {
    // PATCH /api/students/{id}/deactivate
    await api.patch(`/students/${id}/deactivate`)
    load()
  }

  const filtered = students.filter((s) => {
    const tabOk = tab === 'Todos' || (tab === 'Ativos' && s.active) || (tab === 'Inativos' && !s.active)
    const q = search.toLowerCase()
    return tabOk && (s.name.toLowerCase().includes(q) || (s.email ?? '').toLowerCase().includes(q))
  })

  return (
      <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {modal.open && (
            <StudentModal
                initial={modal.student}
                onClose={() => setModal({ open: false })}
                onSaved={load}
            />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>CADASTRO</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Alunos</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Gerencie matrículas, contatos e turmas dos seus alunos.</p>
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
                {/* Aluno */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
                    {initials(s.name)}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.name}</span>
                </div>

                {/* Contato */}
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
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{s.phone}</span>
                      </div>
                  )}
                </div>

                {/* Data de cadastro */}
                <span style={{ fontSize: 13, color: '#6b7280' }}>{fmtDate(s.createdAt)}</span>

                {/* Status */}
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: s.active ? '#dcfce7' : '#f3f4f6',
                  color: s.active ? '#16a34a' : '#9ca3af',
                  display: 'inline-block',
                }}>
              {s.active ? 'Ativo' : 'Inativo'}
            </span>

                {/* Ações */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setModal({ open: true, student: s })}
                          style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}>
                    Editar
                  </button>
                  {s.active && (
                      <button onClick={() => deactivate(s.id)}
                              style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #fecaca', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#ef4444' }}>
                        Desativar
                      </button>
                  )}
                </div>
              </div>
          ))}
        </div>
      </div>
  )
}