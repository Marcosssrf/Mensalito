import {useEffect, useState} from 'react'
import api from '@/services/api'
import type {Plan} from '@/types'

function formatCurrency(val: number) {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
    borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none',
    boxSizing: 'border-box', background: '#fff',
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
        const payload = { name: modal.plan.name, amount: amountVal, dueDay: modal.plan.dueDay }
        setSaving(true); setError('')
        try {
            if (modal.plan.id) {
                const res = await api.patch<Plan>(`/plans/${modal.plan.id}`, payload)
                setPlans(prev => prev.map(p => p.id === modal.plan.id ? res.data : p))
            } else {
                const res = await api.post<Plan>('/plans', payload)
                setPlans(prev => [...prev, res.data])
            }
            setModal({ open: false })
        } catch (e: any) {
            setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao salvar plano')
        } finally { setSaving(false) }
    }

    async function deactivate(plan: Plan) {
        try {
            const res = await api.patch<Plan>(`/plans/${plan.id}/deactivate`)
            setPlans(prev => prev.map(p => p.id === plan.id ? res.data : p))
        } catch (e: any) {
            console.error('Erro ao desativar plano:', e)
        }
    }

    async function reactivate(plan: Plan) {
        try {
            const res = await api.patch<Plan>(`/plans/${plan.id}/reactivate`)
            setPlans(prev => prev.map(p => p.id === plan.id ? res.data : p))
        } catch (e: any) {
            console.error('Erro ao reativar plano:', e)
        }
    }

    const activePlans = plans.filter(p => p.active)
    const inactivePlans = plans.filter(p => !p.active)

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>PLANOS</p>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Planos</h1>
                    <p style={{ fontSize: 14, color: '#6b7280' }}>{activePlans.length} ativo{activePlans.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                    onClick={openNew}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#111827', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff' }}
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Novo plano
                </button>
            </div>

            {/* Grid de planos */}
            {loading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: 140, background: '#f3f4f6', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af', fontSize: 14 }}>
                    <svg width="40" height="40" fill="none" stroke="#d1d5db" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 12px', display: 'block' }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                    </svg>
                    Nenhum plano criado ainda
                    <br />
                    <button onClick={openNew} style={{ marginTop: 16, padding: '8px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                        Criar primeiro plano
                    </button>
                </div>
            ) : (
                <>
                    {/* Ativos */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                        {activePlans.map(plan => (
                            <div key={plan.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: '#ecfdf5', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.04em' }}>ATIVO</span>
                                        <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginTop: 8 }}>{plan.name}</p>
                                    </div>
                                    <button
                                        onClick={() => openEdit(plan)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6, lineHeight: 0 }}
                                        title="Editar"
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                                    </button>
                                </div>

                                <div>
                                    <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px', margin: 0 }}>
                                        {formatCurrency(plan.amount)}
                                        <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>/mês</span>
                                    </p>
                                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Vencimento: dia {plan.dueDay}</p>
                                </div>

                                <button
                                    onClick={() => deactivate(plan)}
                                    style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 'auto' }}
                                    onMouseOver={e => (e.currentTarget.style.color = '#ef4444')}
                                    onMouseOut={e => (e.currentTarget.style.color = '#9ca3af')}
                                >
                                    Desativar
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Inativos */}
                    {inactivePlans.length > 0 && (
                        <div style={{ marginTop: 32 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 12 }}>INATIVOS</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                                {inactivePlans.map(plan => (
                                    <div key={plan.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, opacity: 0.7, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>INATIVO</p>
                                        <p style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>{plan.name}</p>
                                        <p style={{ fontSize: 22, fontWeight: 700, color: '#374151', margin: '4px 0' }}>
                                            {formatCurrency(plan.amount)}
                                            <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>/mês</span>
                                        </p>
                                        <p style={{ fontSize: 12, color: '#9ca3af' }}>Vencimento: dia {plan.dueDay}</p>
                                        <button
                                            onClick={() => reactivate(plan)}
                                            style={{ fontSize: 12, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 4 }}
                                            onMouseOver={e => (e.currentTarget.style.color = '#059669')}
                                            onMouseOut={e => (e.currentTarget.style.color = '#10b981')}
                                        >
                                            Reativar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal */}
            {modal.open && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 24 }}>
                            {modal.plan.id ? 'Editar plano' : 'Novo plano'}
                        </h2>

                        {error && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Nome *</label>
                                <input
                                    value={modal.plan.name || ''}
                                    onChange={e => setModal(m => m.open ? { ...m, plan: { ...m.plan, name: e.target.value } } : m)}
                                    placeholder="Ex: Básico, Intermediário..."
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Valor (R$) *</label>
                                <input
                                    value={formAmount}
                                    onChange={e => setFormAmount(e.target.value)}
                                    placeholder="299,90"
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Dia de vencimento (1–28) *</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={28}
                                    value={modal.plan.dueDay || ''}
                                    onChange={e => setModal(m => m.open ? { ...m, plan: { ...m.plan, dueDay: Number(e.target.value) } } : m)}
                                    placeholder="10"
                                    style={{ ...inputStyle, width: 120 }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
                            <button
                                onClick={() => setModal({ open: false })}
                                style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, opacity: saving ? 0.6 : 1 }}
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