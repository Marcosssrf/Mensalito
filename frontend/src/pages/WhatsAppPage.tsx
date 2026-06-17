import {useEffect, useState} from 'react'
import api from '@/services/api'

interface WAStatus {
    connected: boolean
    instanceName: string | null
    phoneNumber: string | null
    qrCodeBase64: string | null
}

interface WAStats {
    sentToday: number
    sentThisMonth: number
    sentTotal: number
}

interface Charge {
    id: string
    studentName: string
    dueDate: string
    paymentDate: string | null
    status: string
    whatsappSentAt: string | null
}

interface Templates {
    chargeNotificationPix: string
    chargeNotificationBoleto: string
    reminderPix: string
    reminderBoleto: string
}

const TEMPLATE_LABELS: { key: keyof Templates; name: string; trigger: string }[] = [
    { key: 'chargeNotificationPix',    name: 'Cobrança — PIX',             trigger: 'Enviado ao criar cobrança · aluno com preferência PIX' },
    { key: 'chargeNotificationBoleto', name: 'Cobrança — Boleto',           trigger: 'Enviado ao criar cobrança · aluno com preferência Boleto' },
    { key: 'reminderPix',              name: 'Lembrete de atraso — PIX',    trigger: 'Enviado automaticamente · aluno com preferência PIX' },
    { key: 'reminderBoleto',           name: 'Lembrete de atraso — Boleto', trigger: 'Enviado automaticamente · aluno com preferência Boleto' },
]

const VARIABLES_HINT = [
    { v: '{aluno}',      desc: 'Primeiro nome do aluno' },
    { v: '{valor}',      desc: 'Valor da cobrança (ex: 150,00)' },
    { v: '{data}',       desc: 'Data de vencimento (dd/MM)' },
    { v: '{label_data}', desc: 'Rótulo da data (hoje / amanhã / em dd/MM/yyyy)' },
    { v: '{dias}',       desc: 'Dias em atraso (só nos lembretes)' },
]

export default function WhatsAppPage() {
    const [status, setStatus]               = useState<WAStatus | null>(null)
    const [stats, setStats]                 = useState<WAStats | null>(null)
    const [loading, setLoading]             = useState(true)
    const [refreshing, setRefreshing]   = useState(false)
    const [refreshError, setRefreshError] = useState<string | null>(null)
    const [recentSends, setRecentSends]     = useState<Charge[]>([])

    // Templates
    const [templates, setTemplates]           = useState<Templates | null>(null)
    const [editingKey, setEditingKey]         = useState<keyof Templates | null>(null)
    const [editingValue, setEditingValue]     = useState('')
    const [savingTemplate, setSavingTemplate] = useState(false)
    const [saveResult, setSaveResult]         = useState<{ success: boolean; text: string } | null>(null)

    useEffect(() => {
        Promise.all([
            api.get<WAStatus>('/tenants/me/whatsapp'),
            api.get<WAStats>('/tenants/me/whatsapp/stats'),
            api.get('/charges?size=20&sort=whatsappSentAt,desc'),
            api.get<Templates>('/tenants/me/whatsapp/templates'),
        ])
            .then(([waRes, statsRes, chargesRes, tplRes]) => {
                setStatus(waRes.data)
                setStats(statsRes.data)
                setTemplates(tplRes.data)

                const charges: Charge[] = Array.isArray(chargesRes.data)
                    ? chargesRes.data
                    : (chargesRes.data?.content ?? [])

                setRecentSends(charges.filter((c) => c.whatsappSentAt != null).slice(0, 10))
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    function refreshStatus() {
        setRefreshing(true)
        setRefreshError(null)
        api.get<WAStatus>('/tenants/me/whatsapp')
            .then((r) => setStatus(r.data))
            .catch((e) => setRefreshError(e.response?.data?.message ?? e.message ?? 'Erro desconhecido'))
            .finally(() => setRefreshing(false))
    }

    function startEdit(key: keyof Templates) {
        setEditingKey(key)
        setEditingValue(templates?.[key] ?? '')
        setSaveResult(null)
    }

    function cancelEdit() {
        setEditingKey(null)
        setEditingValue('')
        setSaveResult(null)
    }

    async function saveTemplate() {
        if (!editingKey || !templates) return
        setSavingTemplate(true)
        setSaveResult(null)
        const updated = { ...templates, [editingKey]: editingValue }
        try {
            const res = await api.put<Templates>('/tenants/me/whatsapp/templates', updated)
            setTemplates(res.data)
            setSaveResult({ success: true, text: 'Template salvo com sucesso!' })
            setTimeout(() => { setEditingKey(null); setSaveResult(null) }, 1200)
        } catch (e: any) {
            setSaveResult({ success: false, text: e?.response?.data?.message ?? 'Erro ao salvar.' })
        } finally {
            setSavingTemplate(false)
        }
    }

    const connected = status?.connected ?? false

    function formatSentAt(iso: string) {
        const d = new Date(iso)
        const today = new Date()
        const isToday =
            d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear()
        const hh = d.getHours().toString().padStart(2, '0')
        const mm = d.getMinutes().toString().padStart(2, '0')
        if (isToday) return `hoje ${hh}:${mm}`
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${hh}:${mm}`
    }

    return (
        <div className="ms-page" style={{ maxWidth: 1100 }}>
            {/* Header */}
            <div className="ms-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>INTEGRAÇÃO</p>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>WhatsApp</h1>
                    <p style={{ fontSize: 14, color: '#6b7280' }}>Status da conexão, templates de mensagem e histórico de envios.</p>
                </div>
                <button
                    className="ms-action-button"
                    onClick={refreshStatus}
                    disabled={refreshing}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: refreshing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 500, color: '#374151', opacity: refreshing ? 0.6 : 1 }}
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.87" />
                    </svg>
                    {refreshing ? 'Atualizando...' : 'Atualizar status'}
                </button>
            </div>

            {refreshError && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
                    Falha ao atualizar: {refreshError}
                </div>
            )}

            {loading ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Carregando...</div>
            ) : (
                <>
                    {/* Status + Stats cards */}
                    <div className="ms-kpi-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 28, background: '#e5e7eb', gap: 1 }}>

                        {/* Conexão */}
                        <div style={{ background: '#fff', padding: '24px 28px' }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 14px' }}>
                                {connected ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                        CONECTADO
                                    </span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d1d5db', display: 'inline-block' }} />
                                        DESCONECTADO
                                    </span>
                                )}
                            </p>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Evolution API</p>
                            {status?.instanceName && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 2px' }}>Instância: {status.instanceName}</p>}
                            {status?.phoneNumber  && <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Número: {status.phoneNumber}</p>}
                        </div>

                        {/* Enviadas hoje */}
                        <div style={{ background: '#fff', padding: '24px 28px' }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 14px' }}>ENVIADAS HOJE</p>
                            <p style={{ fontSize: 32, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
                                {stats?.sentToday ?? '—'}
                            </p>
                            <p style={{ fontSize: 12, color: '#6b7280' }}>
                                {stats?.sentThisMonth != null
                                    ? `${stats.sentThisMonth} este mês`
                                    : 'carregando...'}
                            </p>
                        </div>

                        {/* Total enviado */}
                        <div style={{ background: '#fff', padding: '24px 28px' }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', margin: '0 0 14px' }}>TOTAL ENVIADO</p>
                            <p style={{ fontSize: 32, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
                                {stats?.sentTotal ?? '—'}
                            </p>
                            <p style={{ fontSize: 12, color: '#6b7280' }}>mensagens desde o início</p>
                        </div>
                    </div>

                    {/* Templates */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>Templates de mensagem</h2>
                            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
                                Personalize o texto enviado automaticamente para cada tipo de cobrança.
                            </p>
                        </div>
                    </div>

                    {/* Variáveis disponíveis */}
                    <div className="ms-info-panel" style={{ marginBottom: 16, padding: '12px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <svg width="15" height="15" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Variáveis disponíveis nos templates</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px' }}>
                                {VARIABLES_HINT.map(v => (
                                    <span key={v.v} style={{ fontSize: 12, color: '#6b7280' }}>
                                        <code style={{ fontSize: 11, background: '#e5e7eb', padding: '1px 5px', borderRadius: 4, color: '#374151', marginRight: 4 }}>{v.v}</code>
                                        {v.desc}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="ms-template-list" style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 28, background: '#fff' }}>
                        {TEMPLATE_LABELS.map((tpl, i) => {
                            const isEditing = editingKey === tpl.key
                            const value = templates?.[tpl.key] ?? ''
                            return (
                                <div className="ms-template-item" key={tpl.key} style={{ borderBottom: i < TEMPLATE_LABELS.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                    <div className="ms-template-head" style={{ padding: '18px 24px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                                            <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="1.8" viewBox="0 0 24 24">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                            </svg>
                                        </div>
                                        <div className="ms-template-title" style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tpl.name}</span>
                                            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{tpl.trigger}</p>
                                        </div>
                                        {!isEditing && (
                                            <button
                                                onClick={() => startEdit(tpl.key)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151', flexShrink: 0 }}
                                            >
                                                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                                </svg>
                                                Editar
                                            </button>
                                        )}
                                    </div>

                                    {!isEditing ? (
                                        <div className="ms-template-body" style={{ margin: '0 24px 18px 74px', padding: '12px 16px', background: '#f9fafb', borderRadius: 8, fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-line', fontFamily: 'inherit' }}>
                                            {value}
                                        </div>
                                    ) : (
                                        <div className="ms-template-editor" style={{ margin: '0 24px 20px 74px' }}>
                                            <textarea
                                                value={editingValue}
                                                onChange={e => setEditingValue(e.target.value)}
                                                rows={7}
                                                style={{ width: '100%', padding: '10px 13px', border: '1.5px solid #6366f1', borderRadius: 9, fontSize: 13, color: '#111827', fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                                            />
                                            {saveResult && (
                                                <p style={{ fontSize: 12.5, fontWeight: 500, color: saveResult.success ? '#15803d' : '#dc2626', margin: '6px 0 8px' }}>
                                                    {saveResult.text}
                                                </p>
                                            )}
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                <button onClick={cancelEdit} style={{ padding: '7px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#6b7280' }}>
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={saveTemplate}
                                                    disabled={savingTemplate}
                                                    style={{ padding: '7px 18px', border: 'none', borderRadius: 8, background: savingTemplate ? '#c7d2fe' : '#6366f1', cursor: savingTemplate ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, color: '#fff' }}
                                                >
                                                    {savingTemplate ? 'Salvando...' : 'Salvar template'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Histórico recente */}
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>Histórico recente</h2>
                    <div className="ms-list-panel" style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                        {recentSends.length === 0 ? (
                            <p style={{ padding: 32, textAlign: 'center', color: '#9ca3af', margin: 0 }}>Nenhuma mensagem enviada ainda.</p>
                        ) : (
                            recentSends.map((c, i) => (
                                <div className="ms-history-row" key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: i < recentSends.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                    <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    <span style={{ fontSize: 13, color: '#9ca3af', width: 90, flexShrink: 0 }}>{formatSentAt(c.whatsappSentAt!)}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>{c.studentName}</span>
                                    <span style={{ fontSize: 13, color: '#6b7280' }}>
                                        vencimento {new Date(c.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c.status === 'PAID' ? '#dcfce7' : c.status === 'OVERDUE' ? '#fee2e2' : '#f3f4f6', color: c.status === 'PAID' ? '#15803d' : c.status === 'OVERDUE' ? '#dc2626' : '#6b7280' }}>
                                        {c.status === 'PAID' ? 'Pago' : c.status === 'OVERDUE' ? 'Em atraso' : 'Pendente'}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
