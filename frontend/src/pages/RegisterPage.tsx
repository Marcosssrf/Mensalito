import {useState} from 'react'
import {Link, useNavigate} from 'react-router-dom'
import {useAuth} from '@/contexts/AuthContext'
import type {RegisterRequest} from '@/types'

function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

function validateCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0
  if (r !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  r = (sum * 10) % 11; if (r === 10 || r === 11) r = 0
  return r === parseInt(digits[10])
}

function validateCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false
  const calc = (d: string, n: number) => {
    let s = 0, p = n
    for (let i = 0; i < d.length; i++) { s += parseInt(d[i]) * p--; if (p < 2) p = 9 }
    const r = s % 11; return r < 2 ? 0 : 11 - r
  }
  return calc(digits.slice(0, 12), 5) === parseInt(digits[12]) &&
      calc(digits.slice(0, 13), 6) === parseInt(digits[13])
}

function validateDocument(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11) return validateCpf(digits)
  if (digits.length === 14) return validateCnpj(digits)
  return false
}

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterRequest>({
    name: '', email: '', password: '',
    schoolName: '', schoolPhone: '', schoolDocument: '',
  })
  const [error, setError]     = useState('')
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

    // Validação extra nos campos mascarados
    if (!form.schoolPhone || form.schoolPhone.replace(/\D/g, '').length < 10) {
      setError('Informe um telefone válido para a escola.')
      return
    }
    const docDigits = (form.schoolDocument ?? '').replace(/\D/g, '')
    if (!docDigits || (docDigits.length !== 11 && docDigits.length !== 14)) {
      setError('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos).')
      return
    }
    if (!validateDocument(form.schoolDocument ?? '')) {
      setError('CPF ou CNPJ inválido. Verifique os dígitos informados.')
      return
    }

    setLoading(true)
    try {
      const result = await register(form)
      if (result.needsEmailConfirmation) setEmailSent(true)
      else navigate('/app/dashboard')
    } catch (err: unknown) {
      setError((err as Error).message || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
        <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column', fontFamily: "'Geist Variable', sans-serif" }}>
          <div style={{ height: 52, background: '#fff', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', padding: '0 28px' }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <div style={{ width: 26, height: 26, background: '#18181b', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#fff"/></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#18181b' }}>Mensalito</span>
            </Link>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 14, padding: '48px 40px', maxWidth: 380, textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ width: 52, height: 52, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <svg width="22" height="22" fill="none" stroke="#22c55e" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#18181b', margin: '0 0 10px', letterSpacing: '-0.02em' }}>Confirme seu email</h1>
              <p style={{ fontSize: 14, color: '#71717a', lineHeight: 1.6, margin: '0 0 24px' }}>
                Enviamos um link de confirmação para <strong style={{ color: '#18181b' }}>{form.email}</strong>. Clique no link para ativar sua conta.
              </p>
              <button onClick={() => setEmailSent(false)} style={{ fontSize: 13, color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Não recebeu? Tentar novamente
              </button>
            </div>
          </div>
        </div>
    )
  }

  return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', flexDirection: 'column', fontFamily: "'Geist Variable', sans-serif" }}>
        <div style={{ height: 52, background: '#fff', borderBottom: '1px solid #e8eaed', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 26, height: 26, background: '#18181b', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="#fff"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#18181b' }}>Mensalito</span>
          </Link>
          <span style={{ fontSize: 13, color: '#a1a1aa' }}>
          Já tem conta?{' '}
            <Link to="/login" style={{ color: '#18181b', fontWeight: 600, textDecoration: 'none', borderBottom: '1.5px solid #18181b' }}>Entrar</Link>
        </span>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 14, padding: '36px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: '#18181b', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Criar conta</h1>
              <p style={{ fontSize: 13.5, color: '#a1a1aa', margin: '0 0 28px' }}>30 dias grátis, sem cartão de crédito</p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Section: Seus dados */}
                <div style={{ borderBottom: '1px solid #f4f4f5', paddingBottom: 14, marginBottom: 2 }}>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>Seus dados</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="ms-label">Nome completo</label>
                      <input className="ms-input" name="name" type="text" value={form.name} onChange={handleChange} placeholder="João Silva" required />
                    </div>
                    <div>
                      <label className="ms-label">Email</label>
                      <input className="ms-input" name="email" type="email" value={form.email} onChange={handleChange} placeholder="joao@escola.com" required />
                    </div>
                    <div>
                      <label className="ms-label">Senha</label>
                      <input className="ms-input" name="password" type="password" value={form.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" required minLength={6} />
                    </div>
                  </div>
                </div>

                {/* Section: Sua escola */}
                <div>
                  <p style={{ fontSize: 10.5, fontWeight: 700, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>Sua escola</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label className="ms-label">Nome da escola</label>
                      <input className="ms-input" name="schoolName" type="text" value={form.schoolName} onChange={handleChange} placeholder="Escola de Inglês do João" required />
                    </div>
                    <div>
                      <label className="ms-label">Telefone</label>
                      <input
                          className="ms-input"
                          name="schoolPhone" type="tel" value={form.schoolPhone}
                          onChange={(e) => setForm(prev => ({ ...prev, schoolPhone: maskPhone(e.target.value) }))}
                          placeholder="(34) 99999-9999" maxLength={15}
                          required
                      />
                    </div>
                    <div>
                      <label className="ms-label">CPF ou CNPJ</label>
                      <input
                          className="ms-input"
                          name="schoolDocument" type="text" value={form.schoolDocument}
                          onChange={(e) => setForm(prev => ({ ...prev, schoolDocument: maskDocument(e.target.value) }))}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18}
                          required
                      />
                    </div>
                  </div>
                </div>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626' }}>
                      {error}
                    </div>
                )}

                <button type="submit" disabled={loading} className="ms-btn ms-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', marginTop: 4, fontSize: 14 }}>
                  {loading ? 'Criando conta...' : 'Criar conta grátis'}
                </button>

                <p style={{ fontSize: 12, color: '#a1a1aa', textAlign: 'center', margin: 0 }}>
                  Ao criar uma conta, você concorda com nossos <span style={{ color: '#71717a', textDecoration: 'underline', cursor: 'pointer' }}>Termos de Uso</span>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
  )
}