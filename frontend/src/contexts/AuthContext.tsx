import type {ReactNode} from 'react'
import {createContext, useContext, useState} from 'react'
import type {LoginRequest, LoginResponse, RegisterRequest} from '@/types'
import api from '@/services/api'

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
        const stored = localStorage.getItem('user')
        return stored ? JSON.parse(stored) : null
    })

    async function login(data: LoginRequest) {
        const response = await api.post<LoginResponse>('/auth/login', data)
        const userData = response.data
        localStorage.setItem('token', userData.token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }

    async function register(data: RegisterRequest) {
        const response = await api.post<LoginResponse>('/auth/register', data)
        const userData = response.data
        localStorage.setItem('token', userData.token)
        localStorage.setItem('user', JSON.stringify(userData))
        setUser(userData)
    }

    function logout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout,
            register,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)