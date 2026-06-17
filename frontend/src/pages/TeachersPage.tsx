import {useEffect, useState} from 'react'
import api from '@/services/api'

interface TenantUser {
    id: string
    name: string
    email: string
    role: 'OWNER' | 'TEACHER'
    active: boolean
    createdAt: string
}

function initials(name: string) {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function fmtDate(s: string | null) {
    if (!s) return '—'
    const [date] = s.split('T')
    const [y, m, d] = date.split('-')
    return `${d}/${m}/${y}`
}

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
    OWNER:   { label: 'Dono',      color: '#7c3aed', bg: '#ede9fe' },
    TEACHER: { label: 'Professor', color: '#0369a1', bg: '#e0f2fe' },
}

export default function TeachersPage() {
    const [users, setUsers] = useState<TenantUser[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [error, setError] = useState('')

    function load() {
        setLoading(true)
        setError('')
        api.get<TenantUser[]>('/users')
            .then((r) => {
                const data = Array.isArray(r.data) ? r.data : []
                setUsers(data)
            })
            .catch((e) => {
                setError(e?.response?.data?.message ?? 'Erro ao carregar usuários')
            })
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    const filtered = users.filter((u) => {
        const q = search.toLowerCase()
        return (
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            ROLE_META[u.role]?.label.toLowerCase().includes(q)
        )
    })

    const owners  = filtered.filter(u => u.role === 'OWNER')
    const teachers = filtered.filter(u => u.role === 'TEACHER')

    return (
        <div className="ms-page" style={{ maxWidth: 1000 }}>
    {/* Header */}
    <div className="ms-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
    <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>EQUIPE</p>
    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Professores</h1>
    <p style={{ fontSize: 14, color: '#6b7280' }}>Usuários com acesso ao sistema e suas permissões.</p>
    </div>
    </div>

    {/* Search */}
    <div className="ms-search-wrap" style={{ position: 'relative', marginBottom: 24, maxWidth: 360 }}>
    <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
    width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Buscar por nome, e-mail ou cargo..."
    style={{
        paddingLeft: 32, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
            border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13,
            color: '#374151', outline: 'none', width: '100%', boxSizing: 'border-box',
    }}
    />
    </div>

    {error && (
        <div style={{
        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
            padding: '12px 16px', fontSize: 13, color: '#dc2626', marginBottom: 20,
    }}>
        {error}
        </div>
    )}

    {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Carregando...</div>
    ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Nenhum usuário encontrado.</div>
    ) : (
        <>
            {/* Owners section */}
        {owners.length > 0 && (
            <UserSection title="Donos" users={owners} />
        )}
        {/* Teachers section */}
        {teachers.length > 0 && (
            <UserSection title="Professores" users={teachers} />
        )}
        </>
    )}
    </div>
)
}

function UserSection({ title, users }: { title: string; users: TenantUser[] }) {
    return (
        <div style={{ marginBottom: 28 }}>
    <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: 10 }}>
    {title.toUpperCase()} · {users.length}
    </p>
    <div className="ms-list-panel" style={{ border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
    {/* Header */}
    <div className="ms-table-head" style={{
        display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr 0.8fr',
            padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
    }}>
    {['USUÁRIO', 'E-MAIL', 'CARGO', 'DESDE'].map((h) => (
        <span key={h} style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.05em' }}>{h}</span>
    ))}
    </div>

    {users.map((u, i) => {
        const role = ROLE_META[u.role] ?? { label: u.role, color: '#6b7280', bg: '#f3f4f6' }
        return (
            <div className="ms-table-row ms-teacher-row" key={u.id} style={{
            display: 'grid', gridTemplateColumns: '2.5fr 2fr 1fr 0.8fr',
                padding: '14px 20px', alignItems: 'center', background: '#fff',
                borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : 'none',
        }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
            width: 36, height: 36, borderRadius: '50%',
                background: u.role === 'OWNER' ? '#ede9fe' : '#dbeafe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700,
                color: u.role === 'OWNER' ? '#7c3aed' : '#1d4ed8',
                flexShrink: 0,
        }}>
        {initials(u.name)}
        </div>
        <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{u.name}</p>
        {!u.active && (
            <p style={{ fontSize: 11, color: '#ef4444', margin: '1px 0 0' }}>Inativo</p>
        )}
        </div>
        </div>

        {/* Email */}
        <span style={{ fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {u.email}
        </span>

        {/* Role badge */}
        <span style={{
            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: role.bg, color: role.color,
                display: 'inline-block', width: 'fit-content',
        }}>
        {role.label}
        </span>

        {/* Since date */}
        <span style={{ fontSize: 13, color: '#9ca3af' }}>{fmtDate(u.createdAt)}</span>
        </div>
    )
    })}
    </div>
    </div>
)
}
