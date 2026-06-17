import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import BrandMark from '@/components/BrandMark'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }   = useAuth()
  const navigate    = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ email, password })
      navigate('/app/dashboard')
    } catch (err: unknown) {
      setError((err as Error).message || 'Email ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column', fontFamily: "'Geist Variable', sans-serif" }}>
      {/* Topbar */}
      <div style={{ height: 52, background: '#fff', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <BrandMark size={26} radius={7} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#18181b', letterSpacing: '-0.01em' }}>Mensalito</span>
        </Link>
        <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          Não tem conta?{' '}
          <Link to="/register" style={{ color: '#18181b', fontWeight: 600, textDecoration: 'none', borderBottom: '1.5px solid #18181b' }}>Criar grátis</Link>
        </span>
      </div>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Card */}
          <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 14, padding: '36px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Entrar</h1>
            <p style={{ fontSize: 13.5, color: '#a1a1aa', margin: '0 0 28px' }}>Acesse sua conta do Mensalito</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="ms-label">Email</label>
                <input
                  className="ms-input"
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                />
              </div>

              <div>
                <label className="ms-label">Senha</label>
                <input
                  className="ms-input"
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                />
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="ms-btn ms-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', marginTop: 4, fontSize: 14 }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
