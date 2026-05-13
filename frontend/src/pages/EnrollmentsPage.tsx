import {useEffect, useRef, useState} from 'react'
import api from '@/services/api'
import type {Enrollment} from '@/types'

interface Student { id: string; name: string; active: boolean }
interface SchoolClass { id: string; name: string; active: boolean }
interface Plan { id: string; name: string; amount: number; active: boolean }

function fmt(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function fmtDate(d: string) {
    if (!d) return '—'
    const [y, m, day] = (d.split('T')[0]).split('-')
    return `${day}/${m}/${y}`
}

function today() {
    return new Date().toISOString().split('T')[0]
}

function initials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ── Combobox ────────────────────────────────────────────────────────────────

interface ComboboxOption { id: string; label: string; sublabel?: string }

function Combobox({
                      label,
                      placeholder,
                      options,
                      value,
                      onChange,
                  }: {
    label: string
    placeholder: string
    options: ComboboxOption[]
    value: string
    onChange: (id: string) => void
}) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const selected = options.find(o => o.id === value)
    const filtered = query.trim() === ''
        ? options
        : options.filter(o =>
            o.label.toLowerCase().includes(query.toLowerCase()) ||
            (o.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
        )

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false); setQuery('')
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    function handleSelect(id: string) { onChange(id); setQuery(''); setOpen(false) }
    function handleClear(e: React.MouseEvent) { e.stopPropagation(); onChange(''); setQuery(''); setOpen(false) }
    function handleOpen() { setOpen(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0) }

    const inp: React.CSSProperties = {
        width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
        borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box',
    }

    return (
        <div ref={ref} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>{label}</label>
            <div style={{ position: 'relative' }}>
                {open ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #6b7280', borderRadius: 8, padding: '9px 12px', background: '#fff' }}>
                        <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder={`Buscar ${placeholder.toLowerCase()}...`}
                            style={{ flex: 1, fontSize: 14, outline: 'none', border: 'none', background: 'transparent', color: '#111827' }}
                        />
                        {query && (
                            <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}>
                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleOpen}
                        style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: '#fff', textAlign: 'left' }}
                    >
                        {selected
                            ? <span style={{ color: '#111827', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selected.label}</span>
                            : <span style={{ color: '#9ca3af', fontSize: 14 }}>{placeholder}</span>
                        }
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                            {selected && (
                                <span onClick={handleClear} style={{ cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </span>
                            )}
                            <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                    </button>
                )}

                {open && (
                    <div style={{
                        position: 'absolute', zIndex: 50, top: '100%', marginTop: 4, width: '100%',
                        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)', overflow: 'hidden',
                    }}>
                        <div style={{ maxHeight: 192, overflowY: 'auto' }}>
                            {filtered.length === 0 ? (
                                <p style={{ padding: '12px 16px', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Nenhum resultado</p>
                            ) : filtered.map(o => (
                                <button
                                    key={o.id}
                                    type="button"
                                    onClick={() => handleSelect(o.id)}
                                    style={{
                                        width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 14,
                                        background: o.id === value ? '#f9fafb' : '#fff', border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                        borderBottom: '1px solid #f3f4f6',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                    onMouseLeave={e => (e.currentTarget.style.background = o.id === value ? '#f9fafb' : '#fff')}
                                >
                                    <span style={{ color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
                                    {o.sublabel && <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{o.sublabel}</span>}
                                </button>
                            ))}
                        </div>
                        {options.length > 8 && (
                            <div style={{ padding: '6px 16px', borderTop: '1px solid #f3f4f6' }}>
                                <p style={{ fontSize: 11, color: '#9ca3af' }}>{filtered.length} de {options.length} resultados</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Modal Nova Matrícula ─────────────────────────────────────────────────────

const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
    borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = {
    fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5,
}

function NewEnrollmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [students, setStudents] = useState<Student[]>([])
    const [classes, setClasses] = useState<SchoolClass[]>([])
    const [plans, setPlans] = useState<Plan[]>([])
    const [loadingData, setLoadingData] = useState(true)
    const [form, setForm] = useState({ studentId: '', classId: '', planId: '', startDate: today() })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        Promise.all([
            api.get('/students?page=0&size=200&sort=name,asc'),
            api.get('/classes?page=0&size=200&sort=name,asc'),
            api.get<Plan[]>('/plans'),
        ]).then(([s, c, p]) => {
            const studentsData: Student[] = Array.isArray(s.data) ? s.data : (s.data.content ?? [])
            const classesData: SchoolClass[] = Array.isArray(c.data) ? c.data : (c.data.content ?? [])
            const plansData: Plan[] = Array.isArray(p.data) ? p.data : ((p.data as any).content ?? [])
            setStudents(studentsData.filter(x => x.active))
            setClasses(classesData.filter(x => x.active))
            setPlans(plansData.filter(x => x.active))
        }).catch(console.error).finally(() => setLoadingData(false))
    }, [])

    async function submit() {
        if (!form.studentId) { setError('Selecione um aluno'); return }
        if (!form.classId)   { setError('Selecione uma turma'); return }
        if (!form.planId)    { setError('Selecione um plano'); return }
        if (!form.startDate) { setError('Informe a data de início'); return }
        setSaving(true); setError('')
        try {
            await api.post('/enrollments', form)
            onCreated(); onClose()
        } catch (e: any) {
            setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao criar matrícula')
        } finally { setSaving(false) }
    }

    const selectedPlan = plans.find(p => p.id === form.planId)
    const studentOptions: ComboboxOption[] = students.map(s => ({ id: s.id, label: s.name }))
    const classOptions: ComboboxOption[]   = classes.map(c => ({ id: c.id, label: c.name }))
    const planOptions: ComboboxOption[]    = plans.map(p => ({ id: p.id, label: p.name, sublabel: `${fmt(p.amount)}/mês` }))

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 520, maxWidth: '94vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Nova matrícula</h2>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Vincule um aluno a uma turma e plano.</p>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>
                )}

                {loadingData ? (
                    <div style={{ padding: '32px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando dados...</div>
                ) : (
                    <>
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 12 }}>DADOS DA MATRÍCULA</p>

                        <Combobox label="Aluno *" placeholder="Selecione um aluno" options={studentOptions} value={form.studentId} onChange={id => setForm(f => ({ ...f, studentId: id }))} />
                        <Combobox label="Turma *" placeholder="Selecione uma turma" options={classOptions}   value={form.classId}   onChange={id => setForm(f => ({ ...f, classId: id }))} />
                        <Combobox label="Plano *" placeholder="Selecione um plano"  options={planOptions}    value={form.planId}    onChange={id => setForm(f => ({ ...f, planId: id }))} />

                        <div style={{ marginBottom: 16 }}>
                            <label style={lbl}>Data de início *</label>
                            <input type="date" value={form.startDate} min={today()}
                                   onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                   style={inp} />
                        </div>

                        {selectedPlan && (
                            <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                                Valor mensal: <span style={{ fontWeight: 700, color: '#111827' }}>{fmt(selectedPlan.amount)}</span>
                            </div>
                        )}
                    </>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                    <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>
                        Cancelar
                    </button>
                    <button onClick={submit} disabled={saving || loadingData}
                            style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, opacity: saving || loadingData ? 0.6 : 1 }}>
                        {saving ? 'Matriculando...' : 'Matricular'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Página principal ─────────────────────────────────────────────────────────

type TabStatus = 'Todos' | 'Ativas' | 'Inativas'

export default function EnrollmentsPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<TabStatus>('Todos')
    const [search, setSearch] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [filterPlan, setFilterPlan] = useState('')
    const [showModal, setShowModal] = useState(false)

    function load() {
        setLoading(true)
        api.get<Enrollment[]>('/enrollments')
            .then(r => {
                const raw = r.data as any
                setEnrollments(Array.isArray(raw) ? raw : (raw?.content ?? []))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    async function deactivate(e: Enrollment) {
        try { await api.patch(`/enrollments/${e.id}/deactivate`); load() }
        catch (err) { console.error(err) }
    }

    const uniqueClasses = Array.from(new Set(enrollments.map(e => e.className))).sort()
    const uniquePlans   = Array.from(new Set(enrollments.map(e => e.planName))).sort()

    const filtered = enrollments.filter(e => {
        const q = search.toLowerCase()
        const matchSearch = !q || e.studentName.toLowerCase().includes(q) || e.className.toLowerCase().includes(q) || e.planName.toLowerCase().includes(q)
        const matchTab = tab === 'Todos' || (tab === 'Ativas' && e.active) || (tab === 'Inativas' && !e.active)
        const matchClass = !filterClass || e.className === filterClass
        const matchPlan  = !filterPlan  || e.planName  === filterPlan
        return matchSearch && matchTab && matchClass && matchPlan
    })

    const totalAtivas = enrollments.filter(e => e.active).length
    const hasFilters = search || tab !== 'Todos' || filterClass || filterPlan

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
            {showModal && <NewEnrollmentModal onClose={() => setShowModal(false)} onCreated={load} />}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>CADASTRO</p>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Matrículas</h1>
                    <p style={{ fontSize: 14, color: '#6b7280' }}>{totalAtivas} matrícula{totalAtivas !== 1 ? 's' : ''} ativa{totalAtivas !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#111827', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff' }}
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Nova matrícula
                </button>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>

                {/* Toolbar */}
                <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                    {/* Linha 1: tabs + busca */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {(['Todos', 'Ativas', 'Inativas'] as TabStatus[]).map(t => (
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
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar aluno, turma ou plano..."
                                style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#374151', outline: 'none', width: 260 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Cabeçalho da tabela */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 1fr 0.6fr', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['ALUNO', 'TURMA', 'PLANO', 'VALOR', 'INÍCIO', 'STATUS', ''].map(h => (
                        <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>{h}</span>
                    ))}
                </div>

                {/* Linhas */}
                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Nenhuma matrícula encontrada.</div>
                ) : filtered.map((en, i) => (
                    <div key={en.id} style={{
                        display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 1fr 0.6fr',
                        padding: '16px 20px', alignItems: 'center', background: '#fff',
                        borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}>
                        {/* Aluno */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: '50%', background: en.active ? '#f3f4f6' : '#fafafa',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, color: en.active ? '#374151' : '#9ca3af', flexShrink: 0,
                            }}>
                                {initials(en.studentName)}
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{en.studentName}</span>
                        </div>

                        {/* Turma */}
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{en.className}</span>

                        {/* Plano */}
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{en.planName}</span>

                        {/* Valor */}
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{fmt(en.amount)}</span>

                        {/* Início */}
                        <span style={{ fontSize: 13, color: '#6b7280' }}>{fmtDate(en.startDate)}</span>

                        {/* Status */}
                        <span style={{
                            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                            background: en.active ? '#dcfce7' : '#f3f4f6',
                            color: en.active ? '#16a34a' : '#9ca3af',
                            display: 'inline-block', width: 'fit-content',
                        }}>
              {en.active ? 'Ativa' : 'Inativa'}
            </span>

                        {/* Ação */}
                        <div>
                            {en.active && (
                                <button
                                    onClick={() => deactivate(en)}
                                    style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #fecaca', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#ef4444' }}
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}