import {NavLink, Outlet, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import {useEffect, useRef, useState} from 'react'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

const NAV = [
  { to: '/app/dashboard', label: 'Visão geral', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { to: '/app/students',  label: 'Alunos',      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/app/charges',   label: 'Cobranças',   icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
  { to: '/app/classes',   label: 'Turmas',      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
  { to: '/app/settings',  label: 'Configurações', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
]

function WABadge() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [instance, setInstance] = useState('')
  useEffect(() => {
    const url = localStorage.getItem('evo_url')
    const key = localStorage.getItem('evo_key')
    const inst = localStorage.getItem('evo_instance') ?? ''
    setInstance(inst)
    if (!url || !key || !inst) { setConnected(false); return }
    fetch(`${url}/instance/connectionState/${inst}`, { headers: { apikey: key } })
      .then(r => r.json())
      .then(d => setConnected(d?.instance?.state === 'open' || d?.state === 'open'))
      .catch(() => setConnected(false))
  }, [])
  if (connected === null) return null
  return (
    <div style={{ margin: '8px 10px 4px', padding: '10px 12px', borderRadius: 8, background: connected ? '#ecfdf5' : '#f9fafb', border: `1px solid ${connected ? '#a7f3d0' : '#e5e7eb'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#d1d5db' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: connected ? '#065f46' : '#9ca3af' }}>
          {connected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
        </span>
      </div>
      {connected && instance && <p style={{ fontSize: 11, color: '#6b7280', margin: '3px 0 0 14px' }}>{instance}</p>}
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
