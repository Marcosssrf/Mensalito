import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import api from '@/services/api'

/**
 * Página de callback do Supabase após confirmação de email.
 * O Supabase redireciona para /#access_token=...&type=signup
 *
 * Aqui pegamos o token da URL, provisionamos o usuário no Spring
 * e redirecionamos para o dashboard.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      // O Supabase coloca os params no hash (#) da URL
      const hash   = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)

      const accessToken = params.get('access_token')
      const type        = params.get('type') // 'signup' ou 'recovery'

      if (!accessToken) {
        setError('Link inválido ou expirado. Tente se cadastrar novamente.')
        return
      }

      try {
        // Verifica se é um aceite de convite pendente
        const pendingInvite = localStorage.getItem('pendingInvite')
        if (pendingInvite && type === 'signup') {
          const { token, email, name } = JSON.parse(pendingInvite)
          await api.post('/invites/accept', { token, email, name }, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          localStorage.removeItem('pendingInvite')
          navigate('/login', { replace: true })
          return
        }

        // Provisão normal (registro direto)
        const pendingProvision = localStorage.getItem('pendingProvision')
        const provisionData = pendingProvision ? JSON.parse(pendingProvision) : {}

        const localUser = await api.post('/auth/provision', provisionData, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        let tenantName = provisionData.schoolName ?? ''
        try {
          const t = await api.get('/tenants/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          tenantName = t.data.name ?? tenantName
        } catch { /* ignora */ }

        const refreshToken = params.get('refresh_token') ?? ''
        const u = {
          token:    accessToken,
          name:     localUser.data.name,
          email:    localUser.data.email,
          tenantId: localUser.data.tenantId ?? '',
          userId:   localUser.data.id,
          role:     localUser.data.role,
        }

        localStorage.setItem('token',        accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user',         JSON.stringify(u))
        localStorage.setItem('userName',     u.name)
        localStorage.setItem('tenantName',   tenantName)
        localStorage.removeItem('pendingProvision')

        navigate('/app/dashboard', { replace: true })
      } catch (err: unknown) {
        console.error(err)
        setError('Erro ao ativar sua conta. Tente fazer login normalmente.')
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div style={{ fontFamily: "'Geist', 'Inter', sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 300 }}>{error}</p>
        <a href="/login" style={{ fontSize: 13, color: '#111827', textDecoration: 'underline' }}>Ir para login</a>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Geist', 'Inter', sans-serif", minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 14, color: '#6b7280' }}>Ativando sua conta…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
