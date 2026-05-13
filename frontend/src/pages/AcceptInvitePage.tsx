import {useEffect, useState} from 'react'
import {Link, useNavigate, useSearchParams} from 'react-router-dom'
import api from '@/services/api'

interface InvitePreview {
  schoolName: string
  email: string | null   // null = convite genérico (qualquer email pode usar)
  role: 'OWNER' | 'TEACHER'
}

const ROLE_LABEL: Record<string, string> = {
  OWNER:   'Proprietário',
  TEACHER: 'Professor(a)',
}

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate       = useNavigate()
  const inviteToken    = searchParams.get('invite') ?? ''

  // Preview
  const [preview,        setPreview]        = useState<InvitePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [previewError,   setPreviewError]   = useState('')

  // Form
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')   // só usado se convite genérico
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)

  // Submit
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [emailSent,   setEmailSent]   = useState(false)

  // ── Load preview ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!inviteToken) {
      setPreviewError('Link de convite inválido ou expirado.')
      setPreviewLoading(false)
      return
    }
    api.get<InvitePreview>(`/invites/${inviteToken}/preview`)
      .then(r => setPreview(r.data))
      .catch(e => setPreviewError(
        e?.response?.data?.message ?? e?.response?.data?.error ?? 'Convite inválido ou expirado.'
      ))
      .finally(() => setPreviewLoading(false))
  }, [inviteToken])

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (password !== confirm) { setSubmitError('As senhas não coincidem.'); return }
    if (password.length < 6)  { setSubmitError('A senha deve ter pelo menos 6 caracteres.'); return }

    // Email que será usado: fixo (do convite) ou digitado (convite genérico)
    const finalEmail = preview!.email ?? email

    if (!finalEmail) { setSubmitError('Informe seu email.'); return }

    setSubmitting(true)
    try {
      // 1. Registra no Supabase
      const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ email: finalEmail, password }),
      })
      const signupData = await signupRes.json()

      if (!signupRes.ok) {
        const alreadyExists =
          signupData.msg?.includes('already registered') ||
          signupData.error_code === 'user_already_exists'
        if (alreadyExists) {
          throw new Error('Este email já possui uma conta. Tente fazer login.')
        }
        throw new Error(signupData.msg ?? signupData.error_description ?? 'Erro ao criar conta.')
      }

      const needsConfirmation = !signupData.access_token

      if (needsConfirmation) {
        // Salva o pendente para o AuthCallbackPage processar após confirmação
        localStorage.setItem('pendingInvite', JSON.stringify({
          token: inviteToken,
          email: finalEmail,
          name,
        }))
        setEmailSent(true)
        return
      }

      // 2. Confirmação automática (email desativado no Supabase) — chama /invites/accept
      const access_token = signupData.access_token as string
      await api.post('/invites/accept',
        { token: inviteToken, email: finalEmail, name },
        { headers: { Authorization: `Bearer ${access_token}` } }
      )

      navigate('/login')
    } catch (err: unknown) {
      setSubmitError((err as Error).message || 'Erro ao concluir cadastro. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Telas de estado ────────────────────────────────────────────────────────

  if (emailSent) {
    return (
      <div style={styles.page}><TopBar />
        <div style={styles.center}>
          <div style={styles.card}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📧</div>
            <h1 style={styles.heading}>Confirme seu email</h1>
            <p style={{ ...styles.sub, marginBottom: 24 }}>
              Enviamos um link de confirmação para <strong>{preview?.email ?? email}</strong>.
              Após confirmar, você será redirecionado para fazer login e acessar{' '}
              <strong>{preview?.schoolName}</strong>.
            </p>
            <Link to="/login" style={{ color: '#111827', fontSize: 13, textDecoration: 'underline' }}>
              Já confirmei — ir para login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (previewLoading) {
    return (
      <div style={styles.page}><TopBar />
        <div style={styles.center}>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Verificando convite…</p>
        </div>
      </div>
    )
  }

  if (previewError || !preview) {
    return (
      <div style={styles.page}><TopBar />
        <div style={styles.center}>
          <div style={styles.card}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ ...styles.heading, marginBottom: 8 }}>Convite inválido</h1>
            <p style={{ ...styles.sub, marginBottom: 24 }}>{previewError}</p>
            <Link to="/login" style={{ color: '#111827', fontSize: 13, textDecoration: 'underline' }}>
              Ir para login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ─────────────────────────────────────────────────────────────
  const isGenericInvite = !preview.email   // convite sem email fixo

  return (
    <div style={styles.page}><TopBar />
      <div style={styles.center}>
        <div style={styles.card}>

          {/* Banner do convite */}
          <div style={styles.banner}>
            <p style={styles.bannerTitle}>Você foi convidado(a)!</p>
            <p style={styles.bannerSub}>
              <strong>{preview.schoolName}</strong> está te convidando para entrar como{' '}
              <strong>{ROLE_LABEL[preview.role] ?? preview.role}</strong>.
            </p>
            {preview.email && <p style={styles.emailBadge}>{preview.email}</p>}
          </div>

          <h1 style={{ ...styles.heading, marginBottom: 4 }}>Concluir cadastro</h1>
          <p style={{ ...styles.sub, marginBottom: 24 }}>
            Preencha seus dados para ativar o acesso.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Nome */}
            <div style={styles.field}>
              <label style={styles.label}>Seu nome completo</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Maria Silva" required style={styles.input}
              />
            </div>

            {/* Email — fixo se convite específico, editável se genérico */}
            {isGenericInvite ? (
              <div style={styles.field}>
                <label style={styles.label}>Seu email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="maria@escola.com" required style={styles.input}
                />
              </div>
            ) : (
              <div style={styles.field}>
                <label style={styles.label}>
                  Email <span style={{ color: '#9ca3af' }}>(definido pelo convite)</span>
                </label>
                <input
                  type="email" value={preview.email!} disabled
                  style={{ ...styles.input, background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed' }}
                />
              </div>
            )}

            {/* Senha */}
            <div style={styles.field}>
              <label style={styles.label}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required minLength={6}
                  style={{ ...styles.input, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  style={styles.eyeBtn} tabIndex={-1}>
                  {showPw ? <EyeOff /> : <EyeOn />}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div style={styles.field}>
              <label style={styles.label}>Confirmar senha</label>
              <input
                type={showPw ? 'text' : 'password'} value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha" required style={styles.input}
              />
            </div>

            {submitError && <p style={styles.error}>{submitError}</p>}

            <button type="submit" disabled={submitting} style={{ ...styles.btn, marginTop: 4 }}>
              {submitting ? 'Criando conta…' : 'Criar conta e entrar →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TopBar() {
  return (
    <div style={styles.topBar}>
      <Link to="/" style={styles.logo}>Mensalito</Link>
      <span style={styles.topBarRight}>
        Já tem conta?{' '}
        <Link to="/login" style={styles.topBarLink}>Entrar</Link>
      </span>
    </div>
  )
}

function EyeOn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page:       { fontFamily: "'Geist', 'Inter', sans-serif", minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' },
  topBar:     { borderBottom: '1px solid #f3f4f6', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo:       { fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em', color: '#111827', textDecoration: 'none' },
  topBarRight:{ fontSize: 13, color: '#9ca3af' },
  topBarLink: { color: '#111827', textDecoration: 'underline', textUnderlineOffset: 2 },
  center:     { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' },
  card:       { width: '100%', maxWidth: 400 },
  banner:     { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', marginBottom: 24 },
  bannerTitle:{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 4 },
  bannerSub:  { fontSize: 13, color: '#047857', marginBottom: 8, lineHeight: 1.5 },
  emailBadge: { display: 'inline-block', background: '#d1fae5', borderRadius: 999, padding: '2px 10px', fontSize: 12, color: '#065f46', fontWeight: 600 },
  heading:    { fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 },
  sub:        { fontSize: 13, color: '#6b7280', lineHeight: 1.5 },
  field:      { display: 'flex', flexDirection: 'column', gap: 6 },
  label:      { fontSize: 12, color: '#6b7280' },
  input:      { width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  eyeBtn:     { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  error:      { fontSize: 12, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' },
  btn:        { width: '100%', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 500, padding: '10px 0', border: 'none', borderRadius: 8, cursor: 'pointer' },
}
