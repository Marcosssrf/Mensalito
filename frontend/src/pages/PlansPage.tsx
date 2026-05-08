import {useEffect, useState} from 'react'
import {MoreHorizontal, Plus} from 'lucide-react'
import api from '@/services/api'
import type {Plan} from '@/types'

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
    const [error, setError] = useState('')

    function load() {
        setLoading(true)
        api.get<Plan[]>('/plans')
            .then(r => setPlans(r.data))
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    function openNew() {
        setFormAmount('')
        setError('')
        setModal({ open: true, plan: { name: '', amount: 0, dueDay: 10, active: true } })
    }

    function openEdit(plan: Plan) {
        setFormAmount(plan.amount.toFixed(2).replace('.', ','))
        setError('')
        setModal({ open: true, plan: { ...plan } })
    }

    async function handleSave() {
        if (!modal.open) return
        if (!modal.plan.name?.trim()) { setError('Nome é obrigatório'); return }
        const amountVal = parseFloat(formAmount.replace(',', '.'))
        if (!amountVal || amountVal <= 0) { setError('Valor deve ser maior que zero'); return }
        if (!modal.plan.dueDay || modal.plan.dueDay < 1 || modal.plan.dueDay > 28) {
            setError('Dia de vencimento deve ser entre 1 e 28'); return
        }

        // Backend espera BigDecimal (ex: 299.90), não centavos
        const payload = {
            name: modal.plan.name,
            amount: amountVal,
            dueDay: modal.plan.dueDay,
        }

        setSaving(true); setError('')
        try {
            if (modal.plan.id) {
                // PATCH /api/plans/{id}
                const res = await api.patch<Plan>(`/plans/${modal.plan.id}`, payload)
                setPlans(prev => prev.map(p => p.id === modal.plan.id ? res.data : p))
            } else {
                // POST /api/plans
                const res = await api.post<Plan>('/plans', payload)
                setPlans(prev => [...prev, res.data])
            }
            setModal({ open: false })
        } catch (e: any) {
            setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao salvar plano')
        } finally {
            setSaving(false)
        }
    }

    async function deactivate(plan: Plan) {
        try {
            // PATCH /api/plans/{id}/deactivate
            const res = await api.patch<Plan>(`/plans/${plan.id}/deactivate`)
            setPlans(prev => prev.map(p => p.id === plan.id ? res.data : p))
        } catch (e: any) {
            console.error('Erro ao desativar plano:', e)
        }
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
                            {plan.active && (
                                <button
                                    onClick={() => deactivate(plan)}
                                    className="text-xs text-zinc-400 hover:text-red-500 transition-colors text-left"
                                >
                                    Desativar
                                </button>
                            )}
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
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-600">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Nome *</label>
                                <input
                                    value={modal.plan.name || ''}
                                    onChange={e => setModal(m => m.open ? { ...m, plan: { ...m.plan, name: e.target.value } } : m)}
                                    placeholder="Ex: Básico"
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Valor (R$) *</label>
                                <input
                                    value={formAmount}
                                    onChange={e => setFormAmount(e.target.value)}
                                    placeholder="299,90"
                                    className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-zinc-500">Dia de vencimento (1–28) *</label>
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