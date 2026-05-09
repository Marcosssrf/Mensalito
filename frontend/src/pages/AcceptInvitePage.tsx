import {useEffect, useState} from 'react'
import {Link, useNavigate, useSearchParams} from 'react-router-dom'
import api from '@/services/api'
import {useAuth} from '@/contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvitePreview {
  schoolName: string
  email: string
  role: 'OWNER' | 'TEACHER'
}

interface RegisterWithInviteRequest {
  token: string
  name: string
  password: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABEL: Record<string, string> = {
  OWNER:   'Proprietário',
  TEACHER: 'Professor(a)',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate        = useNavigate()
  const { user }        = useAuth()

  const token = searchParams.get('invite') ?? ''

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/app/dashboard', { replace: true })
  }, [user, navigate])

  // Invite preview state
  const [preview,        setPreview]        = useState<InvitePreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)
  const [previewError,   setPreviewError]   = useState('')

  // Form state
  const [name,     setName]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showPw,   setShowPw]   = useState(false)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  // ── Load invite preview ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setPreviewError('Link de convite inválido ou expirado.')
      setPreviewLoading(false)
      return
    }

    api
      .get<InvitePreview>(`/invites/${token}/preview`)
      .then((r) => setPreview(r.data))
      .catch((e) => {
        const msg =
          e?.response?.data?.message ??
          e?.response?.data?.error ??
          'Convite inválido ou expirado.'
        setPreviewError(msg)
      })
      .finally(() => setPreviewLoading(false))
  }, [token])

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (password !== confirm) {
      setSubmitError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setSubmitError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    try {
      const body: RegisterWithInviteRequest = { token, name, password }
      await api.post('/invites/accept', body)
      setDone(true)
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'Erro ao concluir cadastro. Tente novamente.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Render: success ──────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={styles.page}>
        <TopBar />
        <div style={styles.center}>
          <div style={styles.card}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
            <h1 style={styles.heading}>Cadastro concluído!</h1>
            <p style={{ ...styles.sub, marginBottom: 28 }}>
              Sua conta foi criada em <strong>{preview?.schoolName}</strong>. Faça
              login para começar a usar o sistema.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={styles.btn}
            >
              Ir para o login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Render: loading ──────────────────────────────────────────────────────
  if (previewLoading) {
    return (
      <div style={styles.page}>
        <TopBar />
        <div style={styles.center}>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Verificando convite…</p>
        </div>
      </div>
    )
  }

  // ─── Render: invalid invite ───────────────────────────────────────────────
  if (previewError || !preview) {
    return (
      <div style={styles.page}>
        <TopBar />
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

  // ─── Render: form ─────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <TopBar />
      <div style={styles.center}>
        <div style={styles.card}>
          {/* Invite info banner */}
          <div style={styles.banner}>
            <p style={styles.bannerTitle}>Você foi convidado(a)!</p>
            <p style={styles.bannerSub}>
              <strong>{preview.schoolName}</strong> está te convidando para entrar
              como <strong>{ROLE_LABEL[preview.role] ?? preview.role}</strong>.
            </p>
            <p style={styles.emailBadge}>{preview.email}</p>
          </div>

          <h1 style={{ ...styles.heading, marginBottom: 4 }}>Concluir cadastro</h1>
          <p style={{ ...styles.sub, marginBottom: 24 }}>
            Crie sua senha e defina seu nome para ativar o acesso.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name */}
            <div style={styles.field}>
              <label style={styles.label}>Seu nome completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maria Silva"
                required
                style={styles.input}
              />
            </div>

            {/* Email (read-only) */}
            <div style={styles.field}>
              <label style={styles.label}>Email <span style={{ color: '#9ca3af' }}>(definido pelo convite)</span></label>
              <input
                type="email"
                value={preview.email}
                disabled
                style={{ ...styles.input, background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed' }}
              />
            </div>

            {/* Password */}
            <div style={styles.field}>
              <label style={styles.label}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  style={{ ...styles.input, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                  aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPw ? (
                    // Eye-off
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    // Eye
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div style={styles.field}>
              <label style={styles.label}>Confirmar senha</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                required
                style={styles.input}
              />
            </div>

            {/* Error */}
            {submitError && (
              <p style={styles.error}>{submitError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{ ...styles.btn, marginTop: 4 }}
            >
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: "'Geist', 'Inter', sans-serif",
    minHeight: '100vh',
    background: '#fff',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    borderBottom: '1px solid #f3f4f6',
    padding: '0 24px',
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: '#111827',
    textDecoration: 'none',
  },
  topBarRight: { fontSize: 13, color: '#9ca3af' },
  topBarLink: { color: '#111827', textDecoration: 'underline', textUnderlineOffset: 2 },
  center: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  banner: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '14px 16px',
    marginBottom: 24,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#065f46',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 13,
    color: '#047857',
    marginBottom: 8,
    lineHeight: 1.5,
  },
  emailBadge: {
    display: 'inline-block' as const,
    background: '#d1fae5',
    borderRadius: 999,
    padding: '2px 10px',
    fontSize: 12,
    color: '#065f46',
    fontWeight: 600,
  },
  heading: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 1.5,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
  },
  input: {
    width: '100%',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box' as const,
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 0,
  },
  error: {
    fontSize: 12,
    color: '#dc2626',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 6,
    padding: '8px 12px',
  },
  btn: {
    width: '100%',
    background: '#111827',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    padding: '10px 0',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
}
