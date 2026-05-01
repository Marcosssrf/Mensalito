import {useEffect, useState} from 'react'
import {MoreHorizontal, Plus} from 'lucide-react'
import api from '@/services/api'
import type {Plan} from '@/types'

const mockPlans: Plan[] = [
    { id: '1', name: 'Básico', amount: 29900, dueDay: 5, active: true, createdAt: '2024-01-01' },
    { id: '2', name: 'Intermediário', amount: 49900, dueDay: 10, active: true, createdAt: '2024-01-01' },
    { id: '3', name: 'Avançado', amount: 79900, dueDay: 10, active: true, createdAt: '2024-01-01' },
    { id: '4', name: 'VIP', amount: 129900, dueDay: 1, active: false, createdAt: '2024-01-01' },
]

function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type ModalState = { open: false } | { open: true; plan: Partial<Plan> }

export default function PlansPage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState<ModalState>({ open: false })
    const [saving, setSaving] = useState(false)
    const [formAmount, setFormAmount] = useState('')

    useEffect(() => {
        api.get<Plan[]>('/plans')
            .then(r => setPlans(r.data))
            .catch(() => setPlans(mockPlans))
            .finally(() => setLoading(false))
    }, [])

    function openNew() {
        setFormAmount('')
        setModal({ open: true, plan: { name: '', amount: 0, dueDay: 10, active: true } })
    }

    function openEdit(plan: Plan) {
        setFormAmount(plan.amount.toFixed(2).replace('.', ','))
        setModal({ open: true, plan: { ...plan } })
    }

    async function handleSave() {
        if (!modal.open) return
        const amountCents = parseFloat(formAmount.replace(',', '.')) || 0
        const payload = { ...modal.plan, amount: amountCents }
        setSaving(true)
        try {
            if (modal.plan.id) {
                await api.put(`/plans/${modal.plan.id}`, payload)
                setPlans(prev => prev.map(p => p.id === modal.plan.id ? { ...p, ...payload } as Plan : p))
            } else {
                const res = await api.post<Plan>('/plans', payload)
                setPlans(prev => [...prev, res.data])
            }
        } catch {
            if (modal.plan.id) {
                setPlans(prev => prev.map(p => p.id === modal.plan.id ? { ...p, ...payload } as Plan : p))
            } else {
                setPlans(prev => [...prev, { ...payload, id: String(Date.now()), createdAt: new Date().toISOString().split('T')[0] } as Plan])
            }
        } finally {
            setSaving(false)
            setModal({ open: false })
        }
    }

    async function toggleActive(plan: Plan) {
        try { await api.patch(`/plans/${plan.id}`, { active: !plan.active }) } catch { /* noop */ }
        setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, active: !p.active } : p))
    }

    return (
        <div className="space-y-5" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-900">Planos</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">{plans.filter(p => p.active).length} ativos</p>
                </div>
                <button
                    onClick={openNew}
                    className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm px-4 py-2 rounded-md hover:bg-zinc-700 transition-colors self-start sm:self-auto"
                >
                    <Plus size={14} /> Novo plano
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 bg-zinc-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <div className="text-center py-12 text-sm text-zinc-400">Nenhum plano criado</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {plans.map(plan => (
                        <div
                            key={plan.id}
                            className={`border rounded-lg p-5 flex flex-col gap-3 ${plan.active ? 'border-zinc-100 bg-white' : 'border-zinc-100 bg-zinc-50 opacity-60'}`}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-zinc-400 mb-1">{plan.active ? 'Ativo' : 'Inativo'}</p>
                                    <p className="text-sm font-semibold text-zinc-900">{plan.name}</p>
                                </div>
                                <button onClick={() => openEdit(plan)} className="text-zinc-300 hover:text-zinc-600 transition-colors">
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>
                            <div>
                                <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                                    {formatCurrency(plan.amount)}
                                    <span className="text-sm font-normal text-zinc-400 ml-1">/mês</span>
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">Vencimento: dia {plan.dueDay}</p>
                            </div>
                            <button
                                onClick={() => toggleActive(plan)}
                                className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors text-left"
                            >
                                {plan.active ? 'Desativar' : 'Reativar'}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/20">
                    <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
                        <div className="p-5 border-b border-zinc-100">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                {modal.plan.id ? 'Editar plano' : 'Novo plano'}
                            </h2>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Nome</label>
                                <input
                                    value={modal.plan.name || ''}
                                    onChange={e => setModal(m => m.open ? { ...m, plan: { ...m.plan, name: e.target.value } } : m)}
                                    placeholder="Ex: Básico"
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Valor (R$)</label>
                                <input
                                    value={formAmount}
                                    onChange={e => setFormAmount(e.target.value)}
                                    placeholder="299,00"
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Dia de vencimento</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={28}
                                    value={modal.plan.dueDay || ''}
                                    onChange={e => setModal(m => m.open ? { ...m, plan: { ...m.plan, dueDay: Number(e.target.value) } } : m)}
                                    placeholder="10"
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
