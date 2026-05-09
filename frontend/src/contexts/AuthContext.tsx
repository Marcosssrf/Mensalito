import type {ReactNode} from 'react'
import {createContext, useContext, useState} from 'react'
import api from '@/services/api'

export interface LoginResponse {
  token: string
  name: string
  tenantId: string
  userId: string
  role: 'OWNER' | 'TEACHER'
}
export interface LoginRequest { email: string; password: string }
export interface RegisterRequest { name: string; email: string; password: string; schoolName: string; schoolPhone?: string; schoolDocument?: string }

interface AuthContextData {
  user: LoginResponse | null
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => {
    const s = localStorage.getItem('user')
    return s ? JSON.parse(s) : null
  })

  async function login(data: LoginRequest) {
    const r = await api.post<LoginResponse>('/auth/login', data)
    const u = r.data
    localStorage.setItem('token', u.token)
    localStorage.setItem('user', JSON.stringify(u))
    localStorage.setItem('userName', u.name)
    // Usa /tenants/me em vez de /tenants/{id} — mais seguro e não expõe o UUID na URL
    try {
      const t = await api.get('/tenants/me')
      localStorage.setItem('tenantName', t.data.name ?? '')
    } catch { localStorage.setItem('tenantName', '') }
    setUser(u)
  }

  async function register(data: RegisterRequest) {
    const r = await api.post<LoginResponse>('/auth/register', data)
    const u = r.data
    localStorage.setItem('token', u.token)
    localStorage.setItem('user', JSON.stringify(u))
    localStorage.setItem('userName', u.name)
    localStorage.setItem('tenantName', data.schoolName)
    setUser(u)
  }

  function logout() {
    api.post('/auth/logout').catch(() => {})
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
