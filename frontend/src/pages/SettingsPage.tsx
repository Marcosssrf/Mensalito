import {useEffect, useRef, useState} from 'react'
import {useAuth} from '@/contexts/AuthContext'
import api from '@/services/api'

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
function WhatsAppModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [url, setUrl] = useState(() => localStorage.getItem('evo_url') ?? '')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('evo_key') ?? '')
  const [instance, setInstance] = useState(() => localStorage.getItem('evo_instance') ?? '')
  const [status, setStatus] = useState<'idle' | 'loading' | 'qr' | 'connected' | 'error'>('idle')
  const [qr, setQr] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const headers = { 'Content-Type': 'application/json', apikey: apiKey }

  async function isConnected() {
    try {
      const r = await fetch(`${url}/instance/connectionState/${instance}`, { headers })
      const d = await r.json()
      return d?.instance?.state === 'open' || d?.state === 'open'
    } catch { return false }
  }

  function saveToStorage() {
    localStorage.setItem('evo_url', url)
    localStorage.setItem('evo_key', apiKey)
    localStorage.setItem('evo_instance', instance)
  }

  async function connect() {
    if (!url || !apiKey || !instance) { setErrorMsg('Preencha URL, chave e instância.'); setStatus('error'); return }
    saveToStorage()
    setStatus('loading'); setErrorMsg('')
    if (await isConnected()) { setStatus('connected'); onConnected(); return }
    try {
      await fetch(`${url}/instance/create`, { method: 'POST', headers, body: JSON.stringify({ instanceName: instance, qrcode: true }) }).catch(() => {})
      const r = await fetch(`${url}/instance/connect/${instance}`, { headers })
      const d = await r.json()
      const qrCode = d?.base64 || d?.qrcode?.base64 || d?.code
      if (qrCode) {
        setQr(qrCode); setStatus('qr')
        pollRef.current = setInterval(async () => {
          if (await isConnected()) { clearInterval(pollRef.current!); setStatus('connected'); onConnected() }
        }, 3000)
      } else { setErrorMsg('Não foi possível gerar o QR Code.'); setStatus('error') }
    } catch { setErrorMsg('Erro de conexão com a Evolution API.'); setStatus('error') }
  }

  return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 32, width: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>WhatsApp · Evolution API</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Configure sua instância para envio de mensagens automáticas.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'URL da Evolution API', value: url, setter: setUrl, placeholder: 'https://evo.suaempresa.com', type: 'text' },
              { label: 'API Key', value: apiKey, setter: setApiKey, placeholder: '••••••••', type: 'password' },
              { label: 'Nome da instância', value: instance, setter: setInstance, placeholder: 'mensalito', type: 'text' },
            ].map(({ label, value, setter, placeholder, type }) => (
                <div key={label}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>{label}</label>
                  <input type={type} value={value} onChange={(e) => setter(e.target.value)} placeholder={placeholder} autoComplete="off" style={inputStyle} />
                </div>
            ))}
          </div>
          {status === 'error' && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>{errorMsg}</div>}
          {status === 'connected' && (
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#065f46' }}>WhatsApp conectado!</span>
              </div>
          )}
          {status === 'qr' && qr && (
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`} alt="QR Code"
                     style={{ width: 200, height: 200, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }}>Escaneie com o WhatsApp → Dispositivos conectados</p>
              </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#374151' }}>Fechar</button>
            {status !== 'connected' && (
                <button onClick={connect} disabled={status === 'loading'}
                        style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#111827', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600 }}>
                  {status === 'loading' ? 'Conectando...' : status === 'qr' ? 'Gerar novo QR' : 'Conectar'}
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
        })
        .catch(console.error)
  }, [user?.tenantId])

  useEffect(() => {
    const url = localStorage.getItem('evo_url')
    const key = localStorage.getItem('evo_key')
    const inst = localStorage.getItem('evo_instance')
    if (!url || !key || !inst) { setWaConnected(false); return }
    fetch(`${url}/instance/connectionState/${inst}`, { headers: { apikey: key } })
        .then((r) => r.json())
        .then((d) => setWaConnected(d?.instance?.state === 'open' || d?.state === 'open'))
        .catch(() => setWaConnected(false))
  }, [showWaModal])

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

  const waInstance = localStorage.getItem('evo_instance') ?? undefined
  const isOwner = user?.role === 'OWNER'
  const tabs: Tab[] = isOwner
      ? ['Escola', 'Conta', 'Cobrança', 'Integrações', 'Convites', 'Plano']
      : ['Escola', 'Conta']

  return (
      <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
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
                          <input value={form.document ?? ''} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} placeholder="00.000.000/0000-00" style={inputStyle} />
                        </Field>
                        <Field label="E-mail de contato">
                          <input type="email" value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="contato@escola.com.br" style={inputStyle} />
                        </Field>
                        <Field label="Telefone">
                          <input value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(21) 99888-1010" style={inputStyle} />
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
                      onManage={() => setShowAbacateModal(true)}
                  />
                  <IntegrationCard
                      acronym="EV" name="Evolution API" description="Disparo de mensagens via WhatsApp"
                      connected={waConnected}
                      connectedLabel={waConnected && waInstance ? waInstance : undefined}
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