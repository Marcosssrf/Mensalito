import {useEffect, useState} from 'react'
import {CheckCircle, Plus, Search, XCircle} from 'lucide-react'
import api from '@/services/api'
import type {Enrollment} from '@/types'

const mockEnrollments: Enrollment[] = [
    { id: '1', studentName: 'Ana Clara Souza', className: 'Inglês Básico A1', planName: 'Básico', amount: 29900, startDate: '2024-01-10', endDate: '', active: true, createdAt: '2024-01-10' },
    { id: '2', studentName: 'Bruno Mendes', className: 'Inglês Intermediário B1', planName: 'Intermediário', amount: 49900, startDate: '2024-02-15', endDate: '', active: true, createdAt: '2024-02-15' },
    { id: '3', studentName: 'Carla Fernandes', className: 'Inglês Avançado C1', planName: 'Avançado', amount: 79900, startDate: '2024-03-01', endDate: '2024-06-01', active: false, createdAt: '2024-03-01' },
    { id: '4', studentName: 'Diego Santos', className: 'Inglês Básico A1', planName: 'Básico', amount: 29900, startDate: '2024-04-05', endDate: '', active: true, createdAt: '2024-04-05' },
]

function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(d: string) {
    if (!d) return '–'
    return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function EnrollmentsPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        api.get<Enrollment[]>('/enrollments')
            .then(r => setEnrollments(r.data))
            .catch(() => setEnrollments(mockEnrollments))
            .finally(() => setLoading(false))
    }, [])

    const filtered = enrollments.filter(e =>
        e.studentName.toLowerCase().includes(search.toLowerCase()) ||
        e.className.toLowerCase().includes(search.toLowerCase())
    )

    async function toggleActive(e: Enrollment) {
        try { await api.patch(`/enrollments/${e.id}`, { active: !e.active }) } catch { /* noop */ }
        setEnrollments(prev => prev.map(en => en.id === e.id ? { ...en, active: !en.active } : en))
    }

    return (
        <div className="space-y-5" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900">Matrículas</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">{enrollments.filter(e => e.active).length} ativas</p>
                </div>
                <button className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-700 transition-colors self-start sm:self-auto">
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
                                    <button onClick={() => toggleActive(en)} className="text-xs text-zinc-400 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors">
                                        {en.active ? 'Cancelar' : 'Reativar'}
                                    </button>
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
                                <button onClick={() => toggleActive(en)} className="text-xs text-zinc-400 hover:text-zinc-700">
                                    {en.active ? 'Cancelar' : 'Reativar'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
