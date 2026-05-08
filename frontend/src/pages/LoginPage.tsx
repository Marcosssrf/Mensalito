import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'

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
      navigate('/app/dashboard')
    } catch {
      setError('Email ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Geist', 'Inter', sans-serif" }} className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="border-b border-zinc-100 px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold tracking-tight text-zinc-900">Mensalito</Link>
        <span className="text-sm text-zinc-400">
          Não tem conta?{' '}
          <Link to="/register" className="text-zinc-900 underline underline-offset-2">Criar grátis</Link>
        </span>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-xs">
          <h1 className="text-xl font-semibold tracking-tight mb-1">Entrar</h1>
          <p className="text-sm text-zinc-400 mb-8">Acesse sua conta do Mensalito</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
              />
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white text-sm py-2.5 rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-40"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
