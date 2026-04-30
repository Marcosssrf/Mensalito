import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await login({ email, password })
            navigate('/dashboard')
        } catch {
            setError('Email ou senha inválidos')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-white font-sans">

            {/* Navbar */}
            <header className="flex items-center justify-between px-8 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-900 rounded-md flex items-center justify-center">
                        <span className="text-white text-xs font-bold">M</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">Mensalito</span>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                    Voltar para o site
                </button>
            </header>

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-md">

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Entrar na sua escola</h1>
                        <p className="text-gray-500 text-sm">Acesse o painel de cobranças do Mensalito.</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Email */}
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                                E-mail
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="20" height="16" x="2" y="4" rx="2"/>
                                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                    </svg>
                                </span>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="escola@email.com.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 h-11 border-gray-200 text-sm placeholder:text-gray-400 focus-visible:ring-gray-900"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    Senha
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
                                    className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    Esqueci a senha
                                </button>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                </span>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9 h-11 border-gray-200 text-sm placeholder:text-gray-400 focus-visible:ring-gray-900"
                                    required
                                />
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-sm text-red-600">{error}</p>
                        )}

                        {/* Submit */}
                        <Button
                            type="submit"
                            className="w-full h-11 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium transition-colors"
                            disabled={loading}
                        >
                            {loading ? 'Entrando...' : 'Entrar no painel →'}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-3 text-gray-400 uppercase tracking-wider">ou</span>
                        </div>
                    </div>

                    {/* Register link */}
                    <p className="mt-6 text-center text-sm text-gray-500">
                        Ainda não tem conta?{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/register')}
                            className="font-semibold text-gray-900 hover:underline"
                        >
                            Criar agora
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}