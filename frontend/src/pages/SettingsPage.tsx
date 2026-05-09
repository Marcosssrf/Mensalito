import {useEffect, useRef, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import api from '@/services/api'

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

type Tab = 'Escola' | 'Conta' | 'Cobrança' | 'Integrações' | 'Convites' | 'Plano'
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface TenantData {
  id: string
  name: string
  email: string | null
  phone: string | null
  document: string | null
  active: boolean
  createdAt: string
  hasAbacatePayKey?: boolean
}

interface InviteResponse {
  id: string
  email: string
  role: 'OWNER' | 'TEACHER'
  inviteUrl: string
  expiresAt: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb',
  borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none',
  boxSizing: 'border-box', background: '#fff',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', alignItems: 'start', gap: 20, paddingBottom: 20, borderBottom: '1px solid #f3f4f6', marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: 0 }}>{label}</p>
          {hint && <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{hint}</p>}
        </div>
        <div>{children}</div>
      </div>
  )
}

function IntegrationBadge({ connected, label }: { connected: boolean; label?: string }) {
  return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '6px 14px', borderRadius: 8,
        background: connected ? '#ecfdf5' : '#f9fafb',
        border: `1px solid ${connected ? '#a7f3d0' : '#e5e7eb'}`,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10b981' : '#d1d5db' }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: connected ? '#065f46' : '#6b7280' }}>
        {connected ? (label ? `Conectado · ${label}` : 'Conectado') : 'Não conectado'}
      </span>
      </div>
  )
}

function IntegrationCard({ acronym, name, description, connected, connectedLabel, onManage }: {
  acronym: string; name: string; description: string
  connected: boolean; connectedLabel?: string; onManage: () => void
}) {
  return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#374151', flexShrink: 0 }}>
            {acronym}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{name}</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>{description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IntegrationBadge connected={connected} label={connectedLabel} />
          <button onClick={onManage}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151' }}>
            Gerenciar
            <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>
      </div>
  )
}

// Modal AbacatePay — PUT /api/tenants/me/api-key
function AbacatePayModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!key.trim()) { setError('Insira a chave de API'); return }
    setLoading(true)
    try {
      await api.put('/tenants/me/api-key', { abacatePayApiKey: key })
      onSaved(); onClose()
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.message ?? 'Erro ao salvar chave')
    } finally { setLoading(false) }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>AbacatePay · Chave de API</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            Sua chave é armazenada de forma criptografada e nunca exibida novamente.
          </p>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{error}</div>}
          <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Chave de API</label>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
                 placeholder="eyJ..." autoComplete="off" style={{ ...inputStyle, marginBottom: 24 }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Cancelar</button>
            <button onClick={save} disabled={loading}
                    style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600 }}>
              {loading ? 'Salvando...' : 'Salvar chave'}
            </button>
          </div>
        </div>
      </div>
  )
}

// Modal WhatsApp — Evolution API
// Modal WhatsApp — busca QR Code do backend (Evolution API gerenciada pelo servidor)
function WhatsAppModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [status, setStatus] = useState<'loading' | 'qr' | 'connected' | 'error'>('loading')
  const [qr, setQr] = useState<string | null>(null)
  const [instanceName, setInstanceName] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadStatus()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function loadStatus() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await api.get<{ connected: boolean; instanceName: string | null; qrCodeBase64: string | null }>('/tenants/me/whatsapp')
      const data = res.data
      setInstanceName(data.instanceName)

      if (data.connected) {
        setStatus('connected')
        onConnected()
        return
      }

      if (data.qrCodeBase64) {
        setQr(data.qrCodeBase64)
        setStatus('qr')
        // Polling a cada 4s para detectar quando o QR for escaneado
        pollRef.current = setInterval(async () => {
          try {
            const poll = await api.get<{ connected: boolean; instanceName: string | null; qrCodeBase64: string | null }>('/tenants/me/whatsapp')
            if (poll.data.connected) {
              clearInterval(pollRef.current!)
              setStatus('connected')
              onConnected()
            } else if (poll.data.qrCodeBase64 && poll.data.qrCodeBase64 !== qr) {
              setQr(poll.data.qrCodeBase64)
            }
          } catch { /* ignora erros de polling */ }
        }, 4000)
      } else {
        setErrorMsg('Não foi possível gerar o QR Code. Verifique as configurações da Evolution API no servidor.')
        setStatus('error')
      }
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao conectar com o servidor.')
      setStatus('error')
    }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>WhatsApp · Conectar</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            Escaneie o QR Code com o WhatsApp para ativar o envio de mensagens automáticas da sua escola.
          </p>

          {status === 'loading' && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af', fontSize: 14 }}>
                <div style={{ width: 36, height: 36, border: '3px solid #e5e7eb', borderTopColor: '#111827', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
                Carregando QR Code...
              </div>
          )}

          {status === 'error' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{errorMsg}</div>
          )}

          {status === 'connected' && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>✅</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#065f46' }}>WhatsApp conectado!</span>
                {instanceName && <span style={{ fontSize: 12, color: '#6b7280' }}>Instância: {instanceName}</span>}
              </div>
          )}

          {status === 'qr' && qr && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img
                    src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
                    alt="QR Code WhatsApp"
                    style={{ width: 220, height: 220, border: '1px solid #e5e7eb', borderRadius: 10, margin: '0 auto' }}
                />
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>
                  Abra o WhatsApp → <strong>Dispositivos conectados</strong> → Escanear QR Code
                </p>
                {instanceName && (
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                      Instância: <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{instanceName}</code>
                    </p>
                )}
              </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Fechar</button>
            {status !== 'connected' && (
                <button onClick={loadStatus} disabled={status === 'loading'}
                        style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, opacity: status === 'loading' ? 0.6 : 1 }}>
                  {status === 'loading' ? 'Carregando...' : 'Atualizar QR Code'}
                </button>
            )}
          </div>
        </div>
      </div>
  )
}

// Aba Convites — POST /api/invites
function InvitesTab() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'TEACHER' | 'OWNER'>('TEACHER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invite, setInvite] = useState<InviteResponse | null>(null)
  const [copied, setCopied] = useState(false)

  async function createInvite() {
    if (!email.trim()) { setError('Insira um e-mail'); return }
    setLoading(true); setError(''); setInvite(null)
    try {
      const res = await api.post<InviteResponse>('/invites', { email, role })
      setInvite(res.data)
      setEmail('')
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.response?.data?.error ?? 'Erro ao criar convite')
    } finally { setLoading(false) }
  }

  function copyLink() {
    if (!invite?.inviteUrl) return
    navigator.clipboard.writeText(invite.inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Convites</h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
          Convide professores para acessar o sistema. O link expira em 24 horas.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>E-mail do convidado</label>
            <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="professor@escola.com"
                style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>Função</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['TEACHER', 'OWNER'] as const).map(r => (
                  <button
                      key={r}
                      onClick={() => setRole(r)}
                      style={{
                        padding: '8px 20px', borderRadius: 8, border: `1px solid ${role === r ? '#111827' : '#e5e7eb'}`,
                        background: role === r ? '#111827' : '#fff',
                        color: role === r ? '#fff' : '#374151',
                        fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      }}
                  >
                    {r === 'TEACHER' ? 'Professor' : 'Dono'}
                  </button>
              ))}
            </div>
          </div>

          {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>{error}</div>
          )}

          {invite && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '16px 18px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#065f46', marginBottom: 8 }}>✓ Convite criado para {invite.email}</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
                  Expira em: {new Date(invite.expiresAt).toLocaleString('pt-BR')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {invite.inviteUrl}
              </span>
                  <button
                      onClick={copyLink}
                      style={{ flexShrink: 0, fontSize: 12, padding: '4px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff', cursor: 'pointer', color: '#374151' }}
                  >
                    {copied ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
          )}

          <button
              onClick={createInvite}
              disabled={loading}
              style={{ padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Criando...' : 'Criar convite'}
          </button>
        </div>
      </div>
  )
}

// Aba Conta — PATCH /api/users/{id} + PATCH /api/users/{id}/password
function AccountTab() {
  const { user } = useAuth()
  const [nameForm, setNameForm] = useState({ name: '', email: '' })
  const [pwForm, setPwForm] = useState({ password: '', confirm: '' })
  const [nameSave, setNameSave] = useState<SaveState>('idle')
  const [pwSave, setPwSave] = useState<SaveState>('idle')
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (!user?.tenantId) return
    // GET /api/users/email/{email} não existe, usa o user do token
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      setNameForm({ name: u.name ?? '', email: '' })
    }
  }, [user])

  async function saveProfile() {
    if (!user) return
    const stored = localStorage.getItem('user')
    const u = stored ? JSON.parse(stored) : null
    if (!u?.id) return
    setNameSave('saving')
    try {
      // PATCH /api/users/{id}  body: UpdateUserRequestDTO { name, email }
      await api.patch(`/users/${u.id}`, { name: nameForm.name, email: nameForm.email || undefined })
      // Atualiza localStorage
      localStorage.setItem('user', JSON.stringify({ ...u, name: nameForm.name }))
      localStorage.setItem('userName', nameForm.name)
      setNameSave('saved')
      setTimeout(() => setNameSave('idle'), 2500)
    } catch {
      setNameSave('error')
      setTimeout(() => setNameSave('idle'), 2500)
    }
  }

  async function changePassword() {
    setPwError('')
    if (!pwForm.password || pwForm.password.length < 6) { setPwError('Senha deve ter no mínimo 6 caracteres'); return }
    if (pwForm.password !== pwForm.confirm) { setPwError('As senhas não coincidem'); return }
    const stored = localStorage.getItem('user')
    const u = stored ? JSON.parse(stored) : null
    if (!u?.id) return
    setPwSave('saving')
    try {
      // PATCH /api/users/{id}/password  body: ChangePasswordRequestDTO { password }
      await api.patch(`/users/${u.id}/password`, { password: pwForm.password })
      setPwForm({ password: '', confirm: '' })
      setPwSave('saved')
      setTimeout(() => setPwSave('idle'), 2500)
    } catch (e: any) {
      setPwError(e?.response?.data?.message ?? 'Erro ao alterar senha')
      setPwSave('error')
      setTimeout(() => setPwSave('idle'), 2500)
    }
  }

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Perfil */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Meu perfil</h2>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Nome e e-mail da sua conta.</p>
            </div>
            <button onClick={saveProfile} style={{
              padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff',
              background: nameSave === 'saved' ? '#10b981' : nameSave === 'error' ? '#ef4444' : '#111827',
            }}>
              {nameSave === 'saving' ? 'Salvando...' : nameSave === 'saved' ? '✓ Salvo' : nameSave === 'error' ? 'Erro' : 'Salvar'}
            </button>
          </div>
          <Field label="Nome">
            <input value={nameForm.name} onChange={e => setNameForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome" style={inputStyle} />
          </Field>
          <Field label="Novo e-mail" hint="Opcional: deixe em branco para não alterar">
            <input type="email" value={nameForm.email} onChange={e => setNameForm(f => ({ ...f, email: e.target.value }))} placeholder="novo@email.com" style={inputStyle} />
          </Field>
        </div>

        {/* Senha */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Alterar senha</h2>
              <p style={{ fontSize: 13, color: '#6b7280' }}>Mínimo 6 caracteres.</p>
            </div>
            <button onClick={changePassword} style={{
              padding: '8px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff',
              background: pwSave === 'saved' ? '#10b981' : pwSave === 'error' ? '#ef4444' : '#111827',
            }}>
              {pwSave === 'saving' ? 'Salvando...' : pwSave === 'saved' ? '✓ Alterada' : pwSave === 'error' ? 'Erro' : 'Alterar'}
            </button>
          </div>
          {pwError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{pwError}</div>
          )}
          <Field label="Nova senha">
            <input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" style={inputStyle} />
          </Field>
          <Field label="Confirmar senha">
            <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="••••••••" style={inputStyle} />
          </Field>
        </div>
      </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('Escola')
  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', document: '' })
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const [abacateConnected, setAbacateConnected] = useState(() => localStorage.getItem('abacate_configured') === '1')
  const [showAbacateModal, setShowAbacateModal] = useState(false)
  const [showAbacateConfirm, setShowAbacateConfirm] = useState(false)

  const [waConnected, setWaConnected] = useState(false)
  const [showWaModal, setShowWaModal] = useState(false)

  useEffect(() => {
    if (!user?.tenantId) return
    api.get<TenantData>(`/tenants/${user.tenantId}`)
        .then((r) => {
          setTenant(r.data)
          setForm({
            name: r.data.name ?? '',
            email: r.data.email ?? '',
            phone: r.data.phone ?? '',
            document: r.data.document ?? '',
          })
          localStorage.setItem('tenantName', r.data.name ?? '')
          // sync abacate status from API if the field is present
          if (r.data.hasAbacatePayKey !== undefined) {
            const configured = r.data.hasAbacatePayKey
            setAbacateConnected(configured)
            localStorage.setItem('abacate_configured', configured ? '1' : '0')
          }
        })
        .catch(console.error)
  }, [user?.tenantId])

  useEffect(() => {
    if (!user?.tenantId) return
    api.get<{ connected: boolean; instanceName: string | null; qrCodeBase64: string | null }>('/tenants/me/whatsapp')
        .then((r) => setWaConnected(r.data.connected))
        .catch(() => setWaConnected(false))
  }, [showWaModal, user?.tenantId])

  async function saveSchool() {
    if (!user?.tenantId) return
    if (!form.name.trim()) return
    setSaveState('saving')
    try {
      // PATCH /api/tenants/{id}  body: TenantRequestDTO { name, email, phone, document }
      await api.patch(`/tenants/${user.tenantId}`, form)
      localStorage.setItem('tenantName', form.name)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setSaveState('error')
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const isOwner = user?.role === 'OWNER'
  const tabs: Tab[] = isOwner
      ? ['Escola', 'Conta', 'Cobrança', 'Integrações', 'Convites', 'Plano']
      : ['Escola', 'Conta']

  return (
      <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {showAbacateConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Trocar chave do AbacatePay?</h2>
                <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                  Você já possui uma chave configurada. Ao substituir, a chave anterior será permanentemente removida.
                </p>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 28 }}>
                  Cobranças em andamento podem ser afetadas caso a nova chave seja de uma conta diferente.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {/* Cancelar em destaque (escuro) para ser o botão "natural" de clicar */}
                  <button
                    onClick={() => setShowAbacateConfirm(false)}
                    style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff' }}
                  >
                    Cancelar
                  </button>
                  {/* Trocar em cor fraca para desincentivar o clique impulsivo */}
                  <button
                    onClick={() => { setShowAbacateConfirm(false); setShowAbacateModal(true) }}
                    style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#6b7280' }}
                  >
                    Sim, trocar
                  </button>
                </div>
              </div>
            </div>
        )}
        {showAbacateModal && (
            <AbacatePayModal onClose={() => setShowAbacateModal(false)} onSaved={() => {
              localStorage.setItem('abacate_configured', '1')
              setAbacateConnected(true)
            }} />
        )}
        {showWaModal && <WhatsAppModal onClose={() => setShowWaModal(false)} onConnected={() => setWaConnected(true)} />}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', marginBottom: 4 }}>CONTA</p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Configurações</h1>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Dados da escola, integrações de pagamento e preferências de cobrança.</p>
          </div>
          {activeTab === 'Escola' && (
              <button onClick={saveSchool} style={{
                padding: '10px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#fff',
                background: saveState === 'saved' ? '#10b981' : saveState === 'error' ? '#ef4444' : '#111827',
              }}>
                {saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? '✓ Salvo' : saveState === 'error' ? 'Erro' : 'Salvar alterações'}
              </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 32 }}>
          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tabs.map((t) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 14, fontWeight: activeTab === t ? 600 : 400,
                  color: activeTab === t ? '#111827' : '#6b7280',
                  background: activeTab === t ? '#f3f4f6' : 'transparent',
                }}>{t}</button>
            ))}
          </div>

          {/* Conteúdo */}
          <div>
            {activeTab === 'Escola' && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Dados da escola</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Informações que aparecem nos boletos e mensagens enviadas.</p>
                  {tenant === null ? (
                      <p style={{ color: '#9ca3af', fontSize: 14 }}>Carregando...</p>
                  ) : (
                      <>
                        <Field label="Nome da escola">
                          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Academia Gracie" style={inputStyle} />
                        </Field>
                        <Field label="CNPJ / CPF">
                          <input value={form.document ?? ''} onChange={(e) => setForm((f) => ({ ...f, document: maskDocument(e.target.value) }))} placeholder="000.000.000-00 ou 00.000.000/0000-00" maxLength={18} style={inputStyle} />
                        </Field>
                        <Field label="E-mail de contato">
                          <input type="email" value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="contato@escola.com.br" style={inputStyle} />
                        </Field>
                        <Field label="Telefone">
                          <input value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))} placeholder="(21) 99888-1010" maxLength={15} style={inputStyle} />
                        </Field>
                      </>
                  )}
                </div>
            )}

            {activeTab === 'Conta' && <AccountTab />}

            {activeTab === 'Cobrança' && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Cobrança</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Padrões aplicados às mensalidades.</p>
                  <Field label="Multa por atraso">
                    <input defaultValue="2%" style={{ ...inputStyle, width: 100 }} />
                  </Field>
                  <Field label="Juros ao mês">
                    <input defaultValue="1%" style={{ ...inputStyle, width: 100 }} />
                  </Field>
                  <Field label="Tolerância antes de marcar como atrasado">
                    <input defaultValue="3 dias" style={{ ...inputStyle, width: 130 }} />
                  </Field>
                </div>
            )}

            {activeTab === 'Integrações' && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Integrações</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Conexões com serviços externos.</p>
                  <IntegrationCard
                      acronym="AS" name="AbacatePay" description="Boletos e PIX automáticos"
                      connected={abacateConnected}
                      connectedLabel={abacateConnected ? 'Configurado' : undefined}
                      onManage={() => abacateConnected ? setShowAbacateConfirm(true) : setShowAbacateModal(true)}
                  />
                  <IntegrationCard
                      acronym="EV" name="Evolution API" description="Disparo de mensagens via WhatsApp"
                      connected={waConnected}
                      connectedLabel={waConnected ? 'Conectado' : undefined}
                      onManage={() => setShowWaModal(true)}
                  />
                </div>
            )}

            {activeTab === 'Convites' && <InvitesTab />}

            {activeTab === 'Plano' && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Plano atual</h2>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Gerencie sua assinatura do Mensalito.</p>
                  <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px' }}>
                    <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 8 }}>PLANO PADRÃO</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>
                      R$ 229<span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280' }}>/mês</span>
                    </p>
                    <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Até 150 alunos · Cobranças automáticas · WhatsApp · Dashboard</p>
                  </div>
                </div>
            )}
          </div>
        </div>
      </div>
  )
}