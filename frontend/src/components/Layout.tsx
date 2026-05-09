import {NavLink, Outlet, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import {useEffect, useRef, useState} from 'react'
import api from '@/services/api'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const NAV = [
  { to: '/app/dashboard',   label: 'Visão geral',  icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { to: '/app/students',    label: 'Alunos',       icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/app/charges',     label: 'Cobranças',    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
  { to: '/app/classes',     label: 'Turmas',       icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
  { to: '/app/plans',       label: 'Planos',       icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
  { to: '/app/enrollments', label: 'Matrículas',   icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg> },
  { to: '/app/reports',     label: 'Relatórios',   icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { to: '/app/whatsapp',    label: 'WhatsApp',     icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { to: '/app/activity',    label: 'Atividade',    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { to: '/app/billing',     label: 'Plano e Fatura', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
  { to: '/app/settings',    label: 'Configurações', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

function WABadge() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading')
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    api.get<{ connected: boolean; instanceName: string | null; qrCodeBase64: string | null; phoneNumber: string | null }>('/tenants/me/whatsapp')
      .then(r => {
        if (r.data.connected) {
          setStatus('connected')
          setPhoneNumber(r.data.phoneNumber ?? null)
          setInstanceName(r.data.instanceName ?? null)
        } else {
          setStatus('disconnected')
        }
      })
      .catch(() => setStatus('disconnected'))
  }, [user])

  const connected = status === 'connected'

  // Mostra número formatado, ou instanceName como fallback, ou "Conectado"
  const connectedLabel = phoneNumber ?? instanceName ?? 'Conectado'

  return (
    <div style={{
      margin: '4px 10px',
      padding: '10px 12px',
      borderRadius: 8,
      background: connected ? '#ecfdf5' : '#f9fafb',
      border: `1px solid ${connected ? '#a7f3d0' : '#e5e7eb'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: status === 'loading' ? '#fcd34d' : connected ? '#10b981' : '#d1d5db',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: connected ? '#065f46' : '#9ca3af' }}>
          WhatsApp
        </span>
      </div>
      <p style={{ fontSize: 11, margin: '3px 0 0 14px', color: '#6b7280' }}>
        {status === 'loading' && 'Verificando...'}
        {status === 'disconnected' && 'Desconectado'}
        {status === 'connected' && connectedLabel}
      </p>
    </div>
  )
}

function AbacateBadge() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    // Try to get the real status from the API
    api.get<{ hasAbacatePayKey?: boolean }>(`/tenants/${user.tenantId}`)
      .then(r => {
        if (r.data.hasAbacatePayKey !== undefined) {
          const val = r.data.hasAbacatePayKey
          setConfigured(val)
          localStorage.setItem('abacate_configured', val ? '1' : '0')
        } else {
          // fallback to localStorage if backend doesn't return the field yet
          setConfigured(localStorage.getItem('abacate_configured') === '1')
        }
      })
      .catch(() => {
        setConfigured(localStorage.getItem('abacate_configured') === '1')
      })
  }, [user])

  if (configured === null) return null

  return (
    <div style={{
      margin: '4px 10px',
      padding: '10px 12px',
      borderRadius: 8,
      background: configured ? '#ecfdf5' : '#f9fafb',
      border: `1px solid ${configured ? '#a7f3d0' : '#e5e7eb'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: configured ? '#10b981' : '#d1d5db',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: configured ? '#065f46' : '#9ca3af' }}>
          AbacatePay
        </span>
      </div>
      <p style={{ fontSize: 11, margin: '3px 0 0 14px', color: '#6b7280' }}>
        {configured ? 'Configurado' : 'Não configurado'}
      </p>
    </div>
  )
}

function TenantMenu({ tenantName, userName, role }: { tenantName: string; userName: string; role: string }) {
  const [open, setOpen] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>{tenantName}</span>
        <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 180, zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{userName}</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>{role === 'OWNER' ? 'Dono' : 'Professor'}</p>
          </div>
          <button onClick={() => { setOpen(false); navigate('/app/settings') }} style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#374151' }}>Configurações</button>
          <button onClick={() => { logout(); navigate('/login') }} style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#ef4444', borderTop: '1px solid #f3f4f6' }}>Sair</button>
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
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9fafb', fontFamily: "'Inter', sans-serif" }}>
      <aside style={{ width: 220, flexShrink: 0, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 40 }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: '#111827', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>M</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Mensalito</span>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', padding: '0 10px', margin: '4px 0 8px' }}>NAVEGAÇÃO</p>
          {NAV.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
              textDecoration: 'none', fontSize: 14, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#111827' : '#6b7280', background: isActive ? '#f3f4f6' : 'transparent', marginBottom: 2,
            })}>
              {icon}{label}
            </NavLink>
          ))}
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em', padding: '0 10px', margin: '16px 0 8px' }}>STATUS</p>
          <WABadge />
          <AbacateBadge />
        </nav>
      </aside>
      <div style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 56, background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 32px', position: 'sticky', top: 0, zIndex: 30, gap: 10 }}>
          <TenantMenu tenantName={tenantName} userName={userName} role={role} />
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {initials(userName)}
          </div>
        </header>
        <main style={{ flex: 1, overflowY: 'auto' }}><Outlet /></main>
      </div>
    </div>
  )
}
