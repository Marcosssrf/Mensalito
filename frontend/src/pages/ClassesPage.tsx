import {useEffect, useState} from 'react'
import {BookOpen, Plus} from 'lucide-react'
import api from '@/services/api'
import type {SchoolClass} from '@/types'

const mockClasses: SchoolClass[] = [
    { id: '1', name: 'Inglês Básico A1', description: 'Para iniciantes absolutos', active: true, createdAt: '2024-01-10' },
    { id: '2', name: 'Inglês Intermediário B1', description: 'Conversação e gramática avançada', active: true, createdAt: '2024-01-15' },
    { id: '3', name: 'Inglês Avançado C1', description: 'Fluência e preparação para exames', active: true, createdAt: '2024-02-01' },
    { id: '4', name: 'Business English', description: 'Inglês para negócios e reuniões', active: false, createdAt: '2024-03-01' },
]

type ModalState = { open: false } | { open: true; cls: Partial<SchoolClass> }

export default function ClassesPage() {
    const [classes, setClasses] = useState<SchoolClass[]>([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState<ModalState>({ open: false })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        api.get<SchoolClass[]>('/classes')
            .then(r => setClasses(r.data))
            .catch(() => setClasses(mockClasses))
            .finally(() => setLoading(false))
    }, [])

    async function handleSave() {
        if (!modal.open) return
        setSaving(true)
        try {
            if (modal.cls.id) {
                await api.put(`/classes/${modal.cls.id}`, modal.cls)
                setClasses(prev => prev.map(c => c.id === modal.cls.id ? { ...c, ...modal.cls } as SchoolClass : c))
            } else {
                const res = await api.post<SchoolClass>('/classes', modal.cls)
                setClasses(prev => [...prev, res.data])
            }
        } catch {
            if (modal.cls.id) {
                setClasses(prev => prev.map(c => c.id === modal.cls.id ? { ...c, ...modal.cls } as SchoolClass : c))
            } else {
                setClasses(prev => [...prev, { ...modal.cls, id: String(Date.now()), createdAt: new Date().toISOString().split('T')[0] } as SchoolClass])
            }
        } finally {
            setSaving(false)
            setModal({ open: false })
        }
    }

    async function toggleActive(cls: SchoolClass) {
        try { await api.patch(`/classes/${cls.id}`, { active: !cls.active }) } catch { /* noop */ }
        setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, active: !c.active } : c))
    }

    return (
        <div className="space-y-5" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900">Turmas</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">{classes.filter(c => c.active).length} ativas</p>
                </div>
                <button
                    onClick={() => setModal({ open: true, cls: { name: '', description: '', active: true } })}
                    className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-700 transition-colors self-start sm:self-auto"
                >
                    <Plus size={14} /> Nova turma
                </button>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-zinc-100 rounded-lg animate-pulse" />)}
                </div>
            ) : classes.length === 0 ? (
                <div className="text-center py-12 text-sm text-zinc-400">Nenhuma turma criada</div>
            ) : (
                <div className="space-y-2">
                    {classes.map(cls => (
                        <div
                            key={cls.id}
                            className={`border rounded-lg p-4 flex items-center gap-4 bg-white ${!cls.active ? 'opacity-50' : 'border-zinc-100'}`}
                        >
                            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
                                <BookOpen size={16} className="text-zinc-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900">{cls.name}</p>
                                <p className="text-xs text-zinc-400 mt-0.5 truncate">{cls.description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {cls.active
                                    ? <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full hidden sm:inline">Ativa</span>
                                    : <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full hidden sm:inline">Inativa</span>
                                }
                                <button
                                    onClick={() => setModal({ open: true, cls: { ...cls } })}
                                    className="text-xs text-zinc-400 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => toggleActive(cls)}
                                    className="text-xs text-zinc-400 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                                >
                                    {cls.active ? 'Desativar' : 'Ativar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
                        <div className="p-5 border-b border-zinc-100">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                {modal.cls.id ? 'Editar turma' : 'Nova turma'}
                            </h2>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Nome</label>
                                <input
                                    value={modal.cls.name || ''}
                                    onChange={e => setModal(m => m.open ? { ...m, cls: { ...m.cls, name: e.target.value } } : m)}
                                    placeholder="Ex: Inglês Básico A1"
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Descrição</label>
                                <input
                                    value={modal.cls.description || ''}
                                    onChange={e => setModal(m => m.open ? { ...m, cls: { ...m.cls, description: e.target.value } } : m)}
                                    placeholder="Descreva a turma..."
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="p-5 border-t border-zinc-100 flex gap-2">
                            <button onClick={() => setModal({ open: false })} className="flex-1 border border-zinc-200 text-sm py-2 rounded-md hover:bg-zinc-50 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 bg-zinc-900 text-white text-sm py-2 rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-40">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
