import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import type {RegisterRequest} from '@/types'

function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterRequest>({
    name: '', email: '', password: '',
    schoolName: '', schoolPhone: '', schoolDocument: '',
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await register(form)
      if (result.needsEmailConfirmation) {
        setEmailSent(true)
      } else {
        navigate('/app/dashboard')
      }
    } catch (err: unknown) {
      const e = err as Error
      setError(e.message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  // ── Tela de confirmação de email ──────────────────────────────────────────
  if (emailSent) {
    return (
      <div style={{ fontFamily: "'Geist', 'Inter', sans-serif" }} className="min-h-screen bg-white flex flex-col">
        <div className="border-b border-zinc-100 px-6 h-14 flex items-center">
          <Link to="/" className="text-sm font-semibold tracking-tight text-zinc-900">Mensalito</Link>
        </div>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-xs text-center">
            <div className="text-4xl mb-4">📧</div>
            <h1 className="text-xl font-semibold tracking-tight mb-2">Confirme seu email</h1>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Enviamos um link de confirmação para <strong className="text-zinc-700">{form.email}</strong>.
              Clique no link para ativar sua conta e ser redirecionado automaticamente.
            </p>
            <p className="text-xs text-zinc-300">
              Não recebeu?{' '}
              <button
                onClick={() => { setEmailSent(false) }}
                className="text-zinc-500 underline underline-offset-2"
              >
                Tentar novamente
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário de cadastro ────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Geist', 'Inter', sans-serif" }} className="min-h-screen bg-white flex flex-col">
      <div className="border-b border-zinc-100 px-6 h-14 flex items-center justify-between">
        <Link to="/" className="text-sm font-semibold tracking-tight text-zinc-900">Mensalito</Link>
        <span className="text-sm text-zinc-400">
          Já tem conta?{' '}
          <Link to="/login" className="text-zinc-900 underline underline-offset-2">Entrar</Link>
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xs">
          <h1 className="text-xl font-semibold tracking-tight mb-1">Criar conta</h1>
          <p className="text-sm text-zinc-400 mb-8">30 dias grátis, sem cartão de crédito</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-zinc-400 uppercase tracking-widest pt-1">Seus dados</p>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Nome completo</label>
              <input
                name="name" type="text" value={form.name} onChange={handleChange}
                placeholder="João Silva" required
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Email</label>
              <input
                name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="joao@escola.com" required
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Senha</label>
              <input
                name="password" type="password" value={form.password} onChange={handleChange}
                placeholder="Mínimo 6 caracteres" required minLength={6}
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
              />
            </div>

            <p className="text-xs text-zinc-400 uppercase tracking-widest pt-2">Sua escola</p>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">Nome da escola</label>
              <input
                name="schoolName" type="text" value={form.schoolName} onChange={handleChange}
                placeholder="Escola de Inglês do João" required
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">
                Telefone <span className="text-zinc-300">(opcional)</span>
              </label>
              <input
                name="schoolPhone" type="tel" value={form.schoolPhone}
                onChange={(e) => setForm(prev => ({ ...prev, schoolPhone: maskPhone(e.target.value) }))}
                placeholder="(34) 99999-9999" maxLength={15}
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500">
                CPF ou CNPJ <span className="text-zinc-300">(opcional)</span>
              </label>
              <input
                name="schoolDocument" type="text" value={form.schoolDocument}
                onChange={(e) => setForm(prev => ({ ...prev, schoolDocument: maskDocument(e.target.value) }))}
                placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18}
                className="w-full border border-zinc-200 rounded-md px-3 py-2 text-sm outline-none focus:border-zinc-400 transition-colors placeholder:text-zinc-300"
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-zinc-900 text-white text-sm py-2.5 rounded-md hover:bg-zinc-700 transition-colors disabled:opacity-40 mt-2"
            >
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
