import {NavLink, Outlet, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import {useEffect, useRef, useState} from 'react'
import api from '@/services/api'
import BrandMark from '@/components/BrandMark'

function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const NAV_MAIN = [
    { to: '/app/dashboard',   label: 'Visão geral',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
    { to: '/app/students',    label: 'Alunos',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { to: '/app/enrollments', label: 'Matrículas',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> },
    { to: '/app/charges',     label: 'Cobranças',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { to: '/app/classes',     label: 'Turmas',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
    { to: '/app/plans',       label: 'Planos',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { to: '/app/teachers',    label: 'Professores',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
]

const NAV_TOOLS = [
    { to: '/app/whatsapp',    label: 'WhatsApp',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> },
    { to: '/app/reports',     label: 'Relatórios',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
    { to: '/app/activity',    label: 'Atividade',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
]

const NAV_ACCOUNT = [
    { to: '/app/billing',     label: 'Plano e Fatura',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { to: '/app/settings',    label: 'Configurações',
        icon: <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 9,
    padding: '7px 11px', borderRadius: 7,
    textDecoration: 'none',
    fontSize: 13.5,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#18181b' : '#71717a',
    background: isActive ? '#f4f4f5' : 'transparent',
    marginBottom: 1,
    transition: 'background 0.12s, color 0.12s',
})

function NavGroup({ label, items, onNavigate }: { label: string; items: typeof NAV_MAIN; onNavigate?: () => void }) {
    return (
        <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.09em', padding: '0 11px', marginBottom: 4, textTransform: 'uppercase' }}>{label}</p>
            {items.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} onClick={onNavigate} style={({ isActive }) => navItemStyle(isActive)}>
                    {icon}{label}
                </NavLink>
            ))}
        </div>
    )
}

function StatusDot({ ok, loading }: { ok: boolean | null; loading: boolean }) {
    const color = loading ? '#fbbf24' : ok ? '#22c55e' : '#d1d5db'
    return <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
}

function WABadge() {
    const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
    const [instanceName, setInstanceName] = useState<string | null>(null)
    const { user } = useAuth()

    useEffect(() => {
        if (!user) return
        api.get<{ connected: boolean; instanceName: string | null; phoneNumber: string | null }>('/tenants/me/whatsapp')
            .then(r => {
                if (r.data.connected) {
                    setStatus('connected')
                    setPhoneNumber(r.data.phoneNumber ?? null)
                    setInstanceName(r.data.instanceName ?? null)
                } else setStatus('disconnected')
            })
            .catch(() => setStatus('disconnected'))
    }, [user])

    const connected = status === 'connected'
    const sublabel = status === 'loading' ? 'Verificando...' : connected ? (phoneNumber ?? instanceName ?? 'Conectado') : 'Desconectado'

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 7 }}>
            <StatusDot ok={connected} loading={status === 'loading'} />
            <div>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: '#52525b', margin: 0, lineHeight: 1 }}>WhatsApp</p>
                <p style={{ fontSize: 11, color: '#a1a1aa', margin: '3px 0 0' }}>{sublabel}</p>
            </div>
        </div>
    )
}

function MPBadge() {
    const [configured, setConfigured] = useState<boolean | null>(null)
    const { user } = useAuth()

    useEffect(() => {
        if (!user || !user.tenantId) return
        api.get<{ hasMercadoPagoApi?: boolean }>(`/tenants/${user.tenantId}`)
            .then(r => {
                const val = r.data.hasMercadoPagoApi ?? (localStorage.getItem('mercadopago_configured') === '1')
                setConfigured(val)
                localStorage.setItem('mercadopago_configured', val ? '1' : '0')
            })
            .catch(() => setConfigured(localStorage.getItem('mercadopago_configured') === '1'))
    }, [user])

    if (configured === null) return null

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 11px', borderRadius: 7 }}>
            <StatusDot ok={configured} loading={false} />
            <div>
                <p style={{ fontSize: 12.5, fontWeight: 500, color: '#52525b', margin: 0, lineHeight: 1 }}>Mercado Pago</p>
                <p style={{ fontSize: 11, color: '#a1a1aa', margin: '3px 0 0' }}>{configured ? 'Configurado' : 'Não configurado'}</p>
            </div>
        </div>
    )
}

function UserMenu({ tenantName, userName, role }: { tenantName: string; userName: string; role: string }) {
    const [open, setOpen] = useState(false)
    const { logout } = useAuth()
    const navigate = useNavigate()
    const ref = useRef<HTMLDivElement>(null)
    const firstName = userName.trim().split(/\s+/)[0] || 'Usuário'
    const roleLabel = role === 'OWNER' ? 'Administrador' : 'Professor'

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', border: '1.5px solid #e8eaed',
                    background: open ? '#f4f4f5' : '#fff',
                    cursor: 'pointer', borderRadius: 8,
                    transition: 'background 0.12s',
                }}
            >
                <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                    {initials(userName)}
                </div>
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#18181b', margin: 0, lineHeight: 1.2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstName}</p>
                    <p style={{ fontSize: 11, color: '#a1a1aa', margin: 0 }}>{roleLabel}</p>
                </div>
                <svg width="12" height="12" fill="none" stroke="#a1a1aa" strokeWidth="2" viewBox="0 0 24 24" style={{ marginLeft: 2 }}>
                    <polyline points="6 9 12 15 18 9"/>
                </svg>
            </button>
            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                    background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 10,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.10)', minWidth: 190, zIndex: 50, overflow: 'hidden',
                }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f4f4f5' }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#18181b', margin: 0 }}>{userName}</p>
                        <p style={{ fontSize: 11.5, color: '#a1a1aa', margin: '3px 0 0' }}>{tenantName} · {role === 'OWNER' ? 'Dono da escola' : 'Professor'}</p>
                    </div>
                    <button
                        onClick={() => { setOpen(false); navigate('/app/settings') }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#3f3f46', textAlign: 'left' }}
                    >
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                        Configurações
                    </button>
                    <button
                        onClick={() => { logout(); navigate('/login') }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444', borderTop: '1px solid #f4f4f5', textAlign: 'left' }}
                    >
                        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Sair
                    </button>
                </div>
            )}
        </div>
    )
}

export default function Layout() {
    const { user } = useAuth()
    const userName = user?.name ?? localStorage.getItem('userName') ?? 'Usuário'
    const tenantName = localStorage.getItem('tenantName') ?? 'Escola'
    const role = user?.role ?? 'OWNER'
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    useEffect(() => {
        document.body.style.overflow = mobileNavOpen ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [mobileNavOpen])

    const closeMobileNav = () => setMobileNavOpen(false)

    return (
        <div className="app-shell">
            {mobileNavOpen && <button className="app-sidebar-backdrop" aria-label="Fechar menu" onClick={closeMobileNav} />}

            {/* Sidebar */}
            <aside className={`app-sidebar${mobileNavOpen ? ' app-sidebar-open' : ''}`}>
                {/* Logo */}
                <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid #f4f4f5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <BrandMark />
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#18181b', letterSpacing: '-0.02em' }}>Mensalito</span>
                        </div>
                        <button className="app-sidebar-close" onClick={closeMobileNav} aria-label="Fechar menu">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
                    <NavGroup label="Principal" items={NAV_MAIN} onNavigate={closeMobileNav} />
                    <NavGroup label="Ferramentas" items={NAV_TOOLS} onNavigate={closeMobileNav} />
                    <NavGroup label="Conta" items={NAV_ACCOUNT} onNavigate={closeMobileNav} />
                </nav>

                {/* Status footer */}
                <div style={{ borderTop: '1px solid #f4f4f5', padding: '8px 0 12px' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.09em', padding: '0 11px', marginBottom: 4, textTransform: 'uppercase' }}>Integrações</p>
                    <WABadge />
                    <MPBadge />
                </div>
            </aside>

            {/* Main */}
            <div className="app-main">
                {/* Topbar */}
                <header className="app-topbar">
                    <button className="app-menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menu">
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <UserMenu tenantName={tenantName} userName={userName} role={role} />
                </header>

                {/* Content */}
                <main className="app-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
