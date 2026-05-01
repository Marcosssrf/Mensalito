import {useEffect, useRef, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import api from '@/services/api'
import type {Tenant} from '@/types'
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    KeyRound,
    Loader2,
    RefreshCw,
    Smartphone,
    Wifi,
    WifiOff
} from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function Section({ title, icon: Icon, children }: {
    title: string
    icon: React.ElementType
    children: React.ReactNode
}) {
    return (
        <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2.5">
                <Icon size={15} className="text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            </div>
            <div className="p-5">{children}</div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs text-zinc-500">{label}</label>
            {children}
        </div>
    )
}

const inputCls = "w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"

type WaStatus = 'idle' | 'loading' | 'qr' | 'connected' | 'error'

interface WaState {
    status: WaStatus
    qrBase64?: string
    errorMsg?: string
}

export default function SettingsPage() {
    const { user } = useAuth()

    // ── School data ────────────────────────────────────────────────────────────
    const [tenant, setTenant] = useState<Tenant | null>(null)
    const [form, setForm] = useState({ name: '', email: '', phone: '', document: '' })
    const [schoolSave, setSchoolSave] = useState<SaveState>('idle')

    // ── AbacatePay ────────────────────────────────────────────────────────────
    const [apiKey, setApiKey] = useState('')
    const [hasKey, setHasKey] = useState(false)
    const [editingKey, setEditingKey] = useState(false)
    const [keySave, setKeySave] = useState<SaveState>('idle')

    // ── WhatsApp / Evolution ──────────────────────────────────────────────────
    const [wa, setWa] = useState<WaState>({ status: 'idle' })
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // ── Evolution base URL (user configures in this same settings page) ───────
    const [evoUrl, setEvoUrl] = useState(() => localStorage.getItem('evo_url') || '')
    const [evoKey, setEvoKey] = useState(() => localStorage.getItem('evo_key') || '')
    const [evoInstance, setEvoInstance] = useState(() => localStorage.getItem('evo_instance') || '')
    const [evoSave, setEvoSave] = useState<SaveState>('idle')

    // ─── Load tenant ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user?.tenantId) return
        api.get<Tenant & { hasAbacatePayKey?: boolean }>(`/tenants/${user.tenantId}`)
            .then(r => {
                setTenant(r.data)
                setForm({
                    name: r.data.name || '',
                    email: r.data.email || '',
                    phone: r.data.phone || '',
                    document: r.data.document || '',
                })
                // Backend may return hasAbacatePayKey boolean
                if (typeof r.data.hasAbacatePayKey === 'boolean') {
                    setHasKey(r.data.hasAbacatePayKey)
                }
            })
            .catch(() => {})
    }, [user?.tenantId])

    // ─── Stop polling on unmount ───────────────────────────────────────────────
    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

    // ─── Save school data ──────────────────────────────────────────────────────
    async function saveSchool() {
        if (!user?.tenantId) return
        setSchoolSave('saving')
        try {
            await api.patch(`/tenants/${user.tenantId}`, form)
            setSchoolSave('saved')
            setTimeout(() => setSchoolSave('idle'), 2500)
        } catch {
            setSchoolSave('error')
            setTimeout(() => setSchoolSave('idle'), 2500)
        }
    }

    // ─── Save AbacatePay key ───────────────────────────────────────────────────
    async function saveApiKey() {
        if (!apiKey.trim()) return
        setKeySave('saving')
        try {
            await api.put('/tenants/me/api-key', { abacatePayApiKey: apiKey })
            setHasKey(true)
            setApiKey('')
            setEditingKey(false)
            setKeySave('saved')
            setTimeout(() => setKeySave('idle'), 2500)
        } catch {
            setKeySave('error')
            setTimeout(() => setKeySave('idle'), 2500)
        }
    }

    // ─── Save Evolution config locally ────────────────────────────────────────
    function saveEvoConfig() {
        localStorage.setItem('evo_url', evoUrl)
        localStorage.setItem('evo_key', evoKey)
        localStorage.setItem('evo_instance', evoInstance)
        setEvoSave('saved')
        setTimeout(() => setEvoSave('idle'), 2000)
    }

    // ─── Evolution API helpers (called from browser, bypasses Spring) ──────────
    function evoHeaders() {
        return { 'Content-Type': 'application/json', apikey: evoKey }
    }

    async function checkConnectionStatus(): Promise<boolean> {
        try {
            const res = await fetch(`${evoUrl}/instance/connectionState/${evoInstance}`, {
                headers: evoHeaders(),
            })
            const data = await res.json()
            // Evolution API returns { instance: { state: "open" | "close" | ... } }
            return data?.instance?.state === 'open' || data?.state === 'open'
        } catch {
            return false
        }
    }

    async function connectWhatsApp() {
        if (!evoUrl || !evoKey || !evoInstance) {
            setWa({ status: 'error', errorMsg: 'Configure a URL, chave e instância da Evolution API primeiro.' })
            return
        }

        setWa({ status: 'loading' })

        // Check if already connected
        const already = await checkConnectionStatus()
        if (already) {
            setWa({ status: 'connected' })
            return
        }

        try {
            // Try to create instance (may already exist — ignore 4xx)
            await fetch(`${evoUrl}/instance/create`, {
                method: 'POST',
                headers: evoHeaders(),
                body: JSON.stringify({ instanceName: evoInstance, qrcode: true }),
            }).catch(() => {})

            // Fetch QR code
            const res = await fetch(`${evoUrl}/instance/connect/${evoInstance}`, {
                headers: evoHeaders(),
            })
            const data = await res.json()

            // Evolution returns base64 qrcode in different shapes depending on version
            const qr: string | undefined =
                data?.base64 ||
                data?.qrcode?.base64 ||
                data?.code

            if (qr) {
                setWa({ status: 'qr', qrBase64: qr })
                startPolling()
            } else {
                setWa({ status: 'error', errorMsg: 'Não foi possível gerar o QR Code. Verifique as configurações.' })
            }
        } catch (e) {
            setWa({ status: 'error', errorMsg: 'Erro de conexão com a Evolution API. Verifique a URL.' })
        }
    }

    function startPolling() {
        if (pollRef.current) clearInterval(pollRef.current)
        pollRef.current = setInterval(async () => {
            const connected = await checkConnectionStatus()
            if (connected) {
                clearInterval(pollRef.current!)
                pollRef.current = null
                setWa({ status: 'connected' })
            }
        }, 3000)
    }

    async function disconnectWhatsApp() {
        try {
            await fetch(`${evoUrl}/instance/logout/${evoInstance}`, {
                method: 'DELETE',
                headers: evoHeaders(),
            })
        } catch { /* noop */ }
        if (pollRef.current) clearInterval(pollRef.current)
        setWa({ status: 'idle' })
    }

    // ─── Save button label ────────────────────────────────────────────────────
    function saveBtnLabel(state: SaveState, labels = { idle: 'Salvar', saving: 'Salvando...', saved: 'Salvo!', error: 'Erro ao salvar' }) {
        return labels[state]
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5 max-w-2xl" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            <div>
                <h1 className="text-lg font-semibold text-zinc-900">Configurações</h1>
                <p className="text-sm text-zinc-400 mt-0.5">Gerencie os dados e integrações da sua escola</p>
            </div>

            {/* ── Dados da escola ─────────────────────────────────────────── */}
            <Section title="Dados da escola" icon={Building2}>
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Nome da escola">
                            <input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Escola de Inglês"
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Email">
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                placeholder="contato@escola.com"
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Telefone">
                            <input
                                value={form.phone}
                                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                placeholder="(34) 99999-9999"
                                className={inputCls}
                            />
                        </Field>
                        <Field label="CPF / CNPJ">
                            <input
                                value={form.document}
                                onChange={e => setForm(f => ({ ...f, document: e.target.value }))}
                                placeholder="Somente números"
                                className={inputCls}
                            />
                        </Field>
                    </div>
                    <div className="flex justify-end">
                        <SaveButton state={schoolSave} onClick={saveSchool} />
                    </div>
                </div>
            </Section>

            {/* ── AbacatePay ─────────────────────────────────────────────── */}
            <Section title="AbacatePay" icon={KeyRound}>
                <div className="space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                        Sua chave é armazenada de forma criptografada e nunca é exibida novamente por segurança.
                    </p>

                    {hasKey && !editingKey ? (
                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={15} className="text-emerald-600" />
                                <span className="text-sm text-emerald-700 font-medium">Chave cadastrada</span>
                            </div>
                            <button
                                onClick={() => setEditingKey(true)}
                                className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                            >
                                Alterar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {hasKey && (
                                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                    Ao salvar, a chave atual será substituída.
                                </p>
                            )}
                            <Field label="Chave de API">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={e => setApiKey(e.target.value)}
                                    placeholder="eyJ..."
                                    autoComplete="off"
                                    className={inputCls}
                                />
                            </Field>
                            <div className="flex gap-2 justify-end">
                                {hasKey && (
                                    <button
                                        onClick={() => { setEditingKey(false); setApiKey('') }}
                                        className="text-xs text-zinc-400 hover:text-zinc-700 px-3 py-2 rounded-md border border-zinc-200 hover:bg-zinc-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                )}
                                <SaveButton state={keySave} onClick={saveApiKey} label="Salvar chave" />
                            </div>
                        </div>
                    )}
                </div>
            </Section>

            {/* ── Evolution API config ────────────────────────────────────── */}
            <Section title="WhatsApp (Evolution API)" icon={Smartphone}>
                <div className="space-y-5">

                    {/* Config fields */}
                    <div className="space-y-3">
                        <p className="text-xs text-zinc-400 leading-relaxed">
                            Configure sua instância da Evolution API para envio de mensagens via WhatsApp.
                            Essas configurações ficam salvas no seu navegador.
                        </p>
                        <div className="space-y-3">
                            <Field label="URL da Evolution API">
                                <input
                                    value={evoUrl}
                                    onChange={e => setEvoUrl(e.target.value)}
                                    placeholder="https://evolution.suaempresa.com"
                                    className={inputCls}
                                />
                            </Field>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="API Key">
                                    <input
                                        type="password"
                                        value={evoKey}
                                        onChange={e => setEvoKey(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="off"
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Nome da instância">
                                    <input
                                        value={evoInstance}
                                        onChange={e => setEvoInstance(e.target.value)}
                                        placeholder="mensalito"
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={saveEvoConfig}
                                className="text-xs px-3 py-2 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors text-zinc-600"
                            >
                                {evoSave === 'saved' ? '✓ Configurações salvas' : 'Salvar configurações'}
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-zinc-100" />

                    {/* QR / Connection area */}
                    <div className="space-y-3">
                        <p className="text-xs text-zinc-500 font-medium">Conexão do WhatsApp</p>

                        {wa.status === 'idle' && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <WifiOff size={14} />
                                    <span className="text-sm">Não conectado</span>
                                </div>
                                <button
                                    onClick={connectWhatsApp}
                                    className="inline-flex items-center gap-2 text-sm bg-zinc-900 text-white px-4 py-2 rounded-md hover:bg-zinc-700 transition-colors"
                                >
                                    Gerar QR Code
                                </button>
                            </div>
                        )}

                        {wa.status === 'loading' && (
                            <div className="flex items-center gap-2 text-zinc-400">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-sm">Conectando...</span>
                            </div>
                        )}

                        {wa.status === 'error' && (
                            <div className="space-y-3">
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600">{wa.errorMsg}</p>
                                </div>
                                <button
                                    onClick={() => setWa({ status: 'idle' })}
                                    className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                                >
                                    Tentar novamente
                                </button>
                            </div>
                        )}

                        {wa.status === 'connected' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Wifi size={14} className="text-emerald-600" />
                                        <span className="text-sm text-emerald-700 font-medium">WhatsApp conectado</span>
                                    </div>
                                    <button
                                        onClick={disconnectWhatsApp}
                                        className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                                    >
                                        Desconectar
                                    </button>
                                </div>
                            </div>
                        )}

                        {wa.status === 'qr' && wa.qrBase64 && (
                            <div className="space-y-3">
                                <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-5 flex flex-col items-center gap-4">
                                    <div className="bg-white p-3 rounded-lg shadow-sm border border-zinc-100">
                                        <img
                                            src={wa.qrBase64.startsWith('data:') ? wa.qrBase64 : `data:image/png;base64,${wa.qrBase64}`}
                                            alt="QR Code WhatsApp"
                                            className="w-48 h-48 object-contain"
                                        />
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm text-zinc-700 font-medium">Escaneie com o WhatsApp</p>
                                        <p className="text-xs text-zinc-400">
                                            Abra o WhatsApp → Menu → Dispositivos conectados → Conectar dispositivo
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                                        <Loader2 size={12} className="animate-spin" />
                                        Aguardando conexão...
                                    </div>
                                </div>
                                <button
                                    onClick={connectWhatsApp}
                                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
                                >
                                    <RefreshCw size={12} />
                                    Gerar novo QR Code
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Section>
        </div>
    )
}

// ─── Save Button ──────────────────────────────────────────────────────────────

function SaveButton({ state, onClick, label = 'Salvar' }: {
    state: SaveState
    onClick: () => void
    label?: string
}) {
    const isLoading = state === 'saving'
    const isSaved = state === 'saved'
    const isError = state === 'error'

    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md transition-colors disabled:opacity-50 ${
                isSaved ? 'bg-emerald-600 text-white' :
                isError ? 'bg-red-500 text-white' :
                'bg-zinc-900 text-white hover:bg-zinc-700'
            }`}
        >
            {isLoading && <Loader2 size={13} className="animate-spin" />}
            {isSaved && <CheckCircle2 size={13} />}
            {isLoading ? 'Salvando...' : isSaved ? 'Salvo!' : isError ? 'Erro ao salvar' : label}
        </button>
    )
}
