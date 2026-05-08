import {useEffect, useState} from 'react'
import {CheckCircle, Plus, Search, XCircle} from 'lucide-react'
import api from '@/services/api'
import type {Enrollment} from '@/types'

interface Student { id: string; name: string; active: boolean }
interface SchoolClass { id: string; name: string; active: boolean }
interface Plan { id: string; name: string; amount: number; active: boolean }

function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string) {
    if (!d) return '–'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function today() {
    return new Date().toISOString().split('T')[0]
}

function NewEnrollmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [students, setStudents] = useState<Student[]>([])
    const [classes, setClasses] = useState<SchoolClass[]>([])
    const [plans, setPlans] = useState<Plan[]>([])
    const [loadingData, setLoadingData] = useState(true)

    const [form, setForm] = useState({
        studentId: '',
        classId: '',
        planId: '',
        startDate: today(),
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        Promise.all([
            api.get<Student[]>('/students'),
            api.get<SchoolClass[]>('/classes'),
            api.get<Plan[]>('/plans'),
        ])
            .then(([s, c, p]) => {
                setStudents(s.data.filter(x => x.active))
                setClasses(c.data.filter(x => x.active))
                setPlans(p.data.filter(x => x.active))
            })
            .catch(console.error)
            .finally(() => setLoadingData(false))
    }, [])

    async function submit() {
        if (!form.studentId) { setError('Selecione um aluno'); return }
        if (!form.classId) { setError('Selecione uma turma'); return }
        if (!form.planId) { setError('Selecione um plano'); return }
        if (!form.startDate) { setError('Informe a data de início'); return }

        setSaving(true); setError('')
        try {
            // POST /api/enrollments → EnrollmentRequestDTO { studentId, classId, planId, startDate }
            await api.post('/enrollments', form)
            onCreated(); onClose()
        } catch (e: any) {
            setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao criar matrícula')
        } finally { setSaving(false) }
    }

    const selectedPlan = plans.find(p => p.id === form.planId)

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
                <div className="p-5 border-b border-zinc-100">
                    <h2 className="text-sm font-semibold text-zinc-900">Nova matrícula</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Vincule um aluno a uma turma e plano.</p>
                </div>

                <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">
                            {error}
                        </div>
                    )}

                    {loadingData ? (
                        <p className="text-sm text-zinc-400 text-center py-4">Carregando dados...</p>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Aluno *</label>
                                <select
                                    value={form.studentId}
                                    onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors bg-white"
                                >
                                    <option value="">Selecione um aluno...</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Turma *</label>
                                <select
                                    value={form.classId}
                                    onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors bg-white"
                                >
                                    <option value="">Selecione uma turma...</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Plano *</label>
                                <select
                                    value={form.planId}
                                    onChange={e => setForm(f => ({ ...f, planId: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors bg-white"
                                >
                                    <option value="">Selecione um plano...</option>
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.amount)}/mês</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Data de início *</label>
                                <input
                                    type="date"
                                    value={form.startDate}
                                    min={today()}
                                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
                                />
                            </div>

                            {selectedPlan && (
                                <div className="bg-zinc-50 border border-zinc-100 rounded-md px-3 py-2 text-xs text-zinc-500">
                                    Valor mensal: <span className="font-semibold text-zinc-900">{formatCurrency(selectedPlan.amount)}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-5 border-t border-zinc-100 flex gap-2">
                    <button onClick={onClose} className="flex-1 border border-zinc-200 text-sm py-2 rounded-md hover:bg-zinc-50 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={submit}
                        disabled={saving || loadingData}
                        className="flex-1 bg-zinc-900 text-white text-sm py-2 rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-40"
                    >
                        {saving ? 'Matriculando...' : 'Matricular'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function EnrollmentsPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)

    function load() {
        setLoading(true)
        api.get<Enrollment[]>('/enrollments')
            .then(r => setEnrollments(r.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    async function deactivate(e: Enrollment) {
        try {
            // PATCH /api/enrollments/{id}/deactivate
            await api.patch(`/enrollments/${e.id}/deactivate`)
            load()
        } catch (err) {
            console.error('Erro ao desativar matrícula:', err)
        }
    }

    const filtered = enrollments.filter(e =>
        e.studentName.toLowerCase().includes(search.toLowerCase()) ||
        e.className.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-5" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            {showModal && <NewEnrollmentModal onClose={() => setShowModal(false)} onCreated={load} />}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900">Matrículas</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">{enrollments.filter(e => e.active).length} ativas</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-700 transition-colors self-start sm:self-auto"
                >
                    <Plus size={14} /> Nova matrícula
                </button>
            </div>

            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por aluno ou turma..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-md outline-none focus:border-zinc-400 transition-colors"
                />
            </div>

            {/* Desktop table */}
            <div className="hidden md:block border border-zinc-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                    <tr>
                        <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Aluno</th>
                        <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Turma</th>
                        <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Plano</th>
                        <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Valor</th>
                        <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Início</th>
                        <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Status</th>
                        <th className="px-4 py-3" />
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                                <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-100 rounded animate-pulse" /></td>
                            ))}</tr>
                        ))
                    ) : filtered.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">Nenhuma matrícula encontrada</td></tr>
                    ) : filtered.map(en => (
                        <tr key={en.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-zinc-900">{en.studentName}</td>
                            <td className="px-4 py-3 text-zinc-500">{en.className}</td>
                            <td className="px-4 py-3 text-zinc-500">{en.planName}</td>
                            <td className="px-4 py-3 text-zinc-900 font-medium">{formatCurrency(en.amount)}</td>
                            <td className="px-4 py-3 text-zinc-500">{formatDate(en.startDate)}</td>
                            <td className="px-4 py-3">
                                {en.active
                                    ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle size={10} />Ativa</span>
                                    : <span className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full"><XCircle size={10} />Inativa</span>
                                }
                            </td>
                            <td className="px-4 py-3 text-right">
                                {en.active && (
                                    <button
                                        onClick={() => deactivate(en)}
                                        className="text-xs text-zinc-400 hover:text-red-500 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
                {loading ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 bg-zinc-100 rounded-lg animate-pulse" />
                )) : filtered.map(en => (
                    <div key={en.id} className="border border-zinc-100 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900">{en.studentName}</p>
                                <p className="text-xs text-zinc-400 mt-0.5">{en.className} · {en.planName}</p>
                                <p className="text-xs text-zinc-500 mt-1">{formatCurrency(en.amount)}/mês · desde {formatDate(en.startDate)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 ml-2">
                                {en.active
                                    ? <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ativa</span>
                                    : <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">Inativa</span>
                                }
                                {en.active && (
                                    <button onClick={() => deactivate(en)} className="text-xs text-zinc-400 hover:text-red-500">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}