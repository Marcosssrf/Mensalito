import {useEffect, useState} from 'react'
import {CheckCircle, MoreHorizontal, Plus, Search, XCircle} from 'lucide-react'
import api from '@/services/api'
import type {Student} from '@/types'

const mockStudents: Student[] = [
    { id: '1', name: 'Ana Clara Souza', email: 'ana@email.com', phone: '(34) 99123-4567', document: '123.456.789-00', active: true, createdAt: '2024-01-10' },
    { id: '2', name: 'Bruno Mendes', email: 'bruno@email.com', phone: '(34) 98765-4321', document: '987.654.321-00', active: true, createdAt: '2024-02-15' },
    { id: '3', name: 'Carla Fernandes', email: 'carla@email.com', phone: '(34) 99234-5678', document: '456.789.123-00', active: false, createdAt: '2024-03-20' },
    { id: '4', name: 'Diego Santos', email: 'diego@email.com', phone: '(34) 99345-6789', document: '321.654.987-00', active: true, createdAt: '2024-04-05' },
    { id: '5', name: 'Elena Costa', email: 'elena@email.com', phone: '(34) 99456-7890', document: '654.321.098-00', active: true, createdAt: '2024-04-12' },
]

type ModalState = { open: false } | { open: true; student: Partial<Student> }

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [modal, setModal] = useState<ModalState>({ open: false })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api.get<Student[]>('/students')
            .then(r => setStudents(r.data))
            .catch(() => setStudents(mockStudents))
            .finally(() => setLoading(false))
    }, [])

    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    )

    function openNew() {
        setModal({ open: true, student: { name: '', email: '', phone: '', document: '', active: true } })
    }

    async function handleSave() {
        if (!modal.open) return
        setSaving(true)
        try {
            if (modal.student.id) {
                await api.put(`/students/${modal.student.id}`, modal.student)
                setStudents(prev => prev.map(s => s.id === modal.student.id ? { ...s, ...modal.student } as Student : s))
            } else {
                const res = await api.post<Student>('/students', modal.student)
                setStudents(prev => [...prev, res.data])
            }
        } catch {
            // mock: just update local state
            if (modal.student.id) {
                setStudents(prev => prev.map(s => s.id === modal.student.id ? { ...s, ...modal.student } as Student : s))
            } else {
                const newStudent: Student = {
                    ...modal.student as Student,
                    id: String(Date.now()),
                    createdAt: new Date().toISOString().split('T')[0],
                }
                setStudents(prev => [...prev, newStudent])
            }
        } finally {
            setSaving(false)
            setModal({ open: false })
        }
    }

    async function toggleActive(student: Student) {
        try {
            await api.patch(`/students/${student.id}`, { active: !student.active })
        } catch { /* noop */ }
        setStudents(prev => prev.map(s => s.id === student.id ? { ...s, active: !s.active } : s))
    }

    return (
        <div className="space-y-5" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900">Alunos</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">{students.filter(s => s.active).length} ativos</p>
                </div>
                <button
                    onClick={openNew}
                    className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-700 transition-colors self-start sm:self-auto"
                >
                    <Plus size={14} />
                    Novo aluno
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou email..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-md outline-none focus:border-zinc-400 transition-colors"
                />
            </div>

            {/* Table — desktop */}
            <div className="hidden md:block border border-zinc-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                        <tr>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Nome</th>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Email</th>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Telefone</th>
                            <th className="text-left px-4 py-3 text-xs text-zinc-400 font-medium">Status</th>
                            <th className="px-4 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i}>
                                    {Array.from({ length: 5 }).map((_, j) => (
                                        <td key={j} className="px-4 py-3">
                                            <div className="h-4 bg-zinc-100 rounded animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                                    Nenhum aluno encontrado
                                </td>
                            </tr>
                        ) : filtered.map(s => (
                            <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-zinc-900">{s.name}</td>
                                <td className="px-4 py-3 text-zinc-500">{s.email}</td>
                                <td className="px-4 py-3 text-zinc-500">{s.phone}</td>
                                <td className="px-4 py-3">
                                    {s.active
                                        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle size={10} />Ativo</span>
                                        : <span className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full"><XCircle size={10} />Inativo</span>
                                    }
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1 justify-end">
                                        <button
                                            onClick={() => setModal({ open: true, student: { ...s } })}
                                            className="text-xs text-zinc-400 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => toggleActive(s)}
                                            className="text-xs text-zinc-400 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                                        >
                                            {s.active ? 'Desativar' : 'Ativar'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Cards — mobile */}
            <div className="md:hidden space-y-2">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-20 bg-zinc-100 rounded-lg animate-pulse" />
                    ))
                ) : filtered.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 py-8">Nenhum aluno encontrado</p>
                ) : filtered.map(s => (
                    <div key={s.id} className="border border-zinc-100 rounded-lg p-4 bg-white">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 truncate">{s.name}</p>
                                <p className="text-xs text-zinc-400 mt-0.5 truncate">{s.email}</p>
                                <p className="text-xs text-zinc-400">{s.phone}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                                {s.active
                                    ? <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Ativo</span>
                                    : <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">Inativo</span>
                                }
                                <button
                                    onClick={() => setModal({ open: true, student: { ...s } })}
                                    className="text-zinc-400 hover:text-zinc-900"
                                >
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
                        <div className="p-5 border-b border-zinc-100">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                {modal.student.id ? 'Editar aluno' : 'Novo aluno'}
                            </h2>
                        </div>
                        <div className="p-5 space-y-3">
                            {[
                                { field: 'name', label: 'Nome', placeholder: 'Ana Clara Souza' },
                                { field: 'email', label: 'Email', placeholder: 'ana@email.com' },
                                { field: 'phone', label: 'Telefone', placeholder: '(34) 99999-9999' },
                                { field: 'document', label: 'CPF', placeholder: '000.000.000-00' },
                            ].map(({ field, label, placeholder }) => (
                                <div key={field} className="space-y-1">
                                    <label className="text-xs text-zinc-500">{label}</label>
                                    <input
                                        value={(modal.student as Record<string, string>)[field] || ''}
                                        onChange={e => setModal(m => m.open ? { ...m, student: { ...m.student, [field]: e.target.value } } : m)}
                                        placeholder={placeholder}
                                        className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="p-5 border-t border-zinc-100 flex gap-2">
                            <button
                                onClick={() => setModal({ open: false })}
                                className="flex-1 border border-zinc-200 text-sm py-2 rounded-md hover:bg-zinc-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 bg-zinc-900 text-white text-sm py-2 rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-40"
                            >
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
