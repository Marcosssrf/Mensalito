import type {ReactNode} from 'react'
import {createContext, useContext, useState} from 'react'
import api from '@/services/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  token: string
  name: string
  tenantId: string
  userId: string
  role: 'OWNER' | 'TEACHER'
  email: string
}

export interface LoginRequest    { email: string; password: string }
export interface RegisterRequest {
  name: string; email: string; password: string
  schoolName: string; schoolPhone?: string; schoolDocument?: string
}

interface AuthContextData {
  user: AuthUser | null
  login:    (data: LoginRequest)    => Promise<void>
  register: (data: RegisterRequest) => Promise<{ needsEmailConfirmation: boolean }>
  logout:   () => void
  isAuthenticated: boolean
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

async function supabaseLogin(email: string, password: string) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ email, password }),
    }
  )
  const data = await res.json()
  if (!res.ok) {
    // Supabase retorna error_code em inglês — traduzimos os mais comuns
    if (data.error_code === 'invalid_credentials' || data.error === 'invalid_grant') {
      throw new Error('Email ou senha inválidos.')
    }
    if (data.error_code === 'email_not_confirmed') {
      throw new Error('Confirme seu email antes de entrar. Verifique sua caixa de entrada.')
    }
    throw new Error(data.msg ?? data.error_description ?? 'Erro ao fazer login.')
  }
  return data as { access_token: string; refresh_token: string }
}

async function supabaseSignup(email: string, password: string) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/signup`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ email, password }),
    }
  )
  const data = await res.json()
  if (!res.ok) {
    if (data.msg?.includes('already registered') || data.error_code === 'user_already_exists') {
      throw new Error('Este email já está cadastrado. Tente fazer login.')
    }
    throw new Error(data.msg ?? data.error_description ?? 'Erro ao criar conta.')
  }
  // Se identities vier vazio, o email já existe no Supabase
  if (data.identities && data.identities.length === 0) {
    throw new Error('Este email já está cadastrado. Tente fazer login.')
  }
  // Se não veio access_token, o Supabase enviou email de confirmação
  const needsEmailConfirmation = !data.access_token
  return { data, needsEmailConfirmation }
}

// ─── Provision helper ─────────────────────────────────────────────────────────

async function provision(
  token: string,
  params: { email: string; name: string; schoolName?: string; schoolPhone?: string; schoolDocument?: string }
) {
  const res = await api.post('/auth/provision', params, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data as { id: string; name: string; email: string; role: string; tenantId?: string }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const s = localStorage.getItem('user')
    return s ? JSON.parse(s) : null
  })

  // ── Login ──────────────────────────────────────────────────────────────────
  async function login(data: LoginRequest) {
    // 1. Autentica no Supabase
    const { access_token, refresh_token } = await supabaseLogin(data.email, data.password)

    // 2. Provisiona (ou recupera) o usuário local no Spring
    const localUser = await provision(access_token, { email: data.email, name: '' })

    // 3. Busca o tenant
    let tenantName = ''
    try {
      const t = await api.get('/tenants/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      tenantName = t.data.name ?? ''
    } catch { /* ignora */ }

    const u: AuthUser = {
      token:    access_token,
      name:     localUser.name,
      email:    data.email,
      tenantId: localUser.tenantId ?? '',
      userId:   localUser.id,
      role:     localUser.role as 'OWNER' | 'TEACHER',
    }

    localStorage.setItem('token',       access_token)
    localStorage.setItem('refreshToken', refresh_token)
    localStorage.setItem('user',         JSON.stringify(u))
    localStorage.setItem('userName',     u.name)
    localStorage.setItem('tenantName',   tenantName)
    setUser(u)
  }

  // ── Register ───────────────────────────────────────────────────────────────
  async function register(data: RegisterRequest) {
    // 1. Cria o usuário no Supabase
    const { data: sbData, needsEmailConfirmation } = await supabaseSignup(data.email, data.password)

    if (needsEmailConfirmation) {
      // Supabase mandou email de confirmação — não temos token ainda.
      // Salvamos os dados do formulário para provisionar depois do redirect.
      localStorage.setItem('pendingProvision', JSON.stringify({
        name:           data.name,
        email:          data.email,
        schoolName:     data.schoolName,
        schoolPhone:    data.schoolPhone    ?? '',
        schoolDocument: data.schoolDocument ?? '',
      }))
      return { needsEmailConfirmation: true }
    }

    // 2. Confirmação automática (Supabase com "Confirm email" desativado) — provisiona já
    const access_token = sbData.access_token
    const localUser = await provision(access_token, {
      email:          data.email,
      name:           data.name,
      schoolName:     data.schoolName,
      schoolPhone:    data.schoolPhone,
      schoolDocument: data.schoolDocument,
    })

    let tenantName = data.schoolName
    try {
      const t = await api.get('/tenants/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      tenantName = t.data.name ?? data.schoolName
    } catch { /* ignora */ }

    const u: AuthUser = {
      token:    access_token,
      name:     localUser.name,
      email:    data.email,
      tenantId: localUser.tenantId ?? '',
      userId:   localUser.id,
      role:     localUser.role as 'OWNER' | 'TEACHER',
    }

    localStorage.setItem('token',        access_token)
    localStorage.setItem('refreshToken', sbData.refresh_token)
    localStorage.setItem('user',         JSON.stringify(u))
    localStorage.setItem('userName',     u.name)
    localStorage.setItem('tenantName',   tenantName)
    setUser(u)

    return { needsEmailConfirmation: false }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function logout() {
    api.post('/auth/logout').catch(() => {})
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
