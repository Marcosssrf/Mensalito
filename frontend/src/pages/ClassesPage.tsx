import {useEffect, useState} from 'react'
import api from '@/services/api'

interface SchoolClass {
  id: string
  name: string
  description: string | null
  active: boolean
  createdAt: string
}

interface ClassFormData {
  name: string
  description: string
}

function ClassModal({
                      initial,
                      onClose,
                      onSaved,
                    }: {
  initial?: SchoolClass
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<ClassFormData>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initial

  async function submit() {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setLoading(true); setError('')
    try {
      if (isEdit) {
        // PATCH /api/classes/{id}  body: SchoolClassRequestDTO { name, description }
        await api.patch(`/classes/${initial!.id}`, form)
      } else {
        // POST /api/classes
        await api.post('/classes', form)
      }
      onSaved(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erro ao salvar turma')
    } finally { setLoading(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            {isEdit ? 'Editar turma' : 'Nova turma'}
          </h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            {isEdit ? 'Atualize os dados da turma.' : 'Preencha os dados da nova turma.'}
          </p>
          {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Nome *</label>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                   placeholder="Ex: Jiu-Jitsu Turma 1"
                   style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>Descrição</label>
            <input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                   placeholder="Ex: Prof. Renato · Seg, Qua, Sex · 19h–20h30"
                   style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Cancelar</button>
            <button onClick={submit} disabled={loading}
                    style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600 }}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar turma'}
            </button>
          </div>
        </div>
      </div>
  )
}

function ClassCard({ cls, onEdit, onDeactivate }: { cls: SchoolClass; onEdit: () => void; onDeactivate: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)

  function parseDesc() {
    if (!cls.description) return { teacher: null, schedule: null, days: null, slots: null, price: null, raw: null }
    const parts = cls.description.split('·').map(p => p.trim())
    const teacher = parts.find(p => p.toLowerCase().startsWith('prof')) ?? null
    const days = parts.find(p => /seg|ter|qua|qui|sex|sáb|dom/i.test(p)) ?? null
    const schedule = parts.find(p => /\d{1,2}h/.test(p) && !/prof/i.test(p)) ?? null
    const slots = parts.find(p => /\d+\/\d+/.test(p)) ?? null
    const price = parts.find(p => /r\$/i.test(p)) ?? null
    const raw = (!teacher && !days && !schedule) ? cls.description : null
    return { teacher, schedule, days, slots, price, raw }
  }

  const { teacher, schedule, days, slots, price, raw } = parseDesc()

  let ocupacaoNum = 0, slotUsed = 0, slotTotal = 0
  if (slots) {
    const m = slots.match(/(\d+)\/(\d+)/)
    if (m) { slotUsed = parseInt(m[1]); slotTotal = parseInt(m[2]); ocupacaoNum = Math.round((slotUsed / slotTotal) * 100) }
  }

  const priceLabel = price ? price.replace(/alunos/i, '').trim() + '/mês' : null

  return (
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px',
        opacity: cls.active ? 1 : 0.5, display: 'flex', flexDirection: 'column', gap: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: teacher ? 2 : 10 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{cls.name}</h3>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setMenuOpen(o => !o)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '2px 4px', color: '#9ca3af', borderRadius: 4 }}>
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
                <div style={{ position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 140, zIndex: 20 }}>
                  <button onClick={() => { setMenuOpen(false); onEdit() }}
                          style={{ display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#374151' }}>
                    Editar
                  </button>
                  <button onClick={() => { setMenuOpen(false); onDeactivate() }}
                          style={{ display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#ef4444' }}>
                    {cls.active ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
            )}
          </div>
        </div>

        {teacher && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 14px' }}>{teacher}</p>}
        {raw && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 14px' }}>{raw}</p>}

        {(schedule || days) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span style={{ fontSize: 13, color: '#374151' }}>{[schedule, days].filter(Boolean).join('  ·  ')}</span>
            </div>
        )}

        {slots && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
              <span style={{ fontSize: 13, color: '#374151' }}>{slotUsed}/{slotTotal} alunos</span>
            </div>
        )}

        {!teacher && !raw && !schedule && !days && !slots && <div style={{ marginBottom: 14 }} />}

        {slots ? (
            <>
              <div style={{ height: 4, background: '#f3f4f6', borderRadius: 999, marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${ocupacaoNum}%`, background: '#111827', borderRadius: 999, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{ocupacaoNum}% de ocupação</span>
                {priceLabel && <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{priceLabel}</span>}
              </div>
            </>
        ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              {priceLabel
                  ? <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{priceLabel}</span>
                  : <span />
              }
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: cls.active ? '#dcfce7' : '#f3f4f6',
                color: cls.active ? '#16a34a' : '#9ca3af',
              }}>
            {cls.active ? 'Ativa' : 'Inativa'}
          </span>
            </div>
        )}
      </div>
  )
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; cls?: SchoolClass }>({ open: false })

  function load() {
    setLoading(true)
    api.get<SchoolClass[]>('/classes')
        .then(r => setClasses(r.data))
        .catch(console.error)
        .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function deactivate(id: string) {
    await api.patch(`/classes/${id}/deactivate`)
    load()
  }

  return (
      <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {modal.open && (
            <ClassModal
                initial={modal.cls}
                onClose={() => setModal({ open: false })}
                onSaved={load}
            />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>CATÁLOGO</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Turmas</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Organize horários, professores e vagas das turmas ativas.</p>
          </div>
          <button onClick={() => setModal({ open: true })}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff' }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova turma
          </button>
        </div>

        {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 180, background: '#f3f4f6', borderRadius: 12 }} />
              ))}
            </div>
        ) : classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
              <svg width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24" style={{ display: 'block', margin: '0 auto 16px' }}>
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>Nenhuma turma criada</p>
              <p style={{ fontSize: 13 }}>Clique em "Nova turma" para começar.</p>
            </div>
        ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {classes.map(cls => (
                  <ClassCard
                      key={cls.id}
                      cls={cls}
                      onEdit={() => setModal({ open: true, cls })}
                      onDeactivate={() => deactivate(cls.id)}
                  />
              ))}

              <div onClick={() => setModal({ open: true })} style={{
                border: '2px dashed #e5e7eb', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 160, cursor: 'pointer', transition: 'border-color 0.15s',
              }}
                   onMouseEnter={e => (e.currentTarget.style.borderColor = '#9ca3af')}
                   onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              >
                <div style={{ textAlign: 'center' }}>
                  <svg width="22" height="22" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24" style={{ display: 'block', margin: '0 auto 8px' }}>
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>Nova turma</span>
                </div>
              </div>
            </div>
        )}
      </div>
  )
}